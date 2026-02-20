"""Quantum Games API - Main Application"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.redis import close_redis
from app.routers import (
    health_router,
    users_router,
    games_router,
    progress_router,
    achievements_router,
    quantum_router,
    hardware_router,
    proctoring_router,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    yield
    await close_redis()


app = FastAPI(
    title=settings.app_name,
    description="API for the Quantum Educational Games Platform",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(users_router)
app.include_router(games_router)
app.include_router(progress_router)
app.include_router(achievements_router)
app.include_router(quantum_router)
app.include_router(hardware_router)
app.include_router(proctoring_router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
    }
