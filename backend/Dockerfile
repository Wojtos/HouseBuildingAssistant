FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user (check if user/UID exists first)
RUN (id -u 1000 >/dev/null 2>&1 || useradd -m -u 1000 appuser) && chown -R 1000:1000 /app
USER 1000

# Expose port (Fly.io uses 8080 by default)
EXPOSE 8080

# Run the application (use PORT env var for Fly.io compatibility)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

