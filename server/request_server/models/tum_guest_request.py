"""TUM Guest Account Request database model."""

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from request_server.db.base import Base, TimestampMixin
from request_server.models.request_status import RequestStatus


class GuestType(enum.StrEnum):
    IPRAKTIKUM_CUSTOMER = "ipraktikum-customer"
    ARTEMIS = "artemis"
    OTHER = "other"


class Gender(enum.StrEnum):
    MALE = "male"
    FEMALE = "female"
    DIVERSE = "diverse"


class TUMGuestRequest(Base, TimestampMixin):
    """Model for TUM Guest Account requests."""

    __tablename__ = "tum_guest_requests"

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

    # Flag to indicate if user is requesting for themselves (only for anonymous)
    requesting_for_self: Mapped[bool] = mapped_column(Boolean, default=True)

    # Guest personal information
    guest_first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    guest_last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    guest_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    guest_birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    guest_gender: Mapped[Gender] = mapped_column(
        Enum(Gender, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    guest_nationality: Mapped[str] = mapped_column(String(100), nullable=False)

    # Contact person at TUM (required for anonymous requests)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Guest type and type-specific details
    guest_type: Mapped[GuestType] = mapped_column(
        Enum(GuestType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    guest_type_details: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

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

    # TUM account info (filled after account creation)
    tum_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
