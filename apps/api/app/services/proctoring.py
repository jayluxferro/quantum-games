"""Proctoring service for exam integrity"""
from typing import Dict, Any, Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timedelta
import secrets
import hashlib
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.user import User
from app.models.game import Level
from app.models.proctoring import (
    ProctoredSession,
    ProctoringFlag,
    ProctoringProvider,
    ProctoringStatus,
)


class ProctoringService:
    """
    Manages proctored exam sessions for high-stakes assessments.
    
    Supports multiple proctoring providers and internal basic proctoring.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_proctored_session(
        self,
        user: User,
        level: Level,
        provider: ProctoringProvider = ProctoringProvider.INTERNAL,
        max_duration_minutes: int = 60,
        browser_info: Optional[Dict[str, Any]] = None,
    ) -> ProctoredSession:
        """
        Create a new proctored session for an exam attempt.
        
        Returns the session with a unique token for verification.
        """
        session_token = secrets.token_urlsafe(32)
        verification_code = secrets.token_hex(4).upper()
        
        session = ProctoredSession(
            user_id=user.id,
            level_id=level.id,
            provider=provider,
            status=ProctoringStatus.PENDING,
            session_token=session_token,
            verification_code=verification_code,
            max_duration_minutes=max_duration_minutes,
            browser_fingerprint=browser_info.get("fingerprint") if browser_info else None,
            user_agent=browser_info.get("user_agent") if browser_info else None,
            ip_address=browser_info.get("ip_address") if browser_info else None,
        )
        
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        
        return session
    
    async def verify_session(
        self,
        session_token: str,
        verification_code: str,
        browser_info: Dict[str, Any],
    ) -> Tuple[bool, Optional[str], Optional[ProctoredSession]]:
        """
        Verify a proctored session is valid and activate it.
        
        Checks:
        - Session exists and is pending
        - Verification code matches
        - Browser fingerprint consistency (if enabled)
        
        Returns:
            Tuple of (is_valid, error_message, session)
        """
        result = await self.db.execute(
            select(ProctoredSession)
            .where(ProctoredSession.session_token == session_token)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            return False, "Invalid session token", None
        
        if session.status != ProctoringStatus.PENDING:
            return False, f"Session is not pending (status: {session.status})", None
        
        if session.verification_code != verification_code:
            await self._add_flag(
                session,
                "INVALID_VERIFICATION_CODE",
                "warning",
                "Incorrect verification code entered"
            )
            return False, "Invalid verification code", None
        
        # Check browser consistency if we have a fingerprint
        if session.browser_fingerprint:
            new_fingerprint = browser_info.get("fingerprint")
            if new_fingerprint and new_fingerprint != session.browser_fingerprint:
                await self._add_flag(
                    session,
                    "BROWSER_FINGERPRINT_MISMATCH",
                    "warning",
                    f"Browser fingerprint changed from {session.browser_fingerprint[:16]}... to {new_fingerprint[:16]}..."
                )
        
        # Activate the session
        session.status = ProctoringStatus.VERIFIED
        session.verified_at = datetime.utcnow()
        session.user_agent = browser_info.get("user_agent")
        session.ip_address = browser_info.get("ip_address")
        
        await self.db.commit()
        await self.db.refresh(session)
        
        return True, None, session
    
    async def start_session(
        self,
        session_token: str,
    ) -> Tuple[bool, Optional[str], Optional[ProctoredSession]]:
        """
        Mark a verified session as active (exam started).
        """
        result = await self.db.execute(
            select(ProctoredSession)
            .where(ProctoredSession.session_token == session_token)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            return False, "Invalid session token", None
        
        if session.status != ProctoringStatus.VERIFIED:
            return False, f"Session must be verified first (status: {session.status})", None
        
        session.status = ProctoringStatus.ACTIVE
        session.started_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(session)
        
        return True, None, session
    
    async def validate_active_session(
        self,
        session_token: str,
        browser_info: Dict[str, Any],
    ) -> Tuple[bool, Optional[str], Optional[ProctoredSession]]:
        """
        Validate that a session is still valid for submission.
        
        Checks:
        - Session is active
        - Time limit not exceeded
        - Browser/IP consistency
        """
        result = await self.db.execute(
            select(ProctoredSession)
            .where(ProctoredSession.session_token == session_token)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            return False, "Invalid session token", None
        
        if session.status != ProctoringStatus.ACTIVE:
            return False, f"Session is not active (status: {session.status})", None
        
        # Check time limit
        elapsed = datetime.utcnow() - session.started_at
        max_duration = timedelta(minutes=session.max_duration_minutes)
        
        if elapsed > max_duration:
            session.status = ProctoringStatus.INVALIDATED
            await self._add_flag(
                session,
                "TIME_LIMIT_EXCEEDED",
                "critical",
                f"Submission attempted after time limit ({elapsed} > {max_duration})"
            )
            await self.db.commit()
            return False, "Session time limit exceeded", None
        
        # Check IP consistency
        if session.ip_address and browser_info.get("ip_address"):
            if session.ip_address != browser_info.get("ip_address"):
                await self._add_flag(
                    session,
                    "IP_ADDRESS_CHANGED",
                    "warning",
                    f"IP changed from {session.ip_address} to {browser_info.get('ip_address')}"
                )
        
        # Check user agent consistency
        if session.user_agent and browser_info.get("user_agent"):
            if session.user_agent != browser_info.get("user_agent"):
                await self._add_flag(
                    session,
                    "USER_AGENT_CHANGED",
                    "warning",
                    "Browser user agent changed during session"
                )
        
        await self.db.commit()
        
        return True, None, session
    
    async def complete_session(
        self,
        session_token: str,
        score: int,
        integrity_notes: Optional[str] = None,
    ) -> Tuple[bool, Optional[str], Optional[ProctoredSession]]:
        """
        Complete a proctored session after successful submission.
        """
        result = await self.db.execute(
            select(ProctoredSession)
            .where(ProctoredSession.session_token == session_token)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            return False, "Invalid session token", None
        
        if session.status not in [ProctoringStatus.ACTIVE, ProctoringStatus.FLAGGED]:
            return False, f"Cannot complete session with status: {session.status}", None
        
        # Calculate integrity score based on flags
        integrity_score = await self._calculate_integrity_score(session)
        
        session.status = ProctoringStatus.COMPLETED
        session.ended_at = datetime.utcnow()
        session.integrity_score = integrity_score
        session.proctor_notes = integrity_notes
        
        await self.db.commit()
        await self.db.refresh(session)
        
        return True, None, session
    
    async def flag_session(
        self,
        session_token: str,
        flag_type: str,
        severity: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Add a flag to an active session.
        """
        result = await self.db.execute(
            select(ProctoredSession)
            .where(ProctoredSession.session_token == session_token)
        )
        session = result.scalar_one_or_none()
        
        if not session:
            return False
        
        await self._add_flag(session, flag_type, severity, description, metadata)
        
        # Update session status if critical flag
        if severity == "critical" and session.status == ProctoringStatus.ACTIVE:
            session.status = ProctoringStatus.FLAGGED
        
        await self.db.commit()
        
        return True
    
    async def _add_flag(
        self,
        session: ProctoredSession,
        flag_type: str,
        severity: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ProctoringFlag:
        """Add a flag record to a session"""
        flag = ProctoringFlag(
            session_id=session.id,
            flag_type=flag_type,
            severity=severity,
            description=description,
            metadata=metadata or {},
        )
        
        self.db.add(flag)
        
        # Also update the session's flags array
        current_flags = session.flags or []
        current_flags.append({
            "type": flag_type,
            "severity": severity,
            "description": description,
            "timestamp": datetime.utcnow().isoformat(),
        })
        session.flags = current_flags
        
        return flag
    
    async def _calculate_integrity_score(
        self,
        session: ProctoredSession,
    ) -> int:
        """
        Calculate integrity score based on flags.
        
        100 = no issues
        0 = severe violations
        """
        flags = session.flags or []
        
        if not flags:
            return 100
        
        score = 100
        
        for flag in flags:
            severity = flag.get("severity", "info")
            
            if severity == "critical":
                score -= 30
            elif severity == "warning":
                score -= 10
            elif severity == "info":
                score -= 2
        
        return max(0, score)
    
    async def get_session_by_token(
        self,
        session_token: str,
    ) -> Optional[ProctoredSession]:
        """Get a proctored session by its token"""
        result = await self.db.execute(
            select(ProctoredSession)
            .where(ProctoredSession.session_token == session_token)
        )
        return result.scalar_one_or_none()
    
    async def get_user_sessions(
        self,
        user_id: UUID,
        level_id: Optional[UUID] = None,
    ) -> List[ProctoredSession]:
        """Get all proctored sessions for a user"""
        query = select(ProctoredSession).where(ProctoredSession.user_id == user_id)
        
        if level_id:
            query = query.where(ProctoredSession.level_id == level_id)
        
        query = query.order_by(ProctoredSession.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())


def validate_lockdown_browser(user_agent: str) -> Tuple[bool, Optional[str]]:
    """
    Validate that the request is from Respondus LockDown Browser.
    
    LockDown Browser includes specific identifiers in its User-Agent string.
    """
    lockdown_patterns = [
        r"LockDown\s*Browser",
        r"Respondus",
        r"RLDB",
    ]
    
    for pattern in lockdown_patterns:
        if re.search(pattern, user_agent, re.IGNORECASE):
            return True, None
    
    return False, "This assessment requires Respondus LockDown Browser. Please launch the assessment from LockDown Browser."


def generate_browser_fingerprint(
    user_agent: str,
    screen_resolution: Optional[str] = None,
    timezone: Optional[str] = None,
    language: Optional[str] = None,
) -> str:
    """
    Generate a simple browser fingerprint for session consistency checks.
    
    Note: This is a basic implementation. Production systems should use
    more sophisticated fingerprinting libraries.
    """
    components = [
        user_agent,
        screen_resolution or "unknown",
        timezone or "unknown",
        language or "unknown",
    ]
    
    fingerprint_string = "|".join(components)
    return hashlib.sha256(fingerprint_string.encode()).hexdigest()[:32]


async def get_proctoring_service(db: AsyncSession) -> ProctoringService:
    return ProctoringService(db)
