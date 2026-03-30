"""Support Request schemas."""

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field

from request_server.core.config import settings
from request_server.models.request_status import RequestStatus


class SupportCategory(StrEnum):
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    QUESTION = "question"
    OTHER = "other"


CATEGORY_LABELS = {
    "bug": "Bug Report",
    "feature_request": "Feature Request",
    "question": "Question",
    "other": "Other",
}


# Request schemas
class SupportRequestCreateAuthenticated(BaseModel):
    """Schema for logged-in users creating a support request."""

    subject: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    category: SupportCategory

    model_config = ConfigDict(populate_by_name=True)


class SupportRequestCreateAnonymous(BaseModel):
    """Schema for anonymous users creating a support request."""

    full_name: str = Field(..., min_length=1, alias="fullName")
    email: EmailStr
    tum_id: str | None = Field(None, alias="tumId")

    subject: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    category: SupportCategory

    model_config = ConfigDict(populate_by_name=True)


class SupportRequestResponse(BaseModel):
    """Schema for support request response."""

    id: uuid.UUID
    is_authenticated_request: bool

    # Requester info
    requester_username: str | None
    requester_name: str | None
    requester_email: str | None

    # Anonymous user info
    anonymous_name: str | None
    anonymous_email: str | None
    anonymous_tum_id: str | None

    # Support details
    subject: str
    description: str
    category: SupportCategory

    # Status
    status: RequestStatus

    # Ticket
    ticket_key: str | None = Field(validation_alias="jira_ticket_key")

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def ticket_url(self) -> str | None:
        """Return the full URL to the ticket."""
        return settings.ticket_url(self.ticket_key)


class SupportRequestUpdate(BaseModel):
    """Schema for updating a support request (PATCH). All fields optional."""

    subject: str | None = Field(None, min_length=5, max_length=255)
    description: str | None = Field(None, min_length=10)
    category: SupportCategory | None = None

    model_config = ConfigDict(populate_by_name=True)


class SupportRequestListResponse(BaseModel):
    """Schema for support request list response."""

    id: uuid.UUID
    is_authenticated_request: bool
    requester_username: str | None
    anonymous_name: str | None
    subject: str
    category: SupportCategory
    status: RequestStatus
    ticket_key: str | None = Field(validation_alias="jira_ticket_key")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def ticket_url(self) -> str | None:
        """Return the full URL to the ticket."""
        return settings.ticket_url(self.ticket_key)
