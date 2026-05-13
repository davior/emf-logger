from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone
import uuid

from database import get_db
from models import ScanJob
from schemas import ScanJobCreate, ScanJobResponse

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("", response_model=List[ScanJobResponse])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).order_by(ScanJob.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=ScanJobResponse)
async def create_job(job: ScanJobCreate, db: AsyncSession = Depends(get_db)):
    db_job = ScanJob(**job.model_dump())
    db.add(db_job)
    await db.commit()
    await db.refresh(db_job)
    return db_job


@router.get("/{job_id}", response_model=ScanJobResponse)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).where(ScanJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.put("/{job_id}", response_model=ScanJobResponse)
async def update_job(
    job_id: uuid.UUID, job: ScanJobCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ScanJob).where(ScanJob.id == job_id))
    db_job = result.scalar_one_or_none()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if db_job.status == "running":
        raise HTTPException(status_code=400, detail="Cannot update a running job")
    for k, v in job.model_dump().items():
        setattr(db_job, k, v)
    await db.commit()
    await db.refresh(db_job)
    return db_job


@router.delete("/{job_id}")
async def delete_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ScanJob).where(ScanJob.id == job_id))
    db_job = result.scalar_one_or_none()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if db_job.status == "running":
        raise HTTPException(status_code=400, detail="Stop the job before deleting")
    await db.delete(db_job)
    await db.commit()
    return {"ok": True}


@router.post("/{job_id}/start", response_model=ScanJobResponse)
async def start_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from tasks.scan_tasks import run_scan_job

    result = await db.execute(select(ScanJob).where(ScanJob.id == job_id))
    db_job = result.scalar_one_or_none()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if db_job.status == "running":
        raise HTTPException(status_code=400, detail="Job already running")

    task = run_scan_job.delay(str(job_id))
    db_job.celery_task_id = task.id
    db_job.status = "running"
    db_job.actual_start = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(db_job)
    return db_job


@router.post("/{job_id}/stop", response_model=ScanJobResponse)
async def stop_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    import redis.asyncio as aioredis
    from config import settings

    result = await db.execute(select(ScanJob).where(ScanJob.id == job_id))
    db_job = result.scalar_one_or_none()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    if db_job.status != "running":
        raise HTTPException(status_code=400, detail="Job is not running")

    r = aioredis.from_url(settings.redis_url)
    await r.set(f"stop_job:{job_id}", "1", ex=120)
    await r.aclose()

    db_job.status = "cancelled"
    db_job.actual_end = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(db_job)
    return db_job
