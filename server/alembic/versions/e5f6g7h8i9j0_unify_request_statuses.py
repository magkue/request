"""unify_request_statuses

Revision ID: e5f6g7h8i9j0
Revises: 42acfc44d8bc
Create Date: 2026-03-28 12:00:00.000000

"""

from collections.abc import Sequence
from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6g7h8i9j0"
down_revision: Union[str, None] = "42acfc44d8bc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# New unified enum values
UNIFIED_VALUES = ("open", "approved", "rejected", "in_progress", "completed", "withdrawn")

# All tables with a status column
TABLES = [
    "vm_requests",
    "vm_access_requests",
    "tum_guest_requests",
    "artemis_developer_requests",
    "support_requests",
]

# Old enum type names per table
OLD_ENUM_TYPES = [
    "requeststatus",
    "accessrequeststatus",
    "guestrequeststatus",
    "artemisrequeststatus",
    "supportrequeststatus",
]


def upgrade() -> None:
    # 1. Create the new unified enum type
    op.execute(
        "CREATE TYPE unified_requeststatus AS ENUM ("
        + ", ".join(f"'{v}'" for v in UNIFIED_VALUES)
        + ")"
    )

    # 2. Drop all defaults FIRST (defaults reference the old enum type and block ALTER TYPE)
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN status DROP DEFAULT")

    # 3. Migrate each table's status column to the new enum type
    # vm_requests (old enum values are UPPERCASE)
    op.execute("""
        ALTER TABLE vm_requests
        ALTER COLUMN status TYPE unified_requeststatus
        USING (
            CASE lower(status::text)
                WHEN 'pending' THEN 'open'
                ELSE lower(status::text)
            END
        )::unified_requeststatus
    """)

    # vm_access_requests (old enum values are UPPERCASE)
    op.execute("""
        ALTER TABLE vm_access_requests
        ALTER COLUMN status TYPE unified_requeststatus
        USING (
            CASE lower(status::text)
                WHEN 'pending' THEN 'open'
                ELSE lower(status::text)
            END
        )::unified_requeststatus
    """)

    # tum_guest_requests (old enum values are lowercase)
    op.execute("""
        ALTER TABLE tum_guest_requests
        ALTER COLUMN status TYPE unified_requeststatus
        USING (
            CASE status::text
                WHEN 'pending' THEN 'open'
                ELSE status::text
            END
        )::unified_requeststatus
    """)

    # artemis_developer_requests (old enum values are lowercase)
    op.execute("""
        ALTER TABLE artemis_developer_requests
        ALTER COLUMN status TYPE unified_requeststatus
        USING (
            CASE status::text
                WHEN 'pending' THEN 'open'
                ELSE status::text
            END
        )::unified_requeststatus
    """)

    # support_requests (old enum values are lowercase; resolved/closed -> completed)
    op.execute("""
        ALTER TABLE support_requests
        ALTER COLUMN status TYPE unified_requeststatus
        USING (
            CASE status::text
                WHEN 'pending' THEN 'open'
                WHEN 'resolved' THEN 'completed'
                WHEN 'closed' THEN 'completed'
                ELSE status::text
            END
        )::unified_requeststatus
    """)

    # 4. Set new defaults
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN status SET DEFAULT 'open'")

    # 5. Drop old enum types
    for old_type in OLD_ENUM_TYPES:
        op.execute(f"DROP TYPE IF EXISTS {old_type}")

    # 6. Rename unified type to the canonical name
    op.execute("ALTER TYPE unified_requeststatus RENAME TO requeststatus")


def downgrade() -> None:
    # Recreate old enum types
    op.execute(
        "CREATE TYPE old_requeststatus AS ENUM "
        "('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED')"
    )
    op.execute(
        "CREATE TYPE accessrequeststatus AS ENUM "
        "('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')"
    )
    op.execute(
        "CREATE TYPE guestrequeststatus AS ENUM "
        "('pending', 'approved', 'rejected', 'completed')"
    )
    op.execute(
        "CREATE TYPE artemisrequeststatus AS ENUM "
        "('pending', 'approved', 'rejected', 'completed')"
    )
    op.execute(
        "CREATE TYPE supportrequeststatus AS ENUM "
        "('pending', 'in_progress', 'resolved', 'closed')"
    )

    # Drop all defaults first
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN status DROP DEFAULT")

    # Revert vm_requests
    op.execute("""
        ALTER TABLE vm_requests
        ALTER COLUMN status TYPE old_requeststatus
        USING (
            CASE status::text
                WHEN 'open' THEN 'PENDING'
                WHEN 'withdrawn' THEN 'PENDING'
                ELSE upper(status::text)
            END
        )::old_requeststatus
    """)
    op.execute("ALTER TABLE vm_requests ALTER COLUMN status SET DEFAULT 'PENDING'")

    # Revert vm_access_requests
    op.execute("""
        ALTER TABLE vm_access_requests
        ALTER COLUMN status TYPE accessrequeststatus
        USING (
            CASE status::text
                WHEN 'open' THEN 'PENDING'
                WHEN 'in_progress' THEN 'PENDING'
                WHEN 'withdrawn' THEN 'PENDING'
                ELSE upper(status::text)
            END
        )::accessrequeststatus
    """)
    op.execute("ALTER TABLE vm_access_requests ALTER COLUMN status SET DEFAULT 'PENDING'")

    # Revert tum_guest_requests
    op.execute("""
        ALTER TABLE tum_guest_requests
        ALTER COLUMN status TYPE guestrequeststatus
        USING (
            CASE status::text
                WHEN 'open' THEN 'pending'
                WHEN 'in_progress' THEN 'pending'
                WHEN 'withdrawn' THEN 'pending'
                ELSE status::text
            END
        )::guestrequeststatus
    """)
    op.execute("ALTER TABLE tum_guest_requests ALTER COLUMN status SET DEFAULT 'pending'")

    # Revert artemis_developer_requests
    op.execute("""
        ALTER TABLE artemis_developer_requests
        ALTER COLUMN status TYPE artemisrequeststatus
        USING (
            CASE status::text
                WHEN 'open' THEN 'pending'
                WHEN 'in_progress' THEN 'pending'
                WHEN 'withdrawn' THEN 'pending'
                ELSE status::text
            END
        )::artemisrequeststatus
    """)
    op.execute("ALTER TABLE artemis_developer_requests ALTER COLUMN status SET DEFAULT 'pending'")

    # Revert support_requests
    op.execute("""
        ALTER TABLE support_requests
        ALTER COLUMN status TYPE supportrequeststatus
        USING (
            CASE status::text
                WHEN 'open' THEN 'pending'
                WHEN 'approved' THEN 'pending'
                WHEN 'rejected' THEN 'pending'
                WHEN 'completed' THEN 'resolved'
                WHEN 'withdrawn' THEN 'pending'
                ELSE status::text
            END
        )::supportrequeststatus
    """)
    op.execute("ALTER TABLE support_requests ALTER COLUMN status SET DEFAULT 'pending'")

    # Drop unified type and rename old back
    op.execute("DROP TYPE IF EXISTS requeststatus")
    op.execute("ALTER TYPE old_requeststatus RENAME TO requeststatus")
