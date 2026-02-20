"""Health check endpoints"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.config import get_settings

router = APIRouter(prefix="/health", tags=["health"])
settings = get_settings()


@router.get("")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """Readiness check - verifies database and redis connections"""
    checks = {
        "database": False,
        "redis": False,
    }
    
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception as e:
        checks["database_error"] = str(e)
    
    try:
        redis = await get_redis()
        await redis.ping()
        checks["redis"] = True
    except Exception as e:
        checks["redis_error"] = str(e)
    
    all_healthy = all(v for k, v in checks.items() if not k.endswith("_error"))
    
    return {
        "status": "ready" if all_healthy else "not_ready",
        "checks": checks,
    }


@router.get("/live")
async def liveness_check():
    """Liveness check - basic application health"""
    return {"status": "alive"}
