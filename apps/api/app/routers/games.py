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
from app.core.security import get_current_user
from app.models.game import Game, Level
from app.models.user import EducationLevel

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
