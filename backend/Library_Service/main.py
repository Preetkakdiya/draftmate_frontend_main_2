from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from dotenv import load_dotenv
from database import engine, Base
from routers import clients, cases, hearings, calendar, video_links, case_tracking, notes, bookmarks

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="DraftMate Library Service", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Setup
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ALLOWED_ORIGINS = (
    ["*"]
    if ENVIRONMENT == "development"
    else [
        os.getenv("FRONTEND_URL_PROD", "https://draftmate.ai"),
        os.getenv("FRONTEND_URL_DEV", "http://localhost:5173"),
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "healthy", "service": "library"}


# Include routers with prefix /api/v1/library
app.include_router(clients.router, prefix="/api/v1/library")
app.include_router(cases.router, prefix="/api/v1/library")
app.include_router(hearings.router, prefix="/api/v1/library")
app.include_router(calendar.router, prefix="/api/v1/library")
app.include_router(video_links.router, prefix="/api/v1/library")
app.include_router(case_tracking.router, prefix="/api/v1/library")
app.include_router(notes.router, prefix="/api/v1/library")
app.include_router(bookmarks.router, prefix="/api/v1/library")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
