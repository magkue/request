"""Artemis Developer Access Request database model."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Enum, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from request_server.db.base import Base, TimestampMixin
from request_server.models.request_status import RequestStatus


class ArtemisDeveloperRequest(Base, TimestampMixin):
    """Model for Artemis Developer Access requests."""

    __tablename__ = "artemis_developer_requests"

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

    # GitHub info (verified)
    github_username: Mapped[str] = mapped_column(String(39), nullable=False, index=True)
    github_user_id: Mapped[int | None] = mapped_column(nullable=True)
    github_avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_profile_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    github_verified: Mapped[bool] = mapped_column(Boolean, default=True)

    # Artemis details
    slack_email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str] = mapped_column(String(255), nullable=False)
    advisor: Mapped[str] = mapped_column(String(255), nullable=False)

    # Subteams (array of strings)
    subteams: Mapped[list] = mapped_column(ARRAY(String), nullable=False)
    other_subteam: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Additional comments
    additional_comments: Mapped[str | None] = mapped_column(Text, nullable=True)

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
