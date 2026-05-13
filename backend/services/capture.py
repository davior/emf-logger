import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

import redis.asyncio as aioredis

from config import settings
from services.rtlsdr import build_rtl_power_command, parse_rtl_power_line


async def run_capture(job) -> str:
    """Run rtl_power, stream lines to DB + file + Redis pub/sub."""
    job_id = str(job.id)
    captures_dir = Path(settings.captures_dir) / job_id
    captures_dir.mkdir(parents=True, exist_ok=True)

    meta = {
        "job_id": job_id,
        "name": job.name,
        "start_freq": job.start_freq,
        "end_freq": job.end_freq,
        "bin_size": job.bin_size,
        "interval": job.interval,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    (captures_dir / "metadata.json").write_text(json.dumps(meta, indent=2))

    raw_csv_path = captures_dir / "raw.csv"
    cmd = build_rtl_power_command(job)
    stop_key = f"stop_job:{job_id}"

    r = aioredis.from_url(settings.redis_url)
    try:
        with open(raw_csv_path, "w") as csv_file:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            try:
                while True:
                    if await r.exists(stop_key):
                        break

                    # Check if the scheduled end time has passed
                    if job.scheduled_end:
                        if datetime.now(timezone.utc) >= job.scheduled_end.replace(
                            tzinfo=timezone.utc
                        ):
                            break

                    try:
                        raw = await asyncio.wait_for(
                            proc.stdout.readline(), timeout=30.0
                        )
                    except asyncio.TimeoutError:
                        continue

                    if not raw:
                        break

                    line = raw.decode().strip()
                    if not line:
                        continue

                    csv_file.write(line + "\n")
                    csv_file.flush()

                    record = parse_rtl_power_line(line)
                    if record:
                        await _write_to_db(record, job_id)
                        await _publish(record, job_id, r)
            finally:
                proc.terminate()
                try:
                    await asyncio.wait_for(proc.wait(), timeout=5.0)
                except asyncio.TimeoutError:
                    proc.kill()
    finally:
        await r.aclose()

    return str(raw_csv_path)


async def _write_to_db(record: dict, job_id: str):
    import uuid
    from database import AsyncSessionLocal
    from models import SpectrumReading

    async with AsyncSessionLocal() as db:
        reading = SpectrumReading(
            time=record["time"],
            job_id=uuid.UUID(job_id),
            hz_low=record["hz_low"],
            hz_high=record["hz_high"],
            hz_step=record["hz_step"],
            db_values=record["db_values"],
        )
        db.add(reading)
        await db.commit()


async def _publish(record: dict, job_id: str, r: aioredis.Redis):
    payload = json.dumps(
        {
            "time": record["time"].isoformat(),
            "hz_low": record["hz_low"],
            "hz_high": record["hz_high"],
            "hz_step": record["hz_step"],
            "db_values": record["db_values"],
        }
    )
    await r.publish(f"spectrum:{job_id}", payload)
