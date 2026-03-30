"""VM Access Request API routes."""

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from request_server.api.routes.ssh_keys import parse_ssh_key
from request_server.core.config import settings
from request_server.core.security import CurrentUser, get_current_user
from request_server.db.session import get_db
from request_server.models.request_status import (
    EDITABLE_STATUSES,
    WITHDRAWABLE_STATUSES,
    RequestStatus,
)
from request_server.models.ssh_key import SSHKey
from request_server.models.vm_access_request import VMAccessRequest as VMAccessRequestModel
from request_server.schemas.vm_access_request import (
    SSHKeyExisting,
    SSHKeyNew,
    VMAccessRequestCreate,
    VMAccessRequestListResponse,
    VMAccessRequestResponse,
    VMAccessRequestUpdate,
)
from request_server.services.descriptions.vm_access_request import (
    handle_vm_access_ticket_creation,
)
from request_server.services.ticket import get_ticket_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vm-access-requests", tags=["VM Access Requests"])


@router.post(
    "",
    response_model=VMAccessRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_vm_access_request(
    request: VMAccessRequestCreate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VMAccessRequestModel:
    """Create a new VM access request."""
    # Handle SSH key - create new key in database if needed
    ssh_key = request.ssh_key
    ssh_key_type = ssh_key.type
    ssh_key_value = None
    ssh_public_key = None

    if isinstance(ssh_key, SSHKeyNew):
        # Parse and validate the SSH key
        try:
            key_type, fingerprint = parse_ssh_key(ssh_key.public_key)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid SSH key: {e}",
            ) from e

        ssh_public_key = ssh_key.public_key.strip()

        # Check if this key already exists for the user
        existing_query = select(SSHKey).where(
            SSHKey.owner_id == current_user.id,
            SSHKey.fingerprint == fingerprint,
        )
        existing = await db.execute(existing_query)
        existing_key = existing.scalar_one_or_none()

        if existing_key:
            # Key already exists, use its ID
            ssh_key_value = str(existing_key.id)
        else:
            # Create new SSH key
            new_ssh_key = SSHKey(
                owner_id=current_user.id,
                owner_username=current_user.username,
                name=ssh_key.name,
                public_key=ssh_public_key,
                fingerprint=fingerprint,
                key_type=key_type,
            )
            db.add(new_ssh_key)
            await db.flush()
            ssh_key_value = str(new_ssh_key.id)

    elif isinstance(ssh_key, SSHKeyExisting):
        # Verify the key exists and belongs to the user
        key_query = select(SSHKey).where(
            SSHKey.id == uuid.UUID(ssh_key.key_id),
            SSHKey.owner_id == current_user.id,
        )
        result = await db.execute(key_query)
        existing_key = result.scalar_one_or_none()

        if not existing_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected SSH key not found or does not belong to you",
            )

        ssh_key_value = ssh_key.key_id
        ssh_public_key = existing_key.public_key

    # Create the VM access request
    access_request = VMAccessRequestModel(
        requester_id=current_user.id,
        requester_username=current_user.username,
        requester_name=current_user.full_name,
        requester_email=current_user.email,
        hostname=request.hostname,
        justification=request.justification,
        contact_person=request.contact_person,
        ssh_key_type=ssh_key_type,
        ssh_key_value=ssh_key_value,
    )

    db.add(access_request)
    await db.commit()
    await db.refresh(access_request)

    # Create ticket in the configured ticket system
    try:
        ticket_key = await handle_vm_access_ticket_creation(
            get_ticket_service(), access_request, ssh_public_key
        )
        if ticket_key:
            access_request.jira_ticket_key = ticket_key
            await db.commit()
            await db.refresh(access_request)
            logger.info(f"Created ticket {ticket_key} for VM access request {access_request.id}")
        elif settings.ticket_system != "debug":
            logger.warning(f"Failed to create ticket for VM access request {access_request.id}")
    except Exception as e:
        logger.error(f"Error creating ticket for VM access request {access_request.id}: {e}")
        # Don't fail the request if ticket creation fails

    return access_request


@router.get("", response_model=list[VMAccessRequestListResponse])
async def list_vm_access_requests(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VMAccessRequestModel]:
    """List VM access requests. Admins see all requests, regular users see only their own."""
    if current_user.is_admin:
        query = select(VMAccessRequestModel).order_by(VMAccessRequestModel.created_at.desc())
    else:
        query = (
            select(VMAccessRequestModel)
            .where(VMAccessRequestModel.requester_id == current_user.id)
            .order_by(VMAccessRequestModel.created_at.desc())
        )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/{request_id}", response_model=VMAccessRequestResponse)
async def get_vm_access_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VMAccessRequestModel:
    """Get a specific VM access request."""
    query = select(VMAccessRequestModel).where(VMAccessRequestModel.id == request_id)
    result = await db.execute(query)
    access_request = result.scalar_one_or_none()

    if not access_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM access request not found",
        )

    # Check if user is authorized to view this request
    if access_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this request",
        )

    return access_request


@router.patch("/{request_id}", response_model=VMAccessRequestResponse)
async def update_vm_access_request(
    request_id: uuid.UUID,
    update_data: VMAccessRequestUpdate,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VMAccessRequestModel:
    """Update a VM access request. Only allowed when status is editable."""
    query = select(VMAccessRequestModel).where(VMAccessRequestModel.id == request_id)
    result = await db.execute(query)
    access_request = result.scalar_one_or_none()

    if not access_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM access request not found",
        )
    if access_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )
    if access_request.status not in EDITABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot update a request with status '{access_request.status}'",
        )

    update_dict = update_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        if hasattr(access_request, field):
            setattr(access_request, field, value)

    await db.commit()
    await db.refresh(access_request)
    return access_request


@router.post("/{request_id}/withdraw", response_model=VMAccessRequestResponse)
async def withdraw_vm_access_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VMAccessRequestModel:
    """Withdraw a VM access request. Only allowed when status is not completed."""
    query = select(VMAccessRequestModel).where(VMAccessRequestModel.id == request_id)
    result = await db.execute(query)
    access_request = result.scalar_one_or_none()

    if not access_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM access request not found",
        )
    if access_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )
    if access_request.status not in WITHDRAWABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot withdraw a request with status '{access_request.status}'",
        )

    access_request.status = RequestStatus.WITHDRAWN
    await db.commit()
    await db.refresh(access_request)
    return access_request


@router.post("/{request_id}/reopen", response_model=VMAccessRequestResponse)
async def reopen_vm_access_request(
    request_id: uuid.UUID,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VMAccessRequestModel:
    """Reopen a withdrawn VM access request. Sets status back to OPEN."""
    query = select(VMAccessRequestModel).where(VMAccessRequestModel.id == request_id)
    result = await db.execute(query)
    access_request = result.scalar_one_or_none()

    if not access_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="VM access request not found",
        )
    if access_request.requester_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized",
        )
    if access_request.status != RequestStatus.WITHDRAWN:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Can only reopen withdrawn requests",
        )

    access_request.status = RequestStatus.OPEN
    await db.commit()
    await db.refresh(access_request)
    return access_request
