from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid


class DeviceProfileBase(BaseModel):
    name: str
    device_index: int = 0
    gain: Optional[float] = None
    sample_rate: int = 2048000
    ppm_correction: int = 0


class DeviceProfileCreate(DeviceProfileBase):
    pass


class DeviceProfileResponse(DeviceProfileBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ScanJobBase(BaseModel):
    name: str
    start_freq: int
    end_freq: int
    bin_size: int
    interval: int
    gain: Optional[float] = None
    device_index: int = 0
    ppm_correction: int = 0
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


class ScanJobCreate(ScanJobBase):
    pass


class ScanJobResponse(ScanJobBase):
    id: uuid.UUID
    status: str
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    output_file: Optional[str] = None
    celery_task_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SpectrumReadingResponse(BaseModel):
    time: datetime
    job_id: uuid.UUID
    hz_low: int
    hz_high: int
    hz_step: float
    db_values: List[float]

    model_config = {"from_attributes": True}


class AIAnalysisCreate(BaseModel):
    job_id: uuid.UUID
    prompt_template: str
    custom_prompt: Optional[str] = None
    time_start: Optional[datetime] = None
    time_end: Optional[datetime] = None


class AIAnalysisResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    prompt_template: str
    custom_prompt: Optional[str] = None
    response: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RTLDeviceInfo(BaseModel):
    index: int
    name: str
    serial: str
    available: bool
