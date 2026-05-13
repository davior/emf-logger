from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401 — ensure models register with Base
from database import async_engine, Base
from routers import devices, jobs, data, analysis, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="EMF Logger API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices.router)
app.include_router(jobs.router)
app.include_router(data.router)
app.include_router(analysis.router)
app.include_router(ws.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
