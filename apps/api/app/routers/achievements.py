"""Achievement endpoints"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import require_user, get_current_user
from app.models.user import User
from app.models.achievement import Achievement, UserAchievement, AchievementType

router = APIRouter(prefix="/achievements", tags=["achievements"])


class AchievementResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    description: Optional[str]
    icon_url: Optional[str]
    achievement_type: AchievementType
    xp_reward: int
    is_hidden: bool
    
    class Config:
        from_attributes = True


class UserAchievementResponse(BaseModel):
    id: UUID
    achievement: AchievementResponse
    earned_at: datetime
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[AchievementResponse])
async def list_achievements(
    db: AsyncSession = Depends(get_db),
    include_hidden: bool = False,
    achievement_type: Optional[AchievementType] = None,
):
    """List all achievements"""
    query = select(Achievement)
    
    if not include_hidden:
        query = query.where(Achievement.is_hidden == False)
    
    if achievement_type:
        query = query.where(Achievement.achievement_type == achievement_type)
    
    query = query.order_by(Achievement.achievement_type, Achievement.name)
    
    result = await db.execute(query)
    achievements = result.scalars().all()
    
    return achievements


@router.get("/me", response_model=List[UserAchievementResponse])
async def get_my_achievements(
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's earned achievements"""
    keycloak_id = token_user.get("sub")
    
    user_result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        return []
    
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(UserAchievement)
        .options(selectinload(UserAchievement.achievement))
        .where(UserAchievement.user_id == user.id)
        .order_by(UserAchievement.earned_at.desc())
    )
    user_achievements = result.scalars().all()
    
    return user_achievements


@router.get("/{achievement_slug}", response_model=AchievementResponse)
async def get_achievement(
    achievement_slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Get achievement details by slug"""
    result = await db.execute(
        select(Achievement).where(Achievement.slug == achievement_slug)
    )
    achievement = result.scalar_one_or_none()
    
    if not achievement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Achievement '{achievement_slug}' not found"
        )
    
    return achievement


@router.post("/check")
async def check_achievements(
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Check and award any newly earned achievements"""
    keycloak_id = token_user.get("sub")
    
    user_result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        return {"new_achievements": []}
    
    earned_result = await db.execute(
        select(UserAchievement.achievement_id).where(
            UserAchievement.user_id == user.id
        )
    )
    earned_ids = set(row[0] for row in earned_result.all())
    
    all_achievements_result = await db.execute(select(Achievement))
    all_achievements = all_achievements_result.scalars().all()
    
    new_achievements = []
    
    for achievement in all_achievements:
        if achievement.id in earned_ids:
            continue
        
        if await check_achievement_criteria(user, achievement, db):
            user_achievement = UserAchievement(
                user_id=user.id,
                achievement_id=achievement.id,
            )
            db.add(user_achievement)
            user.total_xp += achievement.xp_reward
            new_achievements.append({
                "slug": achievement.slug,
                "name": achievement.name,
                "xp_reward": achievement.xp_reward,
            })
    
    if new_achievements:
        await db.commit()
    
    return {"new_achievements": new_achievements}


async def check_achievement_criteria(
    user: User,
    achievement: Achievement,
    db: AsyncSession
) -> bool:
    """Check if user meets achievement criteria"""
    criteria = achievement.criteria
    criteria_type = criteria.get("type")
    
    from app.models.progress import Progress
    from sqlalchemy import func
    
    if criteria_type == "levels_completed":
        required_count = criteria.get("count", 1)
        result = await db.execute(
            select(func.count(Progress.id))
            .where(Progress.user_id == user.id)
            .where(Progress.completed == True)
        )
        count = result.scalar()
        return count >= required_count
    
    elif criteria_type == "measurement_count":
        return True
    
    elif criteria_type == "game_completed":
        game_slug = criteria.get("game_slug")
        from app.models.game import Game, Level
        
        game_result = await db.execute(
            select(Game).where(Game.slug == game_slug)
        )
        game = game_result.scalar_one_or_none()
        if not game:
            return False
        
        levels_result = await db.execute(
            select(func.count(Level.id)).where(Level.game_id == game.id)
        )
        total_levels = levels_result.scalar()
        
        completed_result = await db.execute(
            select(func.count(Progress.id))
            .join(Level)
            .where(Progress.user_id == user.id)
            .where(Level.game_id == game.id)
            .where(Progress.completed == True)
        )
        completed_levels = completed_result.scalar()
        
        return completed_levels >= total_levels
    
    elif criteria_type == "stars_earned":
        required_stars = criteria.get("stars", 3)
        required_count = criteria.get("count", 1)
        result = await db.execute(
            select(func.count(Progress.id))
            .where(Progress.user_id == user.id)
            .where(Progress.stars >= required_stars)
        )
        count = result.scalar()
        return count >= required_count
    
    return False
