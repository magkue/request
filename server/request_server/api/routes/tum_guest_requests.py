"""TUM Guest Account Request API routes."""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from request_server.core.config import settings
from request_server.core.security import CurrentUser, get_current_user, get_optional_current_user
from request_server.db.session import get_db
from request_server.models.request_status import (
    EDITABLE_STATUSES,
    WITHDRAWABLE_STATUSES,
    RequestStatus,
)
from request_server.models.tum_guest_request import Gender as GenderModel
from request_server.models.tum_guest_request import GuestType as GuestTypeModel
from request_server.models.tum_guest_request import TUMGuestRequest as TUMGuestRequestModel
from request_server.schemas.tum_guest_request import (
    ArtemisDetails,
    GuestType,
    IPraktikumDetails,
    OtherDetails,
    TUMGuestRequestCreateAnonymous,
    TUMGuestRequestCreateAuthenticated,
    TUMGuestRequestListResponse,
    TUMGuestRequestResponse,
    TUMGuestRequestUpdate,
)
from request_server.services.descriptions.tum_guest_request import (
    handle_tum_guest_ticket_creation,
)
from request_server.services.ticket import get_ticket_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tum-guest-requests", tags=["TUM Guest Requests"])


def _extract_guest_type_details(
    guest_type: GuestType,
    ipraktikum_fields: IPraktikumDetails | None,
    artemis_fields: ArtemisDetails | None,
    other_fields: OtherDetails | None,
) -> dict:
    """Extract guest type specific details based on guest type."""
    if guest_type == GuestType.IPRAKTIKUM_CUSTOMER and ipraktikum_fields:
        return {
            "team_name": ipraktikum_fields.team_name,
            "coach_name": ipraktikum_fields.coach_name,
        }
    elif guest_type == GuestType.ARTEMIS and artemis_fields:
        return {"university_or_company": artemis_fields.university_or_company}
    elif guest_type == GuestType.OTHER and other_fields:
        return {"reason": other_fields.reason}
    return {}


@router.post(
    "",
    response_model=TUMGuestRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_tum_guest_request(
    request: TUMGuestRequestCreateAnonymous | TUMGuestRequestCreateAuthenticated,
    current_user: Annotated[CurrentUser | None, Depends(get_optional_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TUMGuestRequestModel:
    """
    Create a new TUM Guest Account request.

    This endpoint supports both authenticated and anonymous requests:
    - Authenticated users: Request guest accounts for others (they already have a TUM account)
    - Anonymous users: Request guest accounts for themselves or others
    """
    is_authenticated = current_user is not None

    # Extract guest type details
    guest_type_details = _extract_guest_type_details(
        request.guest_type,
        getattr(request, "ipraktikum_fields", None),
        getattr(request, "artemis_fields", None),
        getattr(request, "other_fields", None),
    )

    # Create the TUM guest request
    guest_request = TUMGuestRequestModel(
        # Requester info (if authenticated)
        requester_id=current_user.id if current_user else None,
        requester_username=current_user.username if current_user else None,
        requester_name=current_user.full_name if current_user else None,
        requester_email=current_user.email if current_user else None,
        # Authentication flags
        is_authenticated_request=is_authenticated,
        requesting_for_self=(
            getattr(request, "requesting_for_self", False) if not is_authenticated else False
        ),
        # Guest info
        guest_first_name=request.first_name,
        guest_last_name=request.last_name,
        guest_email=request.email,
        guest_birth_date=request.birth_date,
        guest_gender=GenderModel(request.gender.value),
        guest_nationality=request.nationality,
        # Contact person (required for anonymous, optional for authenticated)
        contact_person=getattr(request, "contact_person", None),
        # Guest type
        guest_type=GuestTypeModel(request.guest_type.value),
        guest_type_details=guest_type_details,
        # Additional info
        additional_comments=request.additional_comments,
    )

    db.add(guest_request)
    await db.commit()
    await db.refresh(guest_request)

    # Create ticket in the configured ticket system
    try:
        ticket_key = await handle_tum_guest_ticket_creation(
            get_ticket_service(),
            guest_request,
            is_authenticated=is_authenticated,
            requester_username=current_user.username if current_user else None,
        )
        if ticket_key:
            guest_request.jira_ticket_key = ticket_key
            await db.commit()
            await db.refresh(guest_request)
            logger.info(f"Created ticket {ticket_key} for TUM guest request {guest_request.id}")
        elif settings.ticket_system != "debug":
            logger.warning(f"Failed to create ticket for TUM guest request {guest_request.id}")
    except Exception as e:
        logger.error(f"Error creating ticket for TUM guest request {guest_request.id}: {e}")
        # Don't fail the request if ticket creation fails

    return guest_request


@router.get("", response_model=list[TUMGuestRequestListResponse])
async def list_tum_guest_requests(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[TUMGuestRequestModel]:
    """
    List all TUM guest requests for the current user.

    Only returns requests created by the authenticated user.
    Admin users can see all requests.
    """
    if current_user.is_admin:
        query = select(TUMGuestRequestModel).order_by(TUMGuestRequestModel.created_at.desc())
    else:
        query = (
            select(TUMGuestRequestModel)
            .where(TUMGuestRequestModel.requester_id == current_user.id)
            .order_by(TUMGuestRequestModel.created_at.desc())
        )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{request_id}", response_model=TUMGuestRequestResponse)
async def get_tum_guest_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TUMGuestRequestModel:
    """Get a specific TUM guest request."""
    query = select(TUMGuestRequestModel).where(TUMGuestRequestModel.id == request_id)
    result = await db.execute(query)
    guest_request = result.scalar_one_or_none()

    if not guest_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TUM guest request not found",
        )

    # Check if user is authorized to view this request
    if guest_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this request",
        )

    return guest_request


@router.patch("/{request_id}", response_model=TUMGuestRequestResponse)
async def update_tum_guest_request(
    request_id: uuid.UUID,
    update_data: TUMGuestRequestUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TUMGuestRequestModel:
    """Update a TUM guest request. Only allowed when status is editable."""
    query = select(TUMGuestRequestModel).where(TUMGuestRequestModel.id == request_id)
    result = await db.execute(query)
    guest_request = result.scalar_one_or_none()

    if not guest_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="TUM guest request not found"
        )
    if guest_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if guest_request.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot update a request with status '{guest_request.status}'",
        )

    update_dict = update_data.model_dump(exclude_unset=True)

    # Handle nested transforms: guest_type -> guest_type_details
    if "guest_type" in update_dict:
        guest_type_details = _extract_guest_type_details(
            update_data.guest_type,
            update_data.ipraktikum_fields,
            update_data.artemis_fields,
            update_data.other_fields,
        )
        guest_request.guest_type_details = guest_type_details
        update_dict.pop("ipraktikum_fields", None)
        update_dict.pop("artemis_fields", None)
        update_dict.pop("other_fields", None)
        guest_request.guest_type = GuestTypeModel(update_dict.pop("guest_type"))
    else:
        update_dict.pop("ipraktikum_fields", None)
        update_dict.pop("artemis_fields", None)
        update_dict.pop("other_fields", None)

    # Map schema field names to model field names
    if "first_name" in update_dict:
        guest_request.guest_first_name = update_dict.pop("first_name")
    if "last_name" in update_dict:
        guest_request.guest_last_name = update_dict.pop("last_name")
    if "email" in update_dict:
        guest_request.guest_email = update_dict.pop("email")
    if "birth_date" in update_dict:
        guest_request.guest_birth_date = update_dict.pop("birth_date")
    if "gender" in update_dict:
        guest_request.guest_gender = GenderModel(update_dict.pop("gender"))
    if "nationality" in update_dict:
        guest_request.guest_nationality = update_dict.pop("nationality")

    # Apply remaining simple fields (contact_person, additional_comments)
    for field, value in update_dict.items():
        if hasattr(guest_request, field):
            setattr(guest_request, field, value)

    await db.commit()
    await db.refresh(guest_request)
    return guest_request


@router.post("/{request_id}/withdraw", response_model=TUMGuestRequestResponse)
async def withdraw_tum_guest_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TUMGuestRequestModel:
    """Withdraw a TUM guest request. Only allowed when status is not completed."""
    query = select(TUMGuestRequestModel).where(TUMGuestRequestModel.id == request_id)
    result = await db.execute(query)
    guest_request = result.scalar_one_or_none()

    if not guest_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="TUM guest request not found"
        )
    if guest_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if guest_request.status not in WITHDRAWABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot withdraw a request with status '{guest_request.status}'",
        )

    guest_request.status = RequestStatus.WITHDRAWN
    await db.commit()
    await db.refresh(guest_request)
    return guest_request


@router.post("/{request_id}/reopen", response_model=TUMGuestRequestResponse)
async def reopen_tum_guest_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TUMGuestRequestModel:
    """Reopen a withdrawn TUM guest request. Sets status back to OPEN."""
    query = select(TUMGuestRequestModel).where(TUMGuestRequestModel.id == request_id)
    result = await db.execute(query)
    guest_request = result.scalar_one_or_none()

    if not guest_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="TUM guest request not found"
        )
    if guest_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if guest_request.status != RequestStatus.WITHDRAWN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only reopen withdrawn requests",
        )

    guest_request.status = RequestStatus.OPEN
    await db.commit()
    await db.refresh(guest_request)
    return guest_request
