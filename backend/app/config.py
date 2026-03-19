"""DataAgent configuration — loads environment variables via pydantic-settings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # Azure OpenAI
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_DEPLOYMENT_NAME: str = "gpt-4o"
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: str = "text-embedding-3-large"

    # Azure AI Search
    AZURE_SEARCH_ENDPOINT: str = ""
    AZURE_SEARCH_KEY: str = ""
    AZURE_SEARCH_INDEX_BOOKS: str = "books-index"
    AZURE_SEARCH_INDEX_SCHEMA: str = "schema-index"

    # Data API Builder — per-tenant endpoints
    DAB_BASE_URL: str = "http://localhost:5000"
    DAB_BASE_URL_EMPRESA_A: str = "http://dataagent-dab-empresa-a"
    DAB_BASE_URL_EMPRESA_B: str = "http://dataagent-dab-empresa-b"

    # Firebase
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-credentials.json"
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""  # JSON string injected via env var

    # Application
    FRONTEND_URL: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


# Singleton instance
settings = Settings()
