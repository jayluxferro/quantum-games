"""Game and Level models"""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Boolean, Text, Enum as SQLEnum, DateTime, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
import enum

from app.core.database import Base
from app.models.user import EducationLevel

if TYPE_CHECKING:
    from app.models.progress import Progress, GameSession


class GameMode(str, enum.Enum):
    SINGLE_PLAYER = "single_player"
    TURN_BASED = "turn_based"
    REAL_TIME = "real_time"
    COOPERATIVE = "cooperative"


class Game(Base):
    __tablename__ = "games"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    target_level: Mapped[EducationLevel] = mapped_column(
        SQLEnum(
            EducationLevel,
            name="education_level",
            create_type=False,
            values_callable=lambda x: [e.value for e in x]
        ),
        nullable=False
    )
    min_age: Mapped[int] = mapped_column(Integer, default=6)
    max_age: Mapped[Optional[int]] = mapped_column(Integer)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500))
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    quantum_concepts: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    multiplayer_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    supported_modes: Mapped[list[str]] = mapped_column(
        ARRAY(Text),
        default=["single_player"]
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
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
    levels: Mapped[list["Level"]] = relationship(
        "Level",
        back_populates="game",
        cascade="all, delete-orphan",
        order_by="Level.sequence"
    )
    sessions: Mapped[list["GameSession"]] = relationship(
        "GameSession",
        back_populates="game"
    )
    
    def __repr__(self) -> str:
        return f"<Game {self.slug}>"


class Level(Base):
    __tablename__ = "levels"
    
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
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    objectives: Mapped[list] = mapped_column(JSONB, default=list)
    quantum_concepts: Mapped[list] = mapped_column(JSONB, default=list)
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=5)
    xp_reward: Mapped[int] = mapped_column(Integer, default=10)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    
    # Relationships
    game: Mapped["Game"] = relationship("Game", back_populates="levels")
    progress: Mapped[list["Progress"]] = relationship(
        "Progress",
        back_populates="level",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Level {self.title}>"
