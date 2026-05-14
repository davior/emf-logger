from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from config import settings


class Base(DeclarativeBase):
    pass


# NullPool is required for Celery workers: each asyncio.run() call creates a
# fresh event loop, and pooled asyncpg connections are bound to the loop that
# created them.  NullPool ensures every session gets a brand-new connection
# within the current loop, avoiding "Future attached to a different loop".
async_engine = create_async_engine(
    settings.database_url, echo=False, poolclass=NullPool
)
AsyncSessionLocal = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
