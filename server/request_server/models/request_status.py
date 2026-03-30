"""Shared request status enum used by all request types."""

import enum


class RequestStatus(enum.StrEnum):
    OPEN = "open"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"


# Statuses that allow editing and withdrawing
EDITABLE_STATUSES = frozenset(
    {
        RequestStatus.OPEN,
        RequestStatus.APPROVED,
        RequestStatus.REJECTED,
        RequestStatus.IN_PROGRESS,
    }
)

WITHDRAWABLE_STATUSES = EDITABLE_STATUSES
