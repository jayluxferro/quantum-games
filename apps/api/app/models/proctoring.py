"""Proctoring session models for exam integrity"""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
import enum

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.game import Game, Level


class ProctoringProvider(str, enum.Enum):
    """Supported proctoring providers"""
    LOCKDOWN_BROWSER = "lockdown_browser"
    PROCTORIO = "proctorio"
    HONORLOCK = "honorlock"
    EXAMITY = "examity"
    INTERNAL = "internal"  # Built-in basic proctoring


class ProctoringStatus(str, enum.Enum):
    """Status of a proctored session"""
    PENDING = "pending"
    VERIFIED = "verified"
    ACTIVE = "active"
    COMPLETED = "completed"
    FLAGGED = "flagged"
    INVALIDATED = "invalidated"


class ProctoredSession(Base):
    """
    Tracks proctored exam sessions for high-stakes assessments.
    """
    __tablename__ = "proctored_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    level_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("levels.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Proctoring provider info
    provider: Mapped[ProctoringProvider] = mapped_column(
        SQLEnum(
            ProctoringProvider,
            name="proctoring_provider",
            create_type=True,
            values_callable=lambda x: [e.value for e in x]
        ),
        default=ProctoringProvider.INTERNAL
    )
    
    # Session status
    status: Mapped[ProctoringStatus] = mapped_column(
        SQLEnum(
            ProctoringStatus,
            name="proctoring_status",
            create_type=True,
            values_callable=lambda x: [e.value for e in x]
        ),
        default=ProctoringStatus.PENDING
    )
    
    # Browser/environment verification
    browser_fingerprint: Mapped[Optional[str]] = mapped_column(String(512))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))  # IPv6 compatible
    
    # Provider-specific session data
    provider_session_id: Mapped[Optional[str]] = mapped_column(String(255))
    provider_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    # Verification tokens
    session_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    verification_code: Mapped[Optional[str]] = mapped_column(String(50))
    
    # Timing
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Time limits
    max_duration_minutes: Mapped[int] = mapped_column(Integer, default=60)
    
    # Flags and notes
    flags: Mapped[list] = mapped_column(JSONB, default=list)
    proctor_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Final result
    integrity_score: Mapped[Optional[int]] = mapped_column(Integer)  # 0-100
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User")
    level: Mapped["Level"] = relationship("Level")
    
    def __repr__(self) -> str:
        return f"<ProctoredSession {self.id} user={self.user_id} status={self.status}>"


class ProctoringFlag(Base):
    """
    Individual flags raised during a proctored session.
    """
    __tablename__ = "proctoring_flags"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("proctored_sessions.id", ondelete="CASCADE"),
        nullable=False
    )
    
    flag_type: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="warning")  # info, warning, critical
    description: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    flag_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    
    # Review status
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text)
    
    # Relationships
    session: Mapped["ProctoredSession"] = relationship(
        "ProctoredSession",
        backref="flag_records"
    )
    
    def __repr__(self) -> str:
        return f"<ProctoringFlag {self.flag_type} severity={self.severity}>"
