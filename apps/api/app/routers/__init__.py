"""API Routers"""
from app.routers.health import router as health_router
from app.routers.users import router as users_router
from app.routers.games import router as games_router
from app.routers.progress import router as progress_router
from app.routers.achievements import router as achievements_router
from app.routers.quantum import router as quantum_router
from app.routers.hardware import router as hardware_router

__all__ = [
    "health_router",
    "users_router",
    "games_router",
    "progress_router",
    "achievements_router",
    "quantum_router",
    "hardware_router",
]
