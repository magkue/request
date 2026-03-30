"""Support Request database model."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from request_server.db.base import Base, TimestampMixin
from request_server.models.request_status import RequestStatus


class SupportCategory(enum.StrEnum):
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    QUESTION = "question"
    OTHER = "other"


class SupportRequest(Base, TimestampMixin):
    """Model for Support requests."""

    __tablename__ = "support_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Requester info (from Keycloak token, null if anonymous)
    requester_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    requester_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    requester_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    requester_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Flag to indicate if request was made by logged-in user
    is_authenticated_request: Mapped[bool] = mapped_column(Boolean, default=False)

    # For anonymous users
    anonymous_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    anonymous_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    anonymous_tum_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Support request details
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[SupportCategory] = mapped_column(
        Enum(SupportCategory, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )

    # Request status
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=RequestStatus.OPEN,
    )

    # Admin fields
    reviewed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # External service references
    jira_ticket_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
