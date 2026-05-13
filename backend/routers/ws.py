from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from config import settings

router = APIRouter()


@router.websocket("/ws/jobs/{job_id}")
async def job_websocket(websocket: WebSocket, job_id: str):
    await websocket.accept()
    r = aioredis.from_url(settings.redis_url)
    pubsub = r.pubsub()
    await pubsub.subscribe(f"spectrum:{job_id}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"]
                text = data.decode() if isinstance(data, bytes) else data
                await websocket.send_text(text)
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"spectrum:{job_id}")
        await pubsub.aclose()
        await r.aclose()
