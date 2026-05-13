import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy.future import select

from tasks.celery_app import app


@app.task(bind=True, name="tasks.scan_tasks.run_scan_job")
def run_scan_job(self, job_id: str):
    asyncio.run(_async_run_scan(job_id))


@app.task(name="tasks.scan_tasks.check_scheduled_jobs")
def check_scheduled_jobs():
    asyncio.run(_async_check_scheduled())


async def _async_run_scan(job_id: str):
    from database import AsyncSessionLocal
    from models import ScanJob
    from services.capture import run_capture

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ScanJob).where(ScanJob.id == uuid.UUID(job_id)))
        job = result.scalar_one_or_none()
        if not job:
            return

        job.status = "running"
        job.actual_start = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(job)

        try:
            output_path = await run_capture(job)
            job.status = "completed"
            job.output_file = output_path
        except Exception:
            job.status = "failed"
            raise
        finally:
            job.actual_end = datetime.now(timezone.utc)
            await db.commit()


async def _async_check_scheduled():
    from database import AsyncSessionLocal
    from models import ScanJob

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ScanJob).where(
                ScanJob.status == "pending",
                ScanJob.scheduled_start <= now,
            )
        )
        jobs = result.scalars().all()

        for job in jobs:
            task = run_scan_job.delay(str(job.id))
            job.celery_task_id = task.id
            job.status = "running"
            job.actual_start = now

        if jobs:
            await db.commit()
