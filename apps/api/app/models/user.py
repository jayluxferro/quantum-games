"""User model"""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, Enum as SQLEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid
import enum

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.progress import Progress, GameSession
    from app.models.achievement import UserAchievement
    from app.models.course import Enrollment


class EducationLevel(str, enum.Enum):
    BASIC_SCHOOL = "basic_school"
    JUNIOR_HIGH = "junior_high"
    SENIOR_HIGH = "senior_high"
    UNDERGRADUATE = "undergraduate"
    POSTGRADUATE = "postgraduate"
    RESEARCHER = "researcher"


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    keycloak_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255))
    education_level: Mapped[EducationLevel] = mapped_column(
        SQLEnum(
            EducationLevel,
            name="education_level",
            create_type=False,
            values_callable=lambda x: [e.value for e in x]
        ),
        default=EducationLevel.BASIC_SCHOOL
    )
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    progress: Mapped[list["Progress"]] = relationship(
        "Progress",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    game_sessions: Mapped[list["GameSession"]] = relationship(
        "GameSession",
        back_populates="user"
    )
    achievements: Mapped[list["UserAchievement"]] = relationship(
        "UserAchievement",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<User {self.username}>"
