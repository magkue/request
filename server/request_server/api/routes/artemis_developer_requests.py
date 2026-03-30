"""Artemis Developer Access Request API routes."""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from request_server.core.config import settings
from request_server.core.security import CurrentUser, get_current_user, get_optional_current_user
from request_server.db.session import get_db
from request_server.models.artemis_developer_request import (
    ArtemisDeveloperRequest as ArtemisDeveloperRequestModel,
)
from request_server.models.request_status import (
    EDITABLE_STATUSES,
    WITHDRAWABLE_STATUSES,
    RequestStatus,
)
from request_server.schemas.artemis_developer_request import (
    ArtemisDeveloperRequestCreateAnonymous,
    ArtemisDeveloperRequestCreateAuthenticated,
    ArtemisDeveloperRequestListResponse,
    ArtemisDeveloperRequestResponse,
    ArtemisDeveloperRequestUpdate,
)
from request_server.services.descriptions.artemis_developer_request import (
    handle_artemis_ticket_creation,
)
from request_server.services.ticket import get_ticket_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/artemis-developer-requests", tags=["Artemis Developer Requests"])


@router.post(
    "",
    response_model=ArtemisDeveloperRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_artemis_developer_request(
    request: ArtemisDeveloperRequestCreateAnonymous | ArtemisDeveloperRequestCreateAuthenticated,
    current_user: Annotated[CurrentUser | None, Depends(get_optional_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ArtemisDeveloperRequestModel:
    """
    Create a new Artemis Developer Access request.

    This endpoint supports both authenticated and anonymous requests:
    - Authenticated users: User info comes from token
    - Anonymous users: Must provide name and email in request
    """
    is_authenticated = current_user is not None

    # Extract GitHub info if provided
    github_info = getattr(request, "github_info", None)

    # Create the Artemis developer request
    artemis_request = ArtemisDeveloperRequestModel(
        # Requester info (if authenticated)
        requester_id=current_user.id if current_user else None,
        requester_username=current_user.username if current_user else None,
        requester_name=current_user.full_name if current_user else None,
        requester_email=current_user.email if current_user else None,
        # Authentication flag
        is_authenticated_request=is_authenticated,
        # Anonymous user info
        anonymous_name=getattr(request, "name", None) if not is_authenticated else None,
        anonymous_email=getattr(request, "main_email", None) if not is_authenticated else None,
        # GitHub info
        github_username=request.github_username,
        github_user_id=github_info.id if github_info else None,
        github_avatar_url=github_info.avatar_url if github_info else None,
        github_profile_url=github_info.html_url if github_info else None,
        github_name=github_info.name if github_info else None,
        github_verified=True,  # Always true since we verify client-side
        # Artemis details
        slack_email=request.slack_email,
        contact_person=request.contact_person,
        advisor=request.advisor,
        subteams=request.subteams,
        other_subteam=request.other_subteam,
        # Additional info
        additional_comments=request.additional_comments,
    )

    db.add(artemis_request)
    await db.commit()
    await db.refresh(artemis_request)

    # Create ticket in the configured ticket system
    try:
        ticket_key = await handle_artemis_ticket_creation(
            get_ticket_service(),
            artemis_request,
            is_authenticated=is_authenticated,
            requester_username=current_user.username if current_user else None,
        )
        if ticket_key:
            artemis_request.jira_ticket_key = ticket_key
            await db.commit()
            await db.refresh(artemis_request)
            logger.info(
                f"Created ticket {ticket_key} for Artemis developer request {artemis_request.id}"
            )
        elif settings.ticket_system != "debug":
            logger.warning(
                f"Failed to create ticket for Artemis developer request {artemis_request.id}"
            )
    except Exception as e:
        logger.error(
            f"Error creating ticket for Artemis developer request {artemis_request.id}: {e}"
        )
        # Don't fail the request if ticket creation fails

    return artemis_request


@router.get("", response_model=list[ArtemisDeveloperRequestListResponse])
async def list_artemis_developer_requests(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ArtemisDeveloperRequestModel]:
    """
    List all Artemis developer requests for the current user.

    Only returns requests created by the authenticated user.
    Admin users can see all requests.
    """
    if current_user.is_admin:
        query = select(ArtemisDeveloperRequestModel).order_by(
            ArtemisDeveloperRequestModel.created_at.desc()
        )
    else:
        query = (
            select(ArtemisDeveloperRequestModel)
            .where(ArtemisDeveloperRequestModel.requester_id == current_user.id)
            .order_by(ArtemisDeveloperRequestModel.created_at.desc())
        )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{request_id}", response_model=ArtemisDeveloperRequestResponse)
async def get_artemis_developer_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ArtemisDeveloperRequestModel:
    """Get a specific Artemis developer request."""
    query = select(ArtemisDeveloperRequestModel).where(
        ArtemisDeveloperRequestModel.id == request_id
    )
    result = await db.execute(query)
    artemis_request = result.scalar_one_or_none()

    if not artemis_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artemis developer request not found",
        )

    # Check if user is authorized to view this request
    if artemis_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this request",
        )

    return artemis_request


@router.patch("/{request_id}", response_model=ArtemisDeveloperRequestResponse)
async def update_artemis_developer_request(
    request_id: uuid.UUID,
    update_data: ArtemisDeveloperRequestUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ArtemisDeveloperRequestModel:
    """Update an Artemis developer request. Only allowed when status is editable."""
    query = select(ArtemisDeveloperRequestModel).where(
        ArtemisDeveloperRequestModel.id == request_id
    )
    result = await db.execute(query)
    artemis_request = result.scalar_one_or_none()

    if not artemis_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artemis developer request not found",
        )
    if artemis_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if artemis_request.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot update a request with status '{artemis_request.status}'",
        )

    update_dict = update_data.model_dump(exclude_unset=True)

    # Apply simple fields
    for field, value in update_dict.items():
        if hasattr(artemis_request, field):
            setattr(artemis_request, field, value)

    await db.commit()
    await db.refresh(artemis_request)
    return artemis_request


@router.post("/{request_id}/withdraw", response_model=ArtemisDeveloperRequestResponse)
async def withdraw_artemis_developer_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ArtemisDeveloperRequestModel:
    """Withdraw an Artemis developer request. Only allowed when status is not completed."""
    query = select(ArtemisDeveloperRequestModel).where(
        ArtemisDeveloperRequestModel.id == request_id
    )
    result = await db.execute(query)
    artemis_request = result.scalar_one_or_none()

    if not artemis_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artemis developer request not found",
        )
    if artemis_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if artemis_request.status not in WITHDRAWABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot withdraw a request with status '{artemis_request.status}'",
        )

    artemis_request.status = RequestStatus.WITHDRAWN
    await db.commit()
    await db.refresh(artemis_request)
    return artemis_request


@router.post("/{request_id}/reopen", response_model=ArtemisDeveloperRequestResponse)
async def reopen_artemis_developer_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ArtemisDeveloperRequestModel:
    """Reopen a withdrawn Artemis developer request. Sets status back to OPEN."""
    query = select(ArtemisDeveloperRequestModel).where(
        ArtemisDeveloperRequestModel.id == request_id
    )
    result = await db.execute(query)
    artemis_request = result.scalar_one_or_none()

    if not artemis_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artemis developer request not found",
        )
    if artemis_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if artemis_request.status != RequestStatus.WITHDRAWN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only reopen withdrawn requests",
        )

    artemis_request.status = RequestStatus.OPEN
    await db.commit()
    await db.refresh(artemis_request)
    return artemis_request
