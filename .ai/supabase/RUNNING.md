# Running the HouseBuildingAssistant Project

This guide explains how to run the project using Docker Compose.

## Prerequisites

1. **Docker & Docker Compose** installed
2. **Supabase CLI** installed (`brew install supabase/tap/supabase`)
3. **Node.js 20+** and **Python 3.12+** (for local development)

## Quick Start with Docker Compose

### Step 1: Start Supabase

Supabase runs on your host machine (not in Docker):

```bash
supabase start
```

This will start Supabase on:
- API URL: `http://127.0.0.1:54321`
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio: `http://127.0.0.1:54323`

### Step 2: Create Environment File

Create a `.env` file in the project root:

```bash
# Get the ANON_KEY from Supabase
supabase status -o env | grep ANON_KEY

# Create .env file
cat > .env << 'EOF'
# Supabase Configuration
# Docker containers use host.docker.internal to access host services
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_KEY=<paste-your-ANON_KEY-here>

# OpenRouter Configuration (optional)
OPENROUTER_API_KEY=your-openrouter-api-key-here

# CORS Origins
CORS_ORIGINS=http://localhost:4001
EOF
```

**Important**: Replace `<paste-your-ANON_KEY-here>` with the actual ANON_KEY from `supabase status -o env`.

### Step 3: Start the Application

```bash
make dev
```

This will:
- Build Docker images for frontend and backend
- Start both services
- Backend will be available at: `http://localhost:5001`
- Frontend will be available at: `http://localhost:4001`

## Available Make Commands

```bash
make help           # Show all available commands
make install        # Install dependencies (use --legacy-peer-deps for npm)
make dev            # Start development with Docker Compose
make backend        # Start only backend service
make frontend       # Start only frontend service
make down           # Stop all services
make clean          # Remove all containers, volumes, and images
make logs           # View logs from all services
```

## Testing the Backend

Once the services are running, test the backend:

### Health Check
```bash
curl http://localhost:5001/health
```

Expected response:
```json
{"status": "ok"}
```

### API Documentation
Visit the interactive API docs:
- Swagger UI: `http://localhost:5001/docs`
- ReDoc: `http://localhost:5001/redoc`

### Test Projects Endpoint
```bash
curl http://localhost:5001/api/projects
```

Expected response:
```json
[]
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Host Machine                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Supabase (Local)                                     │  │
│  │ - API: http://127.0.0.1:54321                        │  │
│  │ - DB:  postgresql://127.0.0.1:54322                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ▲                                  │
│                           │                                  │
│                           │ host.docker.internal             │
│                           │                                  │
│  ┌────────────────────────┴─────────────────────────────┐  │
│  │ Docker Network: homebuild-network                    │  │
│  │                                                       │  │
│  │  ┌──────────────────┐      ┌──────────────────┐     │  │
│  │  │ Backend          │      │ Frontend         │     │  │
│  │  │ Port: 5001       │◄─────┤ Port: 4001       │     │  │
│  │  │ FastAPI + Python │      │ Astro + React    │     │  │
│  │  └──────────────────┘      └──────────────────┘     │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### Issue: Backend fails with "supabase_url is required"

**Solution**: Make sure you created the `.env` file with the correct `SUPABASE_KEY`.

```bash
# Check if .env exists
cat .env

# Get the key from Supabase
supabase status -o env | grep ANON_KEY
```

### Issue: "Cannot connect to Supabase"

**Solution**: Ensure Supabase is running on the host:

```bash
supabase status
```

If not running:
```bash
supabase start
```

### Issue: Frontend npm install fails

**Solution**: Use `--legacy-peer-deps`:

```bash
cd frontend
npm install --legacy-peer-deps
```

Or update the Makefile (already done):
```bash
make install
```

### Issue: Port already in use

**Solution**: Stop existing services:

```bash
# Stop Docker services
make down

# Stop Supabase if needed
supabase stop

# Check what's using the port
lsof -i :5001  # Backend
lsof -i :4001  # Frontend
lsof -i :54321 # Supabase
```

### Issue: Docker can't access host.docker.internal

**Solution** (Linux only): Add to docker-compose.yml (already added):
```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

## Development Workflow

1. **Start Supabase**: `supabase start`
2. **Start services**: `make dev`
3. **Make changes**: Code changes auto-reload
4. **View logs**: `make logs` or check terminal
5. **Stop services**: `Ctrl+C` or `make down`

## Database Migrations

Apply new migrations:
```bash
supabase migration up
```

Create a new migration:
```bash
supabase migration new <migration_name>
```

## Environment Variables

### Backend (.env)
- `SUPABASE_URL`: Supabase API URL (use `host.docker.internal:54321` for Docker)
- `SUPABASE_KEY`: Supabase anon key (from `supabase status -o env`)
- `OPENROUTER_API_KEY`: OpenRouter API key for AI models
- `CORS_ORIGINS`: Allowed CORS origins (default: `http://localhost:4001`)

### Frontend (passed from .env)
- `PUBLIC_SUPABASE_URL`: Supabase API URL (use `localhost:54321` for browser)
- `PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

## Next Steps

1. **Test the API**: Visit `http://localhost:5001/docs`
2. **Test the Frontend**: Visit `http://localhost:4001`
3. **View Database**: Visit Supabase Studio at `http://127.0.0.1:54323`
4. **Start Building**: Add your features!

## Additional Resources

- [Backend Supabase Setup](backend/SUPABASE_PYTHON_GUIDE.md)
- [Supabase Documentation](https://supabase.com/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Astro Documentation](https://astro.build/)

