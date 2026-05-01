"""Reusable markdown blocks for composing ticket descriptions.

All blocks produce standard Markdown. The ticket service adapter converts
to the target system's native format (e.g., Jira wiki markup) via formatters.
"""

from __future__ import annotations

from datetime import datetime

from request_server.services.crypto import generate_sha512_password

# ── Primitives ──────────────────────────────────────────────────────────────


def heading(level: int, text: str) -> str:
    """Markdown heading (level 1-6)."""
    return f"{'#' * level} {text}"


def field(label: str, value: str) -> str:
    """A bold-label: value pair."""
    return f"**{label}:** {value}"


def separator() -> str:
    """Horizontal rule."""
    return "---"


def warning_panel(text: str) -> str:
    """A warning/notice block.

    Rendered as a blockquote with WARNING prefix in Markdown.
    Converted to {panel:bgColor=#ffffcc} in Jira markup by the formatter.
    """
    return f"> **WARNING:** {text}"


def code_block(text: str) -> str:
    """Fenced code block."""
    return f"```\n{text}\n```"


def noformat_block(text: str) -> str:
    """Preformatted text block (no syntax highlighting).

    Uses a fenced block with 'text' language hint.
    Converted to {noformat} in Jira markup by the formatter.
    """
    return f"```text\n{text}\n```"


def italic(text: str) -> str:
    """Italic text."""
    return f"_{text}_"


def link(text: str, url: str) -> str:
    """Markdown link."""
    return f"[{text}]({url})"


def image(url: str, alt: str = "", width: int | None = None) -> str:
    """Image tag. Uses HTML when a width is specified for size control."""
    if width:
        return f'<img src="{url}" alt="{alt}" width="{width}">'
    return f"![{alt}]({url})"


# ── Shared Blocks ───────────────────────────────────────────────────────────


def requester_info_block(
    username: str | None,
    name: str | None,
    email: str | None,
    *,
    username_label: str = "Username",
) -> str:
    """Requester information for authenticated users.

    Used by: VM Request, VM Access, TUM Guest (auth), Artemis (auth).
    """
    return "\n".join(
        [
            field(username_label, username or "N/A"),
            field("Name", name or "N/A"),
            field("Email", email or "N/A"),
        ]
    )


def anonymous_requester_block(
    name: str | None,
    email: str | None,
    *,
    note: str = "This user does not have a TUM account.",
) -> str:
    """Requester information for anonymous users.

    Used by: TUM Guest (anon), Artemis (anon).
    """
    return "\n".join(
        [
            field("Name", name or "N/A"),
            field("Email", email or "N/A"),
            italic(note),
        ]
    )


def anonymous_notice_block(
    extra_message: str = "Please verify the request details carefully.",
) -> str:
    """Warning panel for anonymous submissions.

    Used by: TUM Guest, Artemis.
    """
    notice = (
        "**NOTICE:** This request was submitted by an **anonymous user** (not logged in).\n"
        f"{extra_message}"
    )
    return warning_panel(notice)


def footer_block(request_id: str, created_at: datetime) -> str:
    """Request metadata footer with ID and timestamp.

    Used by: ALL request types.
    """
    return "\n".join(
        [
            separator(),
            italic(f"Request ID: {request_id}"),
            italic(f"Created: {created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}"),
        ]
    )


def account_info_block(
    username: str,
    name: str | None,
    email: str | None,
    public_key: str | None,
) -> str:
    """Account information formatted for easy copy-paste.

    Generates a fresh SHA-512 password hash each time.
    Used by: VM Request, VM Access.
    """
    content = (
        f"{username}:\n"
        f"  name: {name or 'N/A'}\n"
        f"  email: {email or 'N/A'}\n"
        f"  pk: {public_key or 'N/A'}\n"
        f"  pw: {generate_sha512_password()}"
    )
    return code_block(content)


def comments_block(comments: str | None) -> str:
    """Additional comments section. Returns empty string if no comments.

    Used by: VM Request, TUM Guest, Artemis.
    """
    if not comments:
        return ""
    return "\n".join(
        [
            "",
            heading(3, "Additional Comments"),
            comments,
        ]
    )


def contact_person_block(contact_person: str | None) -> str:
    """Contact person field. Returns empty string if not provided.

    Used by: VM Access, TUM Guest (anon), Artemis.
    """
    if not contact_person:
        return ""
    return field("Contact Person", contact_person)


def ssh_key_block(key_type: str, key_value: str | None) -> str:
    """SSH key display.

    Used by: VM Request, VM Access.
    """
    if key_type == "existing":
        return field("SSH Key", f"Using existing key (ID: {key_value})")
    if key_type == "new":
        key_preview = (key_value[:50] + "...") if key_value else "N/A"
        return f"{field('SSH Key', 'New key provided')}\n{code_block(key_preview)}"
    return field("SSH Key Type", key_type)


def auto_comment_footer() -> str:
    """Standard footer for auto-generated comments."""
    return (
        f"\n\n{separator()}\n"
        f"{italic('This comment was automatically generated by the AET Request System.')}"
    )
