"""VM Access Request database model."""

import uuid
from datetime import datetime

from sqlalchemy import Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from request_server.db.base import Base, TimestampMixin
from request_server.models.request_status import RequestStatus


class VMAccessRequest(Base, TimestampMixin):
    """Model for VM access requests - requesting access to existing VMs."""

    __tablename__ = "vm_access_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Requester info (from Keycloak token)
    requester_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    requester_username: Mapped[str] = mapped_column(String(255), nullable=False)
    requester_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    requester_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Target VM info
    hostname: Mapped[str] = mapped_column(String(63), nullable=False, index=True)

    # Request details
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # SSH Key
    ssh_key_type: Mapped[str] = mapped_column(String(20), nullable=False)
    ssh_key_value: Mapped[str | None] = mapped_column(Text, nullable=True)

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
