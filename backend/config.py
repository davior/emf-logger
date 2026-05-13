from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://emf:emfpass@db:5432/emfdb"
    sync_database_url: str = "postgresql://emf:emfpass@db:5432/emfdb"
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/1"
    captures_dir: str = "/app/captures"
    openai_api_key: str = ""
    ai_endpoint: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-4o"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
