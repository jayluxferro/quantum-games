"""Progress and GameSession models"""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid

from app.core.database import Base
from app.models.game import GameMode

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.game import Game, Level


class Progress(Base):
    __tablename__ = "progress"
    
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
    score: Mapped[int] = mapped_column(Integer, default=0)
    max_score: Mapped[Optional[int]] = mapped_column(Integer)
    stars: Mapped[int] = mapped_column(Integer, default=0)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    best_time_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    best_solution: Mapped[Optional[dict]] = mapped_column(JSONB)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="progress")
    level: Mapped["Level"] = relationship("Level", back_populates="progress")
    
    def __repr__(self) -> str:
        return f"<Progress user={self.user_id} level={self.level_id}>"


class GameSession(Base):
    __tablename__ = "game_sessions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    game_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("games.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )
    room_id: Mapped[Optional[str]] = mapped_column(String(255))
    mode: Mapped[GameMode] = mapped_column(
        SQLEnum(
            GameMode,
            name="game_mode",
            create_type=False,
            values_callable=lambda x: [e.value for e in x]
        ),
        default=GameMode.SINGLE_PLAYER
    )
    state: Mapped[dict] = mapped_column(JSONB, default=dict)
    session_metadata: Mapped[dict] = mapped_column(JSONB, default=dict)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Relationships
    game: Mapped["Game"] = relationship("Game", back_populates="sessions")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="game_sessions")
    
    def __repr__(self) -> str:
        return f"<GameSession {self.id}>"
