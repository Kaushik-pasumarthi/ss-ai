from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://sportshield:password@db:5432/sportshield"
    redis_url: str = "redis://redis:6379/0"
    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    upload_dir: str = "/app/uploads"
    faiss_index_path: str = "/app/faiss_data/index.bin"
    threshold: float = 0.80
    keyframe_interval: int = 5
    clip_model: str = "ViT-B-32"
    webhook_secret: str = "webhook-secret"
    rate_limit_default: int = 100
    rate_limit_upload: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
