"""Support Request API routes."""

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
from request_server.models.support_request import (
    SupportRequest as SupportRequestModel,
)
from request_server.schemas.support_request import (
    SupportRequestCreateAnonymous,
    SupportRequestCreateAuthenticated,
    SupportRequestListResponse,
    SupportRequestResponse,
    SupportRequestUpdate,
)
from request_server.services.descriptions.support_request import (
    handle_support_ticket_creation,
)
from request_server.services.ticket import get_ticket_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support-requests", tags=["Support Requests"])


@router.post(
    "",
    response_model=SupportRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_support_request(
    request: SupportRequestCreateAnonymous | SupportRequestCreateAuthenticated,
    current_user: Annotated[CurrentUser | None, Depends(get_optional_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SupportRequestModel:
    """
    Create a new support request.

    This endpoint supports both authenticated and anonymous requests:
    - Authenticated users: User info comes from token
    - Anonymous users: Must provide name, email, and optionally TUM ID
    """
    is_authenticated = current_user is not None

    support_request = SupportRequestModel(
        # Requester info (if authenticated)
        requester_id=current_user.id if current_user else None,
        requester_username=current_user.username if current_user else None,
        requester_name=current_user.full_name if current_user else None,
        requester_email=current_user.email if current_user else None,
        # Authentication flag
        is_authenticated_request=is_authenticated,
        # Anonymous user info
        anonymous_name=getattr(request, "full_name", None) if not is_authenticated else None,
        anonymous_email=getattr(request, "email", None) if not is_authenticated else None,
        anonymous_tum_id=getattr(request, "tum_id", None) if not is_authenticated else None,
        # Support details
        subject=request.subject,
        description=request.description,
        category=request.category,
    )

    db.add(support_request)
    await db.commit()
    await db.refresh(support_request)

    # Create ticket in the configured ticket system
    try:
        ticket_key = await handle_support_ticket_creation(
            get_ticket_service(),
            support_request,
            is_authenticated=is_authenticated,
            requester_username=current_user.username if current_user else None,
        )
        if ticket_key:
            support_request.jira_ticket_key = ticket_key
            await db.commit()
            await db.refresh(support_request)
            logger.info(f"Created ticket {ticket_key} for support request {support_request.id}")
        elif settings.ticket_system != "debug":
            logger.warning(f"Failed to create ticket for support request {support_request.id}")
    except Exception as e:
        logger.error(f"Error creating ticket for support request {support_request.id}: {e}")
        # Don't fail the request if ticket creation fails

    return support_request


@router.get("", response_model=list[SupportRequestListResponse])
async def list_support_requests(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[SupportRequestModel]:
    """
    List all support requests for the current user.

    Only returns requests created by the authenticated user.
    Admin users can see all requests.
    """
    if current_user.is_admin:
        query = select(SupportRequestModel).order_by(SupportRequestModel.created_at.desc())
    else:
        query = (
            select(SupportRequestModel)
            .where(SupportRequestModel.requester_id == current_user.id)
            .order_by(SupportRequestModel.created_at.desc())
        )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{request_id}", response_model=SupportRequestResponse)
async def get_support_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SupportRequestModel:
    """Get a specific support request."""
    query = select(SupportRequestModel).where(SupportRequestModel.id == request_id)
    result = await db.execute(query)
    support_request = result.scalar_one_or_none()

    if not support_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Support request not found",
        )

    # Check if user is authorized to view this request
    if support_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this request",
        )

    return support_request


@router.patch("/{request_id}", response_model=SupportRequestResponse)
async def update_support_request(
    request_id: uuid.UUID,
    update_data: SupportRequestUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SupportRequestModel:
    """Update a support request. Only allowed when status is editable."""
    query = select(SupportRequestModel).where(SupportRequestModel.id == request_id)
    result = await db.execute(query)
    support_request = result.scalar_one_or_none()

    if not support_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Support request not found"
        )
    if support_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if support_request.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot update a request with status '{support_request.status}'",
        )

    update_dict = update_data.model_dump(exclude_unset=True)

    # Apply simple fields
    for field, value in update_dict.items():
        if hasattr(support_request, field):
            setattr(support_request, field, value)

    await db.commit()
    await db.refresh(support_request)
    return support_request


@router.post("/{request_id}/withdraw", response_model=SupportRequestResponse)
async def withdraw_support_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SupportRequestModel:
    """Withdraw a support request. Only allowed when status is not completed."""
    query = select(SupportRequestModel).where(SupportRequestModel.id == request_id)
    result = await db.execute(query)
    support_request = result.scalar_one_or_none()

    if not support_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Support request not found"
        )
    if support_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if support_request.status not in WITHDRAWABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot withdraw a request with status '{support_request.status}'",
        )

    support_request.status = RequestStatus.WITHDRAWN
    await db.commit()
    await db.refresh(support_request)
    return support_request


@router.post("/{request_id}/reopen", response_model=SupportRequestResponse)
async def reopen_support_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SupportRequestModel:
    """Reopen a withdrawn support request. Sets status back to OPEN."""
    query = select(SupportRequestModel).where(SupportRequestModel.id == request_id)
    result = await db.execute(query)
    support_request = result.scalar_one_or_none()

    if not support_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Support request not found"
        )
    if support_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if support_request.status != RequestStatus.WITHDRAWN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only reopen withdrawn requests",
        )

    support_request.status = RequestStatus.OPEN
    await db.commit()
    await db.refresh(support_request)
    return support_request
