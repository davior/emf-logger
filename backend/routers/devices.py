from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
import uuid

from database import get_db
from models import DeviceProfile
from schemas import DeviceProfileCreate, DeviceProfileResponse, RTLDeviceInfo
from services.rtlsdr import detect_devices

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.get("/scan", response_model=List[RTLDeviceInfo])
async def scan_devices():
    return await detect_devices()


@router.get("/profiles", response_model=List[DeviceProfileResponse])
async def list_profiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DeviceProfile).order_by(DeviceProfile.created_at.desc())
    )
    return result.scalars().all()


@router.post("/profiles", response_model=DeviceProfileResponse)
async def create_profile(
    profile: DeviceProfileCreate, db: AsyncSession = Depends(get_db)
):
    db_profile = DeviceProfile(**profile.model_dump())
    db.add(db_profile)
    await db.commit()
    await db.refresh(db_profile)
    return db_profile


@router.put("/profiles/{profile_id}", response_model=DeviceProfileResponse)
async def update_profile(
    profile_id: uuid.UUID,
    profile: DeviceProfileCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DeviceProfile).where(DeviceProfile.id == profile_id)
    )
    db_profile = result.scalar_one_or_none()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for k, v in profile.model_dump().items():
        setattr(db_profile, k, v)
    await db.commit()
    await db.refresh(db_profile)
    return db_profile


@router.delete("/profiles/{profile_id}")
async def delete_profile(profile_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(DeviceProfile).where(DeviceProfile.id == profile_id))
    await db.commit()
    return {"ok": True}
