import re
import uuid
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

from request_server.core.config import settings


class ProjectType(StrEnum):
    IPRAKTIKUM = "ipraktikum"
    THESIS = "thesis"
    CHAIR_PROJECT = "chair_project"


class StudyLevel(StrEnum):
    BA = "BA"
    MA = "MA"


class Protocol(StrEnum):
    TCP = "tcp"
    UDP = "udp"


class RequestStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


# Project-specific details
class IPraktikumDetails(BaseModel):
    team_name: str = Field(..., min_length=1, alias="teamName")
    coach_name: str = Field(..., min_length=1, alias="coachName")
    project_lead: str = Field(..., min_length=1, alias="projectLead")

    model_config = ConfigDict(populate_by_name=True)


class ThesisDetails(BaseModel):
    study_level: StudyLevel = Field(..., alias="studyLevel")
    title: str = Field(..., min_length=1)
    advisor: str = Field(..., min_length=1)

    model_config = ConfigDict(populate_by_name=True)


class ChairProjectDetails(BaseModel):
    project_name: str = Field(..., min_length=1, alias="projectName")
    project_description: str = Field(..., min_length=1, alias="projectDescription")
    responsible_person: str | None = Field(None, alias="responsiblePerson")

    model_config = ConfigDict(populate_by_name=True)


# Resource configuration
class Resources(BaseModel):
    cpu_cores: int = Field(default=4, ge=1, le=32, alias="cpuCores")
    ram_gb: int = Field(default=4, ge=1, le=64, alias="ramGB")
    justification: str | None = None

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_justification(self):
        if (self.cpu_cores > 4 or self.ram_gb > 4) and not self.justification:
            raise ValueError(
                "Justification is required when requesting more than default resources"
            )
        return self


# Firewall configuration
class AdditionalPort(BaseModel):
    port: int = Field(..., ge=1, le=65535)
    protocol: Protocol
    reason: str = Field(..., min_length=1)
    public_access: bool = Field(default=False, alias="publicAccess")
    public_justification: str | None = Field(None, alias="publicJustification")

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_public_justification(self):
        if self.public_access and not self.public_justification:
            raise ValueError("Justification is required for publicly accessible ports")
        return self


class Firewall(BaseModel):
    default_ports: bool = Field(default=True, alias="defaultPorts")
    additional_ports: list[AdditionalPort] = Field(default_factory=list, alias="additionalPorts")

    model_config = ConfigDict(populate_by_name=True)


# SSH Key configuration
class SSHKeyExisting(BaseModel):
    type: Literal["existing"]
    key_id: str = Field(..., min_length=1, alias="keyId")

    model_config = ConfigDict(populate_by_name=True)


class SSHKeyNew(BaseModel):
    type: Literal["new"]
    name: str = Field(..., min_length=1, max_length=255)
    public_key: str = Field(..., min_length=1, alias="publicKey")

    model_config = ConfigDict(populate_by_name=True)


SSHKey = Annotated[SSHKeyExisting | SSHKeyNew, Field(discriminator="type")]


# VM Request schemas
class VMRequestCreate(BaseModel):
    hostname: str = Field(..., min_length=1, max_length=63)
    description: str = Field(..., min_length=10)
    project_type: ProjectType = Field(..., alias="projectType")

    # Project-specific details (only one should be populated based on project_type)
    ipraktikum: IPraktikumDetails | None = None
    thesis: ThesisDetails | None = None
    chair_project: ChairProjectDetails | None = Field(None, alias="chairProject")

    resources: Resources
    firewall: Firewall
    additional_users: list[str] = Field(default_factory=list, alias="additionalUsers")
    ssh_key: SSHKey = Field(..., alias="sshKey")
    additional_comments: str | None = Field(None, alias="additionalComments")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("hostname")
    @classmethod
    def validate_hostname(cls, v: str) -> str:
        pattern = r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$"
        if not re.match(pattern, v):
            raise ValueError(
                "Hostname must be lowercase alphanumeric with hyphens, no leading/trailing hyphens"
            )
        return v

    @model_validator(mode="after")
    def validate_project_details(self):
        if self.project_type == ProjectType.IPRAKTIKUM and not self.ipraktikum:
            raise ValueError("iPraktikum details are required for iPraktikum projects")
        if self.project_type == ProjectType.THESIS and not self.thesis:
            raise ValueError("Thesis details are required for thesis projects")
        if self.project_type == ProjectType.CHAIR_PROJECT and not self.chair_project:
            raise ValueError("Chair project details are required for chair projects")
        return self


class VMRequestResponse(BaseModel):
    id: uuid.UUID
    hostname: str
    description: str
    project_type: ProjectType
    project_details: dict
    cpu_cores: int
    ram_gb: int
    resource_justification: str | None
    default_ports_enabled: bool
    additional_ports: list[dict]
    additional_users: list[str]
    ssh_key_type: str
    additional_comments: str | None
    status: RequestStatus
    requester_username: str
    ticket_key: str | None = Field(validation_alias="jira_ticket_key")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def ticket_url(self) -> str | None:
        """Return the full URL to the ticket."""
        return settings.ticket_url(self.ticket_key)


class VMRequestListResponse(BaseModel):
    id: uuid.UUID
    hostname: str
    project_type: ProjectType
    status: RequestStatus
    requester_username: str
    ticket_key: str | None = Field(validation_alias="jira_ticket_key")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def ticket_url(self) -> str | None:
        """Return the full URL to the ticket."""
        return settings.ticket_url(self.ticket_key)
