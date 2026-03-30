import enum
import uuid
from datetime import datetime

from sqlalchemy import Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from request_server.db.base import Base, TimestampMixin
from request_server.models.request_status import RequestStatus


class ProjectType(enum.StrEnum):
    IPRAKTIKUM = "ipraktikum"
    THESIS = "thesis"
    CHAIR_PROJECT = "chair_project"


class StudyLevel(enum.StrEnum):
    BA = "BA"
    MA = "MA"


class VMRequest(Base, TimestampMixin):
    __tablename__ = "vm_requests"

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

    # Basic VM info
    hostname: Mapped[str] = mapped_column(String(63), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Project type and details
    project_type: Mapped[ProjectType] = mapped_column(
        Enum(ProjectType),
        nullable=False,
    )

    # Project-specific details stored as JSON
    project_details: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Resources
    cpu_cores: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    ram_gb: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    resource_justification: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Firewall
    default_ports_enabled: Mapped[bool] = mapped_column(default=True)
    additional_ports: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)

    # Users
    additional_users: Mapped[list[str]] = mapped_column(
        ARRAY(String),
        nullable=False,
        default=list,
    )

    # SSH Key
    ssh_key_type: Mapped[str] = mapped_column(String(20), nullable=False)
    ssh_key_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Additional info
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

    # External service references (for future Jira/GitLab integration)
    jira_ticket_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gitlab_project_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
