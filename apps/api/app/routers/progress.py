"""Progress tracking endpoints"""
from typing import Optional, List, Dict
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import require_user
from app.models.user import User
from app.models.game import Game, Level
from app.models.progress import Progress, GameSession
from app.services.anticheat import AnticheatService, SolutionVerifier
from app.services.scoring import ServerSideScorer
from app.services.proctoring import ProctoringService, generate_browser_fingerprint

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
    proctored_session_token: Optional[str] = None
    browser_info: Optional[Dict[str, str]] = None


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


class ValidationWarning(BaseModel):
    code: str
    message: str


class ProgressResponseWithValidation(ProgressResponse):
    validation_warnings: List[ValidationWarning] = []
    prerequisites_met: bool = True


@router.post("/level/{level_id}/complete", response_model=ProgressResponseWithValidation)
async def complete_level(
    level_id: UUID,
    update_data: ProgressUpdate,
    request: Request,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit level completion with anti-cheat validation"""
    keycloak_id = token_user.get("sub")
    anticheat = AnticheatService(db)
    proctoring_svc = ProctoringService(db)
    warnings: List[ValidationWarning] = []
    proctored_session = None
    
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
    
    # Get game for prerequisite checks
    game_result = await db.execute(
        select(Game).where(Game.id == level.game_id)
    )
    game = game_result.scalar_one_or_none()
    
    # Proctoring validation: Check if level requires proctoring
    requires_proctoring = level.config.get("requires_proctoring", False)
    
    if requires_proctoring:
        if not update_data.proctored_session_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "PROCTORING_REQUIRED",
                    "message": "This level requires a proctored session. Please start a proctored session first.",
                }
            )
        
        # Build browser info for validation
        browser_info = {
            "user_agent": update_data.browser_info.get("user_agent", "") if update_data.browser_info else "",
            "ip_address": request.client.host if request.client else None,
        }
        
        if update_data.browser_info:
            browser_info["fingerprint"] = update_data.browser_info.get("fingerprint") or generate_browser_fingerprint(
                user_agent=browser_info["user_agent"],
                screen_resolution=update_data.browser_info.get("screen_resolution"),
                timezone=update_data.browser_info.get("timezone"),
                language=update_data.browser_info.get("language"),
            )
        
        # Validate the proctored session
        session_valid, session_error, proctored_session = await proctoring_svc.validate_active_session(
            session_token=update_data.proctored_session_token,
            browser_info=browser_info,
        )
        
        if not session_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_PROCTORED_SESSION",
                    "message": session_error,
                }
            )
        
        # Check for integrity warnings
        if proctored_session and proctored_session.flags:
            warning_count = len([f for f in proctored_session.flags if f.get("severity") == "warning"])
            if warning_count > 0:
                warnings.append(ValidationWarning(
                    code="PROCTORING_WARNINGS",
                    message=f"Session has {warning_count} integrity warning(s) that may be reviewed."
                ))
    
    # Anti-cheat validation #1: Time anomaly detection
    time_valid, time_error = await anticheat.validate_completion_time(
        level=level,
        time_seconds=update_data.time_seconds,
    )
    if not time_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "TIME_ANOMALY",
                "message": time_error,
            }
        )
    
    # Anti-cheat validation #2: Score bounds check
    score_valid, score_error = await anticheat.validate_score_bounds(
        score=update_data.score,
        max_score=level.config.get("max_score"),
        level=level,
    )
    if not score_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_SCORE",
                "message": score_error,
            }
        )
    
    # Anti-cheat validation #3: Check prerequisites
    prereqs_met, prereq_error, missing_prereqs = await anticheat.check_prerequisites(
        user=user,
        game=game,
        level=level,
    )
    if not prereqs_met:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "PREREQUISITES_NOT_MET",
                "message": prereq_error,
                "missing": missing_prereqs,
            }
        )
    
    # Anti-cheat validation #4: Education tier mastery gates
    tier_ok, tier_error, tier_details = await anticheat.check_education_tier_mastery(
        user=user,
        target_level=game.target_level,
        min_stars=2,
        min_games_completed=1,
    )
    if not tier_ok:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "TIER_MASTERY_REQUIRED",
                "message": tier_error,
                "details": tier_details,
            }
        )
    
    # Anti-cheat validation #5: Solution replay verification
    verified_score = update_data.score
    score_breakdown = {}
    
    if update_data.solution:
        verifier = SolutionVerifier(db)
        solution_valid, solution_error, verified_score = await verifier.verify_solution(
            game=game,
            level=level,
            solution=update_data.solution,
            claimed_score=update_data.score,
        )
        if not solution_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "SOLUTION_VERIFICATION_FAILED",
                    "message": solution_error,
                }
            )
        
        # Anti-cheat validation #6: Server-side score calculation
        # For critical assessment games, calculate score server-side
        if game.config.get("server_side_scoring", False):
            scorer = ServerSideScorer(db)
            server_score, max_score, score_breakdown = await scorer.calculate_score(
                game=game,
                level=level,
                solution=update_data.solution,
                time_seconds=update_data.time_seconds,
            )
            
            # Use server-calculated score, not client-reported
            if server_score != update_data.score:
                warnings.append(ValidationWarning(
                    code="SCORE_RECALCULATED",
                    message=f"Score calculated server-side: {server_score} (client reported: {update_data.score})"
                ))
            verified_score = server_score
        
        elif verified_score != update_data.score:
            warnings.append(ValidationWarning(
                code="SCORE_ADJUSTED",
                message=f"Score adjusted from {update_data.score} to {verified_score} based on verification"
            ))
        
        # Anti-cheat validation #7: Solution diversity check
        if level.config.get("check_solution_diversity", False):
            is_unique, diversity_warning, diversity_details = await anticheat.check_solution_diversity(
                user=user,
                level=level,
                solution=update_data.solution,
            )
            
            if not is_unique:
                # For strict mode, reject duplicates
                if level.config.get("strict_diversity", False):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={
                            "code": "DUPLICATE_SOLUTION",
                            "message": diversity_warning,
                            "details": diversity_details,
                        }
                    )
                else:
                    # For lenient mode, apply score penalty and warn
                    warnings.append(ValidationWarning(
                        code="SIMILAR_SOLUTION",
                        message=diversity_warning
                    ))
                    # Apply 25% penalty for similar solutions
                    verified_score = int(verified_score * 0.75)
    
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
    
    # Use verified score (may differ from claimed score after verification)
    if verified_score > progress.score:
        progress.score = verified_score
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
    
    # Complete the proctored session if one was used
    if proctored_session and update_data.proctored_session_token:
        await proctoring_svc.complete_session(
            session_token=update_data.proctored_session_token,
            score=progress.score,
            integrity_notes=f"Completed with {len(warnings)} validation warning(s)" if warnings else None,
        )
    
    return ProgressResponseWithValidation(
        id=progress.id,
        level_id=progress.level_id,
        score=progress.score,
        max_score=progress.max_score,
        stars=progress.stars,
        attempts=progress.attempts,
        best_time_seconds=progress.best_time_seconds,
        completed=progress.completed,
        completed_at=progress.completed_at,
        validation_warnings=warnings,
        prerequisites_met=prereqs_met,
    )


class LevelAccessResponse(BaseModel):
    level_id: UUID
    can_access: bool
    reasons: List[str] = []
    missing_prerequisites: List[Dict] = []
    tier_details: Optional[Dict] = None


@router.get("/level/{level_id}/access", response_model=LevelAccessResponse)
async def check_level_access(
    level_id: UUID,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if user can access a specific level (prerequisite & tier check)"""
    keycloak_id = token_user.get("sub")
    anticheat = AnticheatService(db)
    reasons = []
    
    user_result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        return LevelAccessResponse(
            level_id=level_id,
            can_access=True,  # New users can access basic content
            reasons=[],
        )
    
    level_result = await db.execute(
        select(Level).where(Level.id == level_id)
    )
    level = level_result.scalar_one_or_none()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Level not found"
        )
    
    game_result = await db.execute(
        select(Game).where(Game.id == level.game_id)
    )
    game = game_result.scalar_one_or_none()
    
    # Check prerequisites
    prereqs_met, prereq_error, missing = await anticheat.check_prerequisites(
        user=user,
        game=game,
        level=level,
    )
    if not prereqs_met:
        reasons.append(prereq_error)
    
    # Check tier mastery
    tier_ok, tier_error, tier_details = await anticheat.check_education_tier_mastery(
        user=user,
        target_level=game.target_level,
    )
    if not tier_ok:
        reasons.append(tier_error)
    
    return LevelAccessResponse(
        level_id=level_id,
        can_access=prereqs_met and tier_ok,
        reasons=reasons,
        missing_prerequisites=missing,
        tier_details=tier_details,
    )


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
