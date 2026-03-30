"""VM Access Request schemas."""

import re
import uuid
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from request_server.core.config import settings
from request_server.models.request_status import RequestStatus


# SSH Key configuration (same as VM request)
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


class VMAccessRequestCreate(BaseModel):
    """Schema for creating a new VM access request."""

    hostname: str = Field(..., min_length=1, max_length=63)
    justification: str = Field(..., min_length=10)
    contact_person: str | None = Field(None, alias="contactPerson")
    ssh_key: SSHKey = Field(..., alias="sshKey")

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


class VMAccessRequestResponse(BaseModel):
    """Schema for VM access request response."""

    id: uuid.UUID
    hostname: str
    justification: str
    contact_person: str | None
    ssh_key_type: str
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


class VMAccessRequestUpdate(BaseModel):
    """Schema for updating a VM access request (PATCH). All fields optional."""

    hostname: str | None = Field(None, min_length=1, max_length=63)
    justification: str | None = Field(None, min_length=10)
    contact_person: str | None = Field(None, alias="contactPerson")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("hostname")
    @classmethod
    def validate_hostname(cls, v: str | None) -> str | None:
        if v is None:
            return v
        pattern = r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$"
        if not re.match(pattern, v):
            raise ValueError(
                "Hostname must be lowercase alphanumeric with hyphens, no leading/trailing hyphens"
            )
        return v


class VMAccessRequestListResponse(BaseModel):
    """Schema for VM access request list response."""

    id: uuid.UUID
    hostname: str
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
