"""
HomeBuild AI Assistant - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import projects

app = FastAPI(
    title=settings.api_title,
    description="Backend API for HomeBuild AI Assistant",
    version=settings.api_version,
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


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "HomeBuild AI Assistant API", "status": "healthy"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}

