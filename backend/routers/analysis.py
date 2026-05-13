import uuid
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db, AsyncSessionLocal
from models import AIAnalysis, ScanJob, SpectrumReading
from schemas import AIAnalysisCreate, AIAnalysisResponse

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

PROMPT_TEMPLATES = {
    "anomaly_detection": (
        "Analyze this RF spectrum data and identify any anomalies or unusual signal "
        "patterns. Focus on unexpected power levels, unusual frequency activity, or "
        "patterns that deviate from typical background noise."
    ),
    "signal_identification": (
        "Examine this RF spectrum data and identify any recognizable signal types. "
        "Look for common radio services, modulation patterns, or known frequency "
        "allocations."
    ),
    "band_activity_summary": (
        "Provide a comprehensive summary of the RF activity across all frequency bands "
        "in this spectrum data. Describe relative power levels, active vs quiet bands, "
        "and any notable signal characteristics."
    ),
}


@router.get("/templates")
async def get_templates():
    return list(PROMPT_TEMPLATES.keys())


@router.post("", response_model=AIAnalysisResponse)
async def submit_analysis(
    request: AIAnalysisCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ScanJob).where(ScanJob.id == request.job_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Job not found")

    analysis = AIAnalysis(
        job_id=request.job_id,
        prompt_template=request.prompt_template,
        custom_prompt=request.custom_prompt,
        status="pending",
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)

    background_tasks.add_task(_run_analysis, str(analysis.id), request)
    return analysis


@router.get("/job/{job_id}", response_model=List[AIAnalysisResponse])
async def list_job_analyses(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AIAnalysis)
        .where(AIAnalysis.job_id == job_id)
        .order_by(AIAnalysis.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{analysis_id}", response_model=AIAnalysisResponse)
async def get_analysis(analysis_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AIAnalysis).where(AIAnalysis.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


async def _run_analysis(analysis_id: str, request: AIAnalysisCreate):
    from services.ai import analyze_spectrum

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AIAnalysis).where(AIAnalysis.id == uuid.UUID(analysis_id))
        )
        analysis = result.scalar_one_or_none()
        if not analysis:
            return

        analysis.status = "running"
        await db.commit()

        readings_query = select(SpectrumReading).where(
            SpectrumReading.job_id == request.job_id
        )
        if request.time_start:
            readings_query = readings_query.where(
                SpectrumReading.time >= request.time_start
            )
        if request.time_end:
            readings_query = readings_query.where(
                SpectrumReading.time <= request.time_end
            )
        readings_query = readings_query.order_by(SpectrumReading.time.asc()).limit(100)
        readings_result = await db.execute(readings_query)
        readings = readings_result.scalars().all()

        base_prompt = PROMPT_TEMPLATES.get(
            request.prompt_template, request.prompt_template
        )
        if request.custom_prompt:
            base_prompt = request.custom_prompt

        try:
            response = await analyze_spectrum(base_prompt, readings)
            analysis.response = response
            analysis.status = "completed"
        except Exception as exc:
            analysis.response = f"Analysis failed: {exc}"
            analysis.status = "failed"

        await db.commit()
