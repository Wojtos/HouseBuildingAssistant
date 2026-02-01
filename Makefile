A.PHONY: help install install-ci dev build up down stop clean logs backend frontend \
        test test-unit test-unit-coverage e2e e2e-ui e2e-headed e2e-report e2e-ci \
        lint lint-python lint-typescript lint-check \
        build-frontend deploy-cloudflare

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# =============================================================================
# Installation
# =============================================================================

install: ## Install dependencies for both frontend and backend
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt

install-ci: ## Install dependencies for CI (uses npm ci)
	@echo "Installing root dependencies..."
	npm ci
	@echo "Installing frontend dependencies..."
	cd frontend && npm ci
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing Python test tools..."
	pip install pytest pytest-cov pytest-asyncio

# =============================================================================
# Development
# =============================================================================

dev: ## Start development servers using Docker Compose
	docker-compose up --build

build: ## Build Docker images
	docker-compose build

up: ## Start services without rebuilding
	docker-compose up

down: ## Stop and remove containers
	docker-compose down

stop: ## Stop running containers without removing them
	docker-compose stop

clean: ## Remove containers, volumes, and images
	docker-compose down -v --rmi all

logs: ## View logs from all services
	docker-compose logs -f

backend: ## Start only the backend service
	docker-compose up backend

frontend: ## Start only the frontend service
	docker-compose up frontend

# =============================================================================
# Linting
# =============================================================================

lint: lint-python lint-typescript ## Run all linters

lint-python: ## Lint Python code with Black and isort
	@echo "Formatting Python code with Black..."
	cd backend && pipx run black .
	@echo "Sorting Python imports with isort..."
	cd backend && pipx run isort .

lint-check: ## Check linting without fixing (for CI)
	@echo "Checking Python formatting with Black..."
	cd backend && pipx run black --check --diff .
	@echo "Checking Python imports with isort..."
	cd backend && pipx run isort --check-only --diff .
	@echo "Checking TypeScript types..."
	cd frontend && npx tsc --noEmit

lint-typescript: ## Run TypeScript type checking
	cd frontend && npx tsc --noEmit

# =============================================================================
# Testing
# =============================================================================

test: test-unit e2e ## Run all tests

test-unit: ## Run backend unit tests
	cd backend && pytest tests/unit -v

test-unit-coverage: ## Run backend unit tests with coverage
	cd backend && pytest tests/unit \
		--cov=app \
		--cov-report=xml:coverage-unit.xml \
		--cov-report=html:coverage-unit-html \
		--cov-report=term-missing \
		-v

e2e: ## Run E2E tests with Playwright
	npm run test:e2e

e2e-ci: ## Run E2E tests in CI mode with reporters
	npm run test:e2e -- --reporter=html --reporter=json --output=e2e-results.json

e2e-ui: ## Run E2E tests in UI mode
	npm run test:e2e:ui

e2e-headed: ## Run E2E tests with visible browser
	npm run test:e2e:headed

e2e-report: ## Show last E2E test report
	npm run test:e2e:report

# =============================================================================
# Build & Deployment
# =============================================================================

build-frontend: ## Build frontend for production
	cd frontend && npm run build

deploy-cloudflare: build-frontend ## Build and prepare for Cloudflare Pages deployment
	@echo "Frontend built successfully for Cloudflare Pages"
	@echo "Deploy the 'frontend/dist' directory to Cloudflare Pages"
	@echo ""
	@echo "Cloudflare Pages configuration:"
	@echo "  Build command: make build-frontend"
	@echo "  Build output directory: frontend/dist"
	@echo "  Root directory: /"

