from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    port: int = 8000
    host: str = "0.0.0.0"

    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # Database
    database_url: str

    # AI Providers (optional)
    anthropic_api_key: str = ""
    openrouter_api_key: str = ""

    # Langfuse (optional)
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    @property
    def has_openrouter(self) -> bool:
        """Check if OpenRouter is configured."""
        return bool(self.openrouter_api_key)

    @property
    def has_langfuse(self) -> bool:
        """Check if Langfuse is configured."""
        return bool(self.langfuse_public_key and self.langfuse_secret_key)


settings = Settings()
