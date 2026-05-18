import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config.settings import settings
from .routes import chat, feedback

# Initialize New Relic if license key is present
if os.getenv('NEW_RELIC_LICENSE_KEY'):
    try:
        import newrelic.agent
        config_file = os.path.join(os.path.dirname(__file__), '..', 'newrelic.ini')
        if os.path.exists(config_file):
            newrelic.agent.initialize(config_file)
            logging.info("New Relic monitoring enabled")
    except Exception as e:
        logging.warning(f"Failed to initialize New Relic: {e}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Persona Chat AI Server")
    logger.info(f"OpenRouter configured: {settings.has_openrouter}")
    logger.info(f"Langfuse configured: {settings.has_langfuse}")
    yield
    logger.info("Shutting down AI Server")


app = FastAPI(
    title="Persona Chat AI Service",
    description="AI streaming service with OpenRouter and Langfuse observability",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router)
app.include_router(feedback.router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "ok",
        "openrouter": "configured" if settings.has_openrouter else "not configured",
        "langfuse": "configured" if settings.has_langfuse else "not configured",
    }


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {
        "message": "Persona Chat AI Service",
        "version": "1.0.0",
        "docs": "/docs",
    }
