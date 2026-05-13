import csv
import io
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from database import get_db
from models import ScanJob, SpectrumReading
from schemas import SpectrumReadingResponse

router = APIRouter(prefix="/api/data", tags=["data"])


@router.get("/jobs/{job_id}/readings", response_model=List[SpectrumReadingResponse])
async def get_readings(
    job_id: uuid.UUID,
    time_start: Optional[datetime] = None,
    time_end: Optional[datetime] = None,
    limit: int = Query(default=200, le=2000),
    db: AsyncSession = Depends(get_db),
):
    query = select(SpectrumReading).where(SpectrumReading.job_id == job_id)
    if time_start:
        query = query.where(SpectrumReading.time >= time_start)
    if time_end:
        query = query.where(SpectrumReading.time <= time_end)
    query = query.order_by(SpectrumReading.time.asc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/jobs/{job_id}/timestamps")
async def get_timestamps(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = text(
        "SELECT DISTINCT time FROM spectrum_readings "
        "WHERE job_id = :jid ORDER BY time ASC"
    )
    result = await db.execute(stmt, {"jid": str(job_id)})
    return [row[0].isoformat() for row in result.fetchall()]


@router.get("/jobs/{job_id}/download")
async def download_data(
    job_id: uuid.UUID,
    format: str = Query(default="csv", pattern="^(csv|json)$"),
    time_start: Optional[datetime] = None,
    time_end: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ScanJob).where(ScanJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    query = select(SpectrumReading).where(SpectrumReading.job_id == job_id)
    if time_start:
        query = query.where(SpectrumReading.time >= time_start)
    if time_end:
        query = query.where(SpectrumReading.time <= time_end)
    query = query.order_by(SpectrumReading.time.asc())
    readings_result = await db.execute(query)
    readings = readings_result.scalars().all()

    if format == "csv":
        def generate_csv():
            buf = io.StringIO()
            writer = csv.writer(buf)
            writer.writerow(["time", "hz_low", "hz_high", "hz_step", "db_values"])
            for r in readings:
                writer.writerow(
                    [
                        r.time.isoformat(),
                        r.hz_low,
                        r.hz_high,
                        r.hz_step,
                        ",".join(map(str, r.db_values)),
                    ]
                )
            yield buf.getvalue()

        return StreamingResponse(
            generate_csv(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="job_{job_id}.csv"'
            },
        )

    def generate_json():
        yield "["
        for i, r in enumerate(readings):
            row = {
                "time": r.time.isoformat(),
                "hz_low": r.hz_low,
                "hz_high": r.hz_high,
                "hz_step": r.hz_step,
                "db_values": r.db_values,
            }
            if i > 0:
                yield ","
            yield json.dumps(row)
        yield "]"

    return StreamingResponse(
        generate_json(),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="job_{job_id}.json"'
        },
    )
