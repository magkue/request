"""TUM Guest Account Request schemas."""

import uuid
from datetime import date, datetime
from enum import StrEnum

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    computed_field,
    field_validator,
    model_validator,
)

from request_server.core.config import settings
from request_server.models.request_status import RequestStatus


class GuestType(StrEnum):
    IPRAKTIKUM_CUSTOMER = "ipraktikum-customer"
    ARTEMIS = "artemis"
    OTHER = "other"


class Gender(StrEnum):
    MALE = "male"
    FEMALE = "female"
    DIVERSE = "diverse"


# Guest type specific details
class IPraktikumDetails(BaseModel):
    team_name: str = Field(..., min_length=1, alias="teamName")
    coach_name: str = Field(..., min_length=1, alias="coachName")

    model_config = ConfigDict(populate_by_name=True)


class ArtemisDetails(BaseModel):
    university_or_company: str = Field(..., min_length=1, alias="universityOrCompany")

    model_config = ConfigDict(populate_by_name=True)


class OtherDetails(BaseModel):
    reason: str = Field(..., min_length=10)

    model_config = ConfigDict(populate_by_name=True)


# Base fields for guest info
class GuestInfo(BaseModel):
    first_name: str = Field(..., min_length=1, alias="firstName")
    last_name: str = Field(..., min_length=1, alias="lastName")
    email: EmailStr
    birth_date: date = Field(..., alias="birthDate")
    gender: Gender
    nationality: str = Field(..., min_length=1)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v: date) -> date:
        from datetime import date as date_type

        today = date_type.today()
        min_age_date = date_type(today.year - 16, today.month, today.day)

        if v > min_age_date:
            raise ValueError("Guest must be at least 16 years old")
        if v < date_type(1900, 1, 1):
            raise ValueError("Invalid birth date")
        return v


# Request schemas for logged-in users
class TUMGuestRequestCreateAuthenticated(GuestInfo):
    """Schema for logged-in users creating a guest request (for someone else)."""

    guest_type: GuestType = Field(..., alias="guestType")

    # Guest type specific fields
    ipraktikum_fields: IPraktikumDetails | None = Field(None, alias="ipraktikumFields")
    artemis_fields: ArtemisDetails | None = Field(None, alias="artemisFields")
    other_fields: OtherDetails | None = Field(None, alias="otherFields")

    additional_comments: str | None = Field(None, alias="additionalComments")

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_guest_type_fields(self):
        if self.guest_type == GuestType.IPRAKTIKUM_CUSTOMER and not self.ipraktikum_fields:
            raise ValueError("iPraktikum fields are required for iPraktikum Customer guest type")
        if self.guest_type == GuestType.ARTEMIS and not self.artemis_fields:
            raise ValueError("Artemis fields are required for Artemis guest type")
        if self.guest_type == GuestType.OTHER and not self.other_fields:
            raise ValueError("Other fields are required for Other guest type")
        return self


# Request schema for anonymous users
class TUMGuestRequestCreateAnonymous(GuestInfo):
    """Schema for anonymous users creating a guest request."""

    requesting_for_self: bool = Field(..., alias="requestingForSelf")
    contact_person: str = Field(..., min_length=1, alias="contactPerson")

    guest_type: GuestType = Field(..., alias="guestType")

    # Guest type specific fields
    ipraktikum_fields: IPraktikumDetails | None = Field(None, alias="ipraktikumFields")
    artemis_fields: ArtemisDetails | None = Field(None, alias="artemisFields")
    other_fields: OtherDetails | None = Field(None, alias="otherFields")

    additional_comments: str | None = Field(None, alias="additionalComments")

    model_config = ConfigDict(populate_by_name=True)

    @model_validator(mode="after")
    def validate_guest_type_fields(self):
        if self.guest_type == GuestType.IPRAKTIKUM_CUSTOMER and not self.ipraktikum_fields:
            raise ValueError("iPraktikum fields are required for iPraktikum Customer guest type")
        if self.guest_type == GuestType.ARTEMIS and not self.artemis_fields:
            raise ValueError("Artemis fields are required for Artemis guest type")
        if self.guest_type == GuestType.OTHER and not self.other_fields:
            raise ValueError("Other fields are required for Other guest type")
        return self


class TUMGuestRequestResponse(BaseModel):
    """Schema for TUM guest request response."""

    id: uuid.UUID
    is_authenticated_request: bool
    requesting_for_self: bool

    # Guest info
    guest_first_name: str
    guest_last_name: str
    guest_email: str
    guest_birth_date: date
    guest_gender: Gender
    guest_nationality: str

    # Contact and type
    contact_person: str | None
    guest_type: GuestType
    guest_type_details: dict

    # Additional info
    additional_comments: str | None

    # Status
    status: RequestStatus

    # Requester info (if authenticated)
    requester_username: str | None

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


class TUMGuestRequestUpdate(BaseModel):
    """Schema for updating a TUM guest request (PATCH). All fields optional."""

    first_name: str | None = Field(None, min_length=1, alias="firstName")
    last_name: str | None = Field(None, min_length=1, alias="lastName")
    email: EmailStr | None = None
    birth_date: date | None = Field(None, alias="birthDate")
    gender: Gender | None = None
    nationality: str | None = Field(None, min_length=1)
    guest_type: GuestType | None = Field(None, alias="guestType")
    ipraktikum_fields: IPraktikumDetails | None = Field(None, alias="ipraktikumFields")
    artemis_fields: ArtemisDetails | None = Field(None, alias="artemisFields")
    other_fields: OtherDetails | None = Field(None, alias="otherFields")
    contact_person: str | None = Field(None, alias="contactPerson")
    additional_comments: str | None = Field(None, alias="additionalComments")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, v: date | None) -> date | None:
        if v is None:
            return v
        from datetime import date as date_type

        today = date_type.today()
        min_age_date = date_type(today.year - 16, today.month, today.day)

        if v > min_age_date:
            raise ValueError("Guest must be at least 16 years old")
        if v < date_type(1900, 1, 1):
            raise ValueError("Invalid birth date")
        return v


class TUMGuestRequestListResponse(BaseModel):
    """Schema for TUM guest request list response."""

    id: uuid.UUID
    guest_first_name: str
    guest_last_name: str
    guest_email: str
    guest_type: GuestType
    status: RequestStatus
    requester_username: str | None
    ticket_key: str | None = Field(validation_alias="jira_ticket_key")
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def ticket_url(self) -> str | None:
        """Return the full URL to the ticket."""
        return settings.ticket_url(self.ticket_key)
