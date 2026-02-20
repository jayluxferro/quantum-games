"""LTI Platform model for LMS integration"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
import uuid

from app.core.database import Base


class LTIPlatform(Base):
    __tablename__ = "lti_platforms"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    issuer: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    client_id: Mapped[str] = mapped_column(String(255), nullable=False)
    deployment_id: Mapped[Optional[str]] = mapped_column(String(255))
    auth_endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    token_endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    jwks_endpoint: Mapped[str] = mapped_column(String(500), nullable=False)
    public_key: Mapped[Optional[str]] = mapped_column(Text)
    private_key: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )
    
    def __repr__(self) -> str:
        return f"<LTIPlatform {self.name}>"
