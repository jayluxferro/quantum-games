"""User management endpoints"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import require_user, get_current_user
from app.models.user import User, EducationLevel

router = APIRouter(prefix="/users", tags=["users"])


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    display_name: Optional[str]
    education_level: EducationLevel
    total_xp: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    education_level: Optional[EducationLevel] = None
    preferences: Optional[dict] = None


class UserCreate(BaseModel):
    keycloak_id: str
    username: str
    email: EmailStr
    display_name: Optional[str] = None
    education_level: EducationLevel = EducationLevel.BASIC_SCHOOL


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's profile"""
    keycloak_id = token_user.get("sub")
    
    result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            keycloak_id=keycloak_id,
            username=token_user.get("preferred_username", "user"),
            email=token_user.get("email", ""),
            display_name=token_user.get("name"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    user.last_login_at = datetime.utcnow()
    await db.commit()
    
    return user


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    update_data: UserUpdate,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile"""
    keycloak_id = token_user.get("sub")
    
    result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if update_data.display_name is not None:
        user.display_name = update_data.display_name
    if update_data.education_level is not None:
        user.education_level = update_data.education_level
    if update_data.preferences is not None:
        user.preferences = {**user.preferences, **update_data.preferences}
    
    await db.commit()
    await db.refresh(user)
    
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    """Get user by ID (public profile)"""
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.get("/me/stats")
async def get_current_user_stats(
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's game statistics"""
    keycloak_id = token_user.get("sub")
    
    result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    from app.models.progress import Progress
    from app.models.achievement import UserAchievement
    from sqlalchemy import func
    
    progress_result = await db.execute(
        select(
            func.count(Progress.id).label("total_attempts"),
            func.sum(Progress.score).label("total_score"),
            func.count(Progress.id).filter(Progress.completed == True).label("completed_levels"),
            func.sum(Progress.stars).label("total_stars"),
        ).where(Progress.user_id == user.id)
    )
    progress_stats = progress_result.one()
    
    achievements_result = await db.execute(
        select(func.count(UserAchievement.id)).where(
            UserAchievement.user_id == user.id
        )
    )
    achievements_count = achievements_result.scalar()
    
    return {
        "user_id": str(user.id),
        "total_xp": user.total_xp,
        "total_attempts": progress_stats.total_attempts or 0,
        "total_score": progress_stats.total_score or 0,
        "completed_levels": progress_stats.completed_levels or 0,
        "total_stars": progress_stats.total_stars or 0,
        "achievements_earned": achievements_count or 0,
    }
