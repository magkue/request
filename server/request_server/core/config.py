from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

from request_server import __version__ as request_server_version

# Get the server root directory (where .env file lives)
SERVER_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVER_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "aet-request-server"
    app_version: str = request_server_version
    debug: bool = False
    auth_bypass: bool = False
    cors_origins: list[str] = [
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/aet_request"

    # Keycloak
    keycloak_url: str = "https://keycloak.example.com"
    keycloak_realm: str = "aet"
    keycloak_client_id: str = "aet-request"
    keycloak_admin_role: str = "admin"

    # Ticket System
    ticket_system: str = "jira"  # "jira", "redmine", "noop"
    secondary_reporter_field: str = "customfield_12200"
    service_account_name: str = ""

    # Jira
    jira_url: str = ""
    jira_username: str = ""
    jira_api_token: str = ""
    jira_project: str = ""

    # Redmine
    redmine_url: str = ""
    redmine_api_key: str = ""
    redmine_project: str = ""
    redmine_group_id: int = 0
    redmine_tracker_id: int = 0
    redmine_username: str = ""

    # GitLab
    gitlab_url: str = ""
    gitlab_token: str = ""

    # OpenTelemetry
    otel_service_name: str = "aet-request-server"
    otel_exporter_otlp_endpoint: str = ""
    otel_exporter_otlp_protocol: str = "grpc"
    otel_environment: str = "development"

    # Sentry
    sentry_dsn: str = ""

    @property
    def jira_enabled(self) -> bool:
        return bool(
            self.jira_url and self.jira_username and self.jira_api_token and self.jira_project
        )

    @property
    def redmine_enabled(self) -> bool:
        return bool(self.redmine_url and self.redmine_api_key and self.redmine_project)

    @property
    def ticket_system_enabled(self) -> bool:
        if self.ticket_system == "jira":
            return self.jira_enabled
        if self.ticket_system == "redmine":
            return self.redmine_enabled
        if self.ticket_system == "noop":
            return False
        return False

    def ticket_url(self, ticket_key: str | None) -> str | None:
        """Build the web URL for a ticket based on the active ticket system."""
        if not ticket_key:
            return None
        if self.ticket_system == "jira" and self.jira_url:
            return f"{self.jira_url.rstrip('/')}/browse/{ticket_key}"
        if self.ticket_system == "redmine" and self.redmine_url:
            return f"{self.redmine_url.rstrip('/')}/issues/{ticket_key}"
        return None

    @property
    def keycloak_issuer(self) -> str:
        return f"{self.keycloak_url}/realms/{self.keycloak_realm}"

    @property
    def keycloak_jwks_url(self) -> str:
        return f"{self.keycloak_issuer}/protocol/openid-connect/certs"


settings = Settings()
