#!/bin/bash

# HouseBuildingAssistant Quick Start Script
# This script sets up and starts the development environment

set -e

echo "🏗️  HouseBuildingAssistant - Quick Start"
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Start Supabase if not already running
echo "📦 Starting Supabase..."
if supabase status &> /dev/null; then
    echo "✅ Supabase is already running"
else
    supabase start
fi

echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    
    # Get ANON_KEY from Supabase
    ANON_KEY=$(supabase status -o env 2>/dev/null | grep "ANON_KEY=" | cut -d'"' -f2)
    
    if [ -z "$ANON_KEY" ]; then
        echo "⚠️  Could not get ANON_KEY from Supabase. Using placeholder."
        ANON_KEY="your-anon-key-here"
    fi
    
    cat > .env << EOF
# Supabase Configuration
# Docker containers use host.docker.internal to access host services
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_KEY=$ANON_KEY

# OpenRouter Configuration (optional)
OPENROUTER_API_KEY=your-openrouter-api-key-here

# CORS Origins
CORS_ORIGINS=http://localhost:4001
EOF
    
    echo "✅ Created .env file"
    
    if [ "$ANON_KEY" = "your-anon-key-here" ]; then
        echo "⚠️  Please update SUPABASE_KEY in .env file"
        echo "   Run: supabase status -o env | grep ANON_KEY"
    fi
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🚀 Starting Docker Compose..."
echo ""
echo "Services will be available at:"
echo "  - Backend API:  http://localhost:5001"
echo "  - Backend Docs: http://localhost:5001/docs"
echo "  - Frontend:     http://localhost:4001"
echo "  - Supabase:     http://127.0.0.1:54323"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start Docker Compose
docker-compose up --build

