"""Proctoring endpoints for exam integrity"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import require_user, require_role
from app.models.user import User
from app.models.game import Level
from app.models.proctoring import (
    ProctoredSession,
    ProctoringProvider,
    ProctoringStatus,
)
from app.services.proctoring import (
    ProctoringService,
    validate_lockdown_browser,
    generate_browser_fingerprint,
)

router = APIRouter(prefix="/proctoring", tags=["proctoring"])


class BrowserInfo(BaseModel):
    user_agent: str
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    fingerprint: Optional[str] = None


class CreateSessionRequest(BaseModel):
    level_id: UUID
    provider: ProctoringProvider = ProctoringProvider.INTERNAL
    max_duration_minutes: int = 60
    browser_info: BrowserInfo


class VerifySessionRequest(BaseModel):
    session_token: str
    verification_code: str
    browser_info: BrowserInfo


class SessionResponse(BaseModel):
    id: UUID
    level_id: UUID
    provider: str
    status: str
    session_token: str
    verification_code: Optional[str]
    started_at: datetime
    verified_at: Optional[datetime]
    ended_at: Optional[datetime]
    max_duration_minutes: int
    integrity_score: Optional[int]
    flags: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True


class StartSessionResponse(BaseModel):
    success: bool
    message: str
    session: Optional[SessionResponse]
    time_remaining_minutes: Optional[int]


@router.post("/sessions", response_model=SessionResponse)
async def create_proctored_session(
    request: CreateSessionRequest,
    client_request: Request,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new proctored session for a high-stakes assessment.
    
    The session must be verified before the exam can start.
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
    
    # Get level
    level_result = await db.execute(
        select(Level).where(Level.id == request.level_id)
    )
    level = level_result.scalar_one_or_none()
    
    if not level:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Level not found"
        )
    
    # Check if level requires proctoring
    if not level.config.get("requires_proctoring", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This level does not require proctoring"
        )
    
    # Validate LockDown Browser if required
    if request.provider == ProctoringProvider.LOCKDOWN_BROWSER:
        is_valid, error = validate_lockdown_browser(request.browser_info.user_agent)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "LOCKDOWN_BROWSER_REQUIRED",
                    "message": error,
                }
            )
    
    # Generate browser fingerprint
    fingerprint = request.browser_info.fingerprint or generate_browser_fingerprint(
        user_agent=request.browser_info.user_agent,
        screen_resolution=request.browser_info.screen_resolution,
        timezone=request.browser_info.timezone,
        language=request.browser_info.language,
    )
    
    browser_info = {
        "fingerprint": fingerprint,
        "user_agent": request.browser_info.user_agent,
        "ip_address": client_request.client.host if client_request.client else None,
    }
    
    # Create session
    proctoring = ProctoringService(db)
    session = await proctoring.create_proctored_session(
        user=user,
        level=level,
        provider=request.provider,
        max_duration_minutes=request.max_duration_minutes,
        browser_info=browser_info,
    )
    
    return SessionResponse(
        id=session.id,
        level_id=session.level_id,
        provider=session.provider.value,
        status=session.status.value,
        session_token=session.session_token,
        verification_code=session.verification_code,
        started_at=session.started_at,
        verified_at=session.verified_at,
        ended_at=session.ended_at,
        max_duration_minutes=session.max_duration_minutes,
        integrity_score=session.integrity_score,
        flags=session.flags or [],
    )


@router.post("/sessions/verify", response_model=StartSessionResponse)
async def verify_proctored_session(
    request: VerifySessionRequest,
    client_request: Request,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a proctored session with the verification code.
    
    This step ensures the student is ready to begin the exam.
    """
    fingerprint = request.browser_info.fingerprint or generate_browser_fingerprint(
        user_agent=request.browser_info.user_agent,
        screen_resolution=request.browser_info.screen_resolution,
        timezone=request.browser_info.timezone,
        language=request.browser_info.language,
    )
    
    browser_info = {
        "fingerprint": fingerprint,
        "user_agent": request.browser_info.user_agent,
        "ip_address": client_request.client.host if client_request.client else None,
    }
    
    proctoring = ProctoringService(db)
    is_valid, error, session = await proctoring.verify_session(
        session_token=request.session_token,
        verification_code=request.verification_code,
        browser_info=browser_info,
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "VERIFICATION_FAILED",
                "message": error,
            }
        )
    
    return StartSessionResponse(
        success=True,
        message="Session verified. You may now start the exam.",
        session=SessionResponse(
            id=session.id,
            level_id=session.level_id,
            provider=session.provider.value,
            status=session.status.value,
            session_token=session.session_token,
            verification_code=None,  # Hide after verification
            started_at=session.started_at,
            verified_at=session.verified_at,
            ended_at=session.ended_at,
            max_duration_minutes=session.max_duration_minutes,
            integrity_score=session.integrity_score,
            flags=session.flags or [],
        ),
        time_remaining_minutes=session.max_duration_minutes,
    )


@router.post("/sessions/{session_token}/start", response_model=StartSessionResponse)
async def start_proctored_session(
    session_token: str,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start a verified proctored session (begin the exam).
    """
    proctoring = ProctoringService(db)
    is_valid, error, session = await proctoring.start_session(session_token)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "START_FAILED",
                "message": error,
            }
        )
    
    return StartSessionResponse(
        success=True,
        message="Exam started. Good luck!",
        session=SessionResponse(
            id=session.id,
            level_id=session.level_id,
            provider=session.provider.value,
            status=session.status.value,
            session_token=session.session_token,
            verification_code=None,
            started_at=session.started_at,
            verified_at=session.verified_at,
            ended_at=session.ended_at,
            max_duration_minutes=session.max_duration_minutes,
            integrity_score=session.integrity_score,
            flags=session.flags or [],
        ),
        time_remaining_minutes=session.max_duration_minutes,
    )


@router.get("/sessions/{session_token}", response_model=SessionResponse)
async def get_proctored_session(
    session_token: str,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current status of a proctored session.
    """
    proctoring = ProctoringService(db)
    session = await proctoring.get_session_by_token(session_token)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Calculate time remaining if active
    time_remaining = None
    if session.status == ProctoringStatus.ACTIVE:
        from datetime import timedelta
        elapsed = datetime.utcnow() - session.started_at
        remaining = timedelta(minutes=session.max_duration_minutes) - elapsed
        time_remaining = max(0, int(remaining.total_seconds() / 60))
    
    return SessionResponse(
        id=session.id,
        level_id=session.level_id,
        provider=session.provider.value,
        status=session.status.value,
        session_token=session.session_token,
        verification_code=None if session.status != ProctoringStatus.PENDING else session.verification_code,
        started_at=session.started_at,
        verified_at=session.verified_at,
        ended_at=session.ended_at,
        max_duration_minutes=time_remaining or session.max_duration_minutes,
        integrity_score=session.integrity_score,
        flags=session.flags or [],
    )


class FlagRequest(BaseModel):
    flag_type: str
    severity: str = "warning"
    description: str
    metadata: Optional[Dict[str, Any]] = None


@router.post("/sessions/{session_token}/flag")
async def flag_session(
    session_token: str,
    request: FlagRequest,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Report a flag/violation during a proctored session.
    
    This can be called by the frontend when suspicious activity is detected.
    """
    proctoring = ProctoringService(db)
    success = await proctoring.flag_session(
        session_token=session_token,
        flag_type=request.flag_type,
        severity=request.severity,
        description=request.description,
        metadata=request.metadata,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return {"success": True, "message": "Flag recorded"}


class ValidateSubmissionRequest(BaseModel):
    session_token: str
    browser_info: BrowserInfo


@router.post("/sessions/validate-for-submission")
async def validate_session_for_submission(
    request: ValidateSubmissionRequest,
    client_request: Request,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Validate that a proctored session is still valid before accepting a submission.
    
    Call this before submitting progress for proctored levels.
    """
    fingerprint = request.browser_info.fingerprint or generate_browser_fingerprint(
        user_agent=request.browser_info.user_agent,
        screen_resolution=request.browser_info.screen_resolution,
        timezone=request.browser_info.timezone,
        language=request.browser_info.language,
    )
    
    browser_info = {
        "fingerprint": fingerprint,
        "user_agent": request.browser_info.user_agent,
        "ip_address": client_request.client.host if client_request.client else None,
    }
    
    proctoring = ProctoringService(db)
    is_valid, error, session = await proctoring.validate_active_session(
        session_token=request.session_token,
        browser_info=browser_info,
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "SESSION_INVALID",
                "message": error,
            }
        )
    
    return {
        "valid": True,
        "session_id": str(session.id),
        "integrity_warnings": len([f for f in (session.flags or []) if f.get("severity") == "warning"]),
    }


@router.get("/my-sessions", response_model=List[SessionResponse])
async def get_my_sessions(
    level_id: Optional[UUID] = None,
    token_user: dict = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all proctored sessions for the current user.
    """
    keycloak_id = token_user.get("sub")
    
    user_result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        return []
    
    proctoring = ProctoringService(db)
    sessions = await proctoring.get_user_sessions(user.id, level_id)
    
    return [
        SessionResponse(
            id=s.id,
            level_id=s.level_id,
            provider=s.provider.value,
            status=s.status.value,
            session_token=s.session_token,
            verification_code=None,
            started_at=s.started_at,
            verified_at=s.verified_at,
            ended_at=s.ended_at,
            max_duration_minutes=s.max_duration_minutes,
            integrity_score=s.integrity_score,
            flags=s.flags or [],
        )
        for s in sessions
    ]
