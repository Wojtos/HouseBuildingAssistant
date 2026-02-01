"""
HomeBuild AI Assistant - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import documents, facts, messages, profiles, project_memory, projects
from app.core.config import settings

app = FastAPI(
    title=settings.api_title,
    description="Backend API for HomeBuild AI Assistant",
    version=settings.api_version,
    # Disable automatic trailing slash redirects to avoid CORS issues
    # FastAPI's 307 redirects don't work well with CORS preflight requests
    redirect_slashes=False,
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(projects.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(profiles.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(project_memory.router, prefix="/api")
app.include_router(facts.router, prefix="/api")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "HomeBuild AI Assistant API", "status": "healthy"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}
