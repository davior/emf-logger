import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, Integer, Float, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from database import Base


class DeviceProfile(Base):
    __tablename__ = "device_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    device_index = Column(Integer, default=0)
    gain = Column(Float, nullable=True)
    sample_rate = Column(Integer, default=2048000)
    ppm_correction = Column(Integer, default=0)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    start_freq = Column(BigInteger, nullable=False)
    end_freq = Column(BigInteger, nullable=False)
    bin_size = Column(Integer, nullable=False)
    interval = Column(Integer, nullable=False)
    gain = Column(Float, nullable=True)
    device_index = Column(Integer, default=0)
    ppm_correction = Column(Integer, default=0)
    scheduled_start = Column(TIMESTAMP(timezone=True), nullable=True)
    scheduled_end = Column(TIMESTAMP(timezone=True), nullable=True)
    actual_start = Column(TIMESTAMP(timezone=True), nullable=True)
    actual_end = Column(TIMESTAMP(timezone=True), nullable=True)
    status = Column(String, default="pending")
    output_file = Column(Text, nullable=True)
    celery_task_id = Column(String, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)


class SpectrumReading(Base):
    __tablename__ = "spectrum_readings"

    time = Column(TIMESTAMP(timezone=True), nullable=False, primary_key=True)
    job_id = Column(UUID(as_uuid=True), nullable=False, primary_key=True)
    hz_low = Column(BigInteger, nullable=False)
    hz_high = Column(BigInteger, nullable=False)
    hz_step = Column(Float, nullable=False)
    db_values = Column(ARRAY(Float), nullable=False)


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), nullable=False)
    prompt_template = Column(String, nullable=False)
    custom_prompt = Column(Text, nullable=True)
    response = Column(Text, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
