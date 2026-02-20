"""Application configuration using Pydantic Settings"""
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Application
    app_name: str = "Quantum Games API"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "INFO"
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_secret_key: str = "change-me-in-production"
    api_cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Database
    database_url: str = "postgresql+asyncpg://quantum:quantum_dev@localhost:5432/quantum_games"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # Keycloak
    keycloak_url: str = "http://localhost:8080"
    keycloak_realm: str = "quantum-games"
    keycloak_client_id: str = "quantum-games-api"
    keycloak_client_secret: str = ""
    
    # MinIO/S3
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minio"
    minio_secret_key: str = "minio123"
    minio_bucket: str = "quantum-games-assets"
    minio_secure: bool = False
    
    # IBM Quantum (optional)
    ibm_quantum_token: str = ""
    ibm_quantum_channel: str = "ibm_quantum"
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.api_cors_origins.split(",")]
    
    @property
    def async_database_url(self) -> str:
        """Ensure database URL uses asyncpg driver"""
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
