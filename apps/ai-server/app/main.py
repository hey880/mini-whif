import os
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config.settings import settings
from .routes import chat, feedback

# 로그 디렉토리 생성
log_dir = Path(__file__).parent.parent / 'logs'
log_dir.mkdir(exist_ok=True)

# 로그 레벨 (환경변수로 제어)
log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# 핸들러 설정
handlers = [logging.StreamHandler()]  # stdout

if os.getenv('NODE_ENV') == 'production':
    # 프로덕션: 파일 핸들러 추가 (10MB마다 로테이션, 최대 7개 파일)
    file_handler = RotatingFileHandler(
        log_dir / 'ai-server.log',
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=7,              # ai-server.log.1 ~ ai-server.log.7
        encoding='utf-8'
    )
    file_handler.setFormatter(logging.Formatter(log_format))
    handlers.append(file_handler)

# Configure logging
logging.basicConfig(
    level=getattr(logging, log_level),
    format=log_format,
    handlers=handlers
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
