"""Progress tracking endpoints"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import require_user
from app.models.user import User
from app.models.game import Game, Level
from app.models.progress import Progress, GameSession

router = APIRouter(prefix="/progress", tags=["progress"])


class ProgressResponse(BaseModel):
    id: UUID
    level_id: UUID
    score: int
    max_score: Optional[int]
    stars: int
    attempts: int
    best_time_seconds: Optional[int]
    completed: bool
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ProgressUpdate(BaseModel):
    score: int
    time_seconds: Optional[int] = None
    solution: Optional[dict] = None


class GameSessionCreate(BaseModel):
    game_slug: str
    mode: str = "single_player"


class GameSessionResponse(BaseModel):
    id: UUID
    game_id: UUID
    mode: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    
    class Config:
        from_attributes = True


@router.get("/game/{game_slug}", response_model=List[ProgressResponse])
async def get_game_progress(
    game_slug: str,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's progress for all levels in a game"""
    keycloak_id = token_user.get("sub")
    
    user_result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        return []
    
    game_result = await db.execute(
        select(Game).where(Game.slug == game_slug)
    )
    game = game_result.scalar_one_or_none()
    
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game '{game_slug}' not found"
        )
    
    result = await db.execute(
        select(Progress)
        .join(Level)
        .where(Progress.user_id == user.id)
        .where(Level.game_id == game.id)
        .order_by(Level.sequence)
    )
    progress_list = result.scalars().all()
    
    return progress_list


@router.get("/level/{level_id}", response_model=Optional[ProgressResponse])
async def get_level_progress(
    level_id: UUID,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user's progress for a specific level"""
    keycloak_id = token_user.get("sub")
    
    user_result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        return None
    
    result = await db.execute(
        select(Progress)
        .where(Progress.user_id == user.id)
        .where(Progress.level_id == level_id)
    )
    progress = result.scalar_one_or_none()
    
    return progress


@router.post("/level/{level_id}/complete", response_model=ProgressResponse)
async def complete_level(
    level_id: UUID,
    update_data: ProgressUpdate,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit level completion"""
    keycloak_id = token_user.get("sub")
    
    user_result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        user = User(
            keycloak_id=keycloak_id,
            username=token_user.get("preferred_username", "user"),
            email=token_user.get("email", ""),
        )
        db.add(user)
        await db.flush()
    
    level_result = await db.execute(
        select(Level).where(Level.id == level_id)
    )
    level = level_result.scalar_one_or_none()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Level not found"
        )
    
    progress_result = await db.execute(
        select(Progress)
        .where(Progress.user_id == user.id)
        .where(Progress.level_id == level_id)
    )
    progress = progress_result.scalar_one_or_none()
    
    if not progress:
        progress = Progress(
            user_id=user.id,
            level_id=level_id,
            max_score=level.config.get("max_score", 100),
        )
        db.add(progress)
    
    progress.attempts += 1
    
    if update_data.score > progress.score:
        progress.score = update_data.score
        if update_data.solution:
            progress.best_solution = update_data.solution
    
    if update_data.time_seconds:
        if not progress.best_time_seconds or update_data.time_seconds < progress.best_time_seconds:
            progress.best_time_seconds = update_data.time_seconds
    
    max_score = progress.max_score or 100
    score_ratio = progress.score / max_score
    if score_ratio >= 0.9:
        progress.stars = 3
    elif score_ratio >= 0.7:
        progress.stars = 2
    elif score_ratio >= 0.5:
        progress.stars = 1
    
    if not progress.completed and progress.stars >= 1:
        progress.completed = True
        progress.completed_at = datetime.utcnow()
        user.total_xp += level.xp_reward
    
    await db.commit()
    await db.refresh(progress)
    
    return progress


@router.post("/sessions", response_model=GameSessionResponse)
async def start_game_session(
    session_data: GameSessionCreate,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a new game session"""
    keycloak_id = token_user.get("sub")
    
    user_result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = user_result.scalar_one_or_none()
    
    game_result = await db.execute(
        select(Game).where(Game.slug == session_data.game_slug)
    )
    game = game_result.scalar_one_or_none()
    
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game '{session_data.game_slug}' not found"
        )
    
    from app.models.game import GameMode
    try:
        mode = GameMode(session_data.mode)
    except ValueError:
        mode = GameMode.SINGLE_PLAYER
    
    session = GameSession(
        game_id=game.id,
        user_id=user.id if user else None,
        mode=mode,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return session


@router.put("/sessions/{session_id}/end", response_model=GameSessionResponse)
async def end_game_session(
    session_id: UUID,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """End a game session"""
    result = await db.execute(
        select(GameSession).where(GameSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session.ended_at = datetime.utcnow()
    session.duration_seconds = int(
        (session.ended_at - session.started_at).total_seconds()
    )
    
    await db.commit()
    await db.refresh(session)
    
    return session
