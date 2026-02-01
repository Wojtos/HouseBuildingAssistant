LOL

# HomeBuild AI Assistant

An AI-powered assistant for home building projects, from plot selection to furnishing.

## Project Structure

```
.
├── frontend/          # Astro + React frontend application
├── backend/           # Python FastAPI backend application
├── docker-compose.yml # Docker Compose configuration
└── Makefile          # Project management commands
```

## Tech Stack

### Frontend
- **Astro 5** - Fast, efficient web framework
- **React 19** - Interactive components
- **TypeScript 5** - Static typing
- **Tailwind 4** - Styling
- **Shadcn/ui** - Component library

### Backend
- **Python** - Backend runtime
- **FastAPI** - Web framework
- **Supabase** - Authentication and PostgreSQL database
- **LangChain** - Agent orchestration
- **OpenRouter** - AI model access

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Make (optional, but recommended)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HouseBuildingAssistant
   ```

2. **Configure environment variables**
   
   Create `backend/.env` file with:
   ```env
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_KEY=your_supabase_key_here
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   DATABASE_URL=your_database_url_here
   CORS_ORIGINS=http://localhost:4001
   ```
   
   Create `frontend/.env` file with:
   ```env
   PUBLIC_SUPABASE_URL=your_supabase_url_here
   PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```
   
   Or set these as environment variables in your shell before running `docker-compose`.

3. **Install dependencies** (optional, if running locally)
   ```bash
   make install
   ```

4. **Start the development servers**
   ```bash
   make dev
   ```

   Or using Docker Compose directly:
   ```bash
   docker-compose up --build
   ```

### Available Commands

- `make help` - Show available commands
- `make install` - Install dependencies
- `make dev` - Start development servers
- `make build` - Build Docker images
- `make up` - Start services
- `make down` - Stop services
- `make clean` - Remove containers and images
- `make logs` - View logs
- `make backend` - Start only backend
- `make frontend` - Start only frontend

## Development

### Frontend Development

The frontend runs on `http://localhost:4001` in development mode.

### Backend Development

The backend API runs on `http://localhost:5001` with automatic reloading enabled.

API documentation is available at `http://localhost:5001/docs` (Swagger UI).

## Project Status

This is a bootstrap skeleton. Core functionality will be implemented in subsequent iterations.

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License** (CC BY-NC 4.0).

You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made
- **NonCommercial** — You may not use the material for commercial purposes

For the full license text, see: https://creativecommons.org/licenses/by-nc/4.0/

