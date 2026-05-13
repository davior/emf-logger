from celery import Celery
from config import settings

app = Celery(
    "emf_logger",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["tasks.scan_tasks"],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-scheduled-jobs": {
            "task": "tasks.scan_tasks.check_scheduled_jobs",
            "schedule": 60.0,  # every 60 seconds
        }
    },
)
