.PHONY: help install dev build up down stop clean logs backend frontend test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies for both frontend and backend
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt

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

test: ## Run tests (placeholder for future implementation)
	@echo "Tests not yet implemented"

