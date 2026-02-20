"""Game and Level endpoints"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_user
from app.models.game import Game, Level
from app.models.user import User, EducationLevel
from app.services.anticheat import AnticheatService
from app.services.challenge_seeds import generate_challenge_params

router = APIRouter(prefix="/games", tags=["games"])


class LevelResponse(BaseModel):
    id: UUID
    sequence: int
    title: str
    description: Optional[str]
    objectives: list
    quantum_concepts: list
    difficulty: int
    estimated_minutes: int
    xp_reward: int
    
    class Config:
        from_attributes = True


class GameResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    description: Optional[str]
    target_level: EducationLevel
    min_age: int
    max_age: Optional[int]
    thumbnail_url: Optional[str]
    quantum_concepts: List[str]
    multiplayer_enabled: bool
    supported_modes: List[str]
    
    class Config:
        from_attributes = True


class GameDetailResponse(GameResponse):
    levels: List[LevelResponse]
    config: dict


@router.get("", response_model=List[GameResponse])
async def list_games(
    db: AsyncSession = Depends(get_db),
    education_level: Optional[EducationLevel] = None,
    multiplayer: Optional[bool] = None,
    concept: Optional[str] = None,
    active_only: bool = True,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
):
    """List all games with optional filters"""
    query = select(Game)
    
    if active_only:
        query = query.where(Game.is_active == True)
    
    if education_level:
        query = query.where(Game.target_level == education_level)
    
    if multiplayer is not None:
        query = query.where(Game.multiplayer_enabled == multiplayer)
    
    if concept:
        query = query.where(Game.quantum_concepts.contains([concept]))
    
    query = query.order_by(Game.target_level, Game.name)
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    games = result.scalars().all()
    
    return games


@router.get("/by-level/{education_level}", response_model=List[GameResponse])
async def get_games_by_level(
    education_level: EducationLevel,
    db: AsyncSession = Depends(get_db),
):
    """Get all games for a specific education level"""
    result = await db.execute(
        select(Game)
        .where(Game.target_level == education_level)
        .where(Game.is_active == True)
        .order_by(Game.name)
    )
    games = result.scalars().all()
    return games


@router.get("/concepts")
async def list_quantum_concepts(
    db: AsyncSession = Depends(get_db),
):
    """List all unique quantum concepts across games"""
    result = await db.execute(select(Game.quantum_concepts).where(Game.is_active == True))
    all_concepts = result.scalars().all()
    
    unique_concepts = set()
    for concepts in all_concepts:
        if concepts:
            unique_concepts.update(concepts)
    
    return sorted(list(unique_concepts))


@router.get("/{game_slug}", response_model=GameDetailResponse)
async def get_game_by_slug(
    game_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get game details by slug"""
    result = await db.execute(
        select(Game)
        .options(selectinload(Game.levels))
        .where(Game.slug == game_slug)
    )
    game = result.scalar_one_or_none()
    
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game '{game_slug}' not found"
        )
    
    return game


@router.get("/{game_slug}/levels", response_model=List[LevelResponse])
async def get_game_levels(
    game_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get all levels for a game"""
    result = await db.execute(
        select(Game).where(Game.slug == game_slug)
    )
    game = result.scalar_one_or_none()
    
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game '{game_slug}' not found"
        )
    
    result = await db.execute(
        select(Level)
        .where(Level.game_id == game.id)
        .where(Level.is_active == True)
        .order_by(Level.sequence)
    )
    levels = result.scalars().all()
    
    return levels


@router.get("/{game_slug}/levels/{level_sequence}", response_model=LevelResponse)
async def get_level_by_sequence(
    game_slug: str,
    level_sequence: int,
    db: AsyncSession = Depends(get_db),
):
    """Get specific level by game slug and sequence number"""
    result = await db.execute(
        select(Game).where(Game.slug == game_slug)
    )
    game = result.scalar_one_or_none()
    
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game '{game_slug}' not found"
        )
    
    result = await db.execute(
        select(Level)
        .where(Level.game_id == game.id)
        .where(Level.sequence == level_sequence)
    )
    level = result.scalar_one_or_none()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Level {level_sequence} not found"
        )
    
    return level


class GameAccessInfo(BaseModel):
    game_slug: str
    is_locked: bool
    lock_reason: Optional[str] = None
    required_tier_mastery: Optional[str] = None


class GamesWithAccessResponse(BaseModel):
    games: List[GameResponse]
    access_info: List[GameAccessInfo]


@router.get("/with-access", response_model=GamesWithAccessResponse)
async def list_games_with_access(
    db: AsyncSession = Depends(get_db),
    current_user: Optional[dict] = Depends(get_current_user),
    education_level: Optional[EducationLevel] = None,
    active_only: bool = True,
):
    """List games with access/locked status for current user"""
    query = select(Game)
    
    if active_only:
        query = query.where(Game.is_active == True)
    
    if education_level:
        query = query.where(Game.target_level == education_level)
    
    query = query.order_by(Game.target_level, Game.name)
    
    result = await db.execute(query)
    games = result.scalars().all()
    
    access_info = []
    
    # Check user authentication and get access info
    user = None
    if current_user:
        keycloak_id = current_user.get("sub")
        user_result = await db.execute(
            select(User).where(User.keycloak_id == keycloak_id)
        )
        user = user_result.scalar_one_or_none()
    
    anticheat = AnticheatService(db)
    
    for game in games:
        if not user:
            # Unauthenticated users: only basic_school is unlocked
            is_locked = game.target_level != EducationLevel.BASIC_SCHOOL
            lock_reason = "Sign in to access" if is_locked else None
        else:
            # Check tier mastery
            tier_ok, tier_error, _ = await anticheat.check_education_tier_mastery(
                user=user,
                target_level=game.target_level,
            )
            is_locked = not tier_ok
            lock_reason = tier_error
        
        access_info.append(GameAccessInfo(
            game_slug=game.slug,
            is_locked=is_locked,
            lock_reason=lock_reason,
            required_tier_mastery=game.target_level.value if is_locked else None,
        ))
    
    return GamesWithAccessResponse(
        games=games,
        access_info=access_info,
    )


class SeededLevelConfig(BaseModel):
    level_id: UUID
    seed: int
    config: dict
    seed_rotation: str
    generated_at: datetime


@router.get("/{game_slug}/levels/{level_sequence}/seeded", response_model=SeededLevelConfig)
async def get_seeded_level_config(
    game_slug: str,
    level_sequence: int,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
    seed_rotation: str = "daily",
):
    """
    Get level configuration with user-specific seeded parameters.
    
    This provides unique challenge parameters per student to prevent answer sharing.
    Seed rotation options:
    - "daily": New parameters each day (default)
    - "weekly": New parameters each week
    - "attempt": New parameters each attempt
    - "static": Same parameters always (for practice modes)
    """
    keycloak_id = token_user.get("sub")
    
    # Get user
    user_result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Get game
    game_result = await db.execute(
        select(Game).where(Game.slug == game_slug)
    )
    game = game_result.scalar_one_or_none()
    
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game '{game_slug}' not found"
        )
    
    # Get level
    level_result = await db.execute(
        select(Level)
        .where(Level.game_id == game.id)
        .where(Level.sequence == level_sequence)
    )
    level = level_result.scalar_one_or_none()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Level {level_sequence} not found"
        )
    
    # Generate seeded config
    seeded_config = generate_challenge_params(
        user_id=user.id,
        level_id=level.id,
        level_config=level.config or {},
        seed_rotation=seed_rotation,
    )
    
    return SeededLevelConfig(
        level_id=level.id,
        seed=seeded_config.get("seed", 0),
        config=seeded_config,
        seed_rotation=seed_rotation,
        generated_at=datetime.utcnow(),
    )
