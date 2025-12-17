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

# Expose port
EXPOSE 5001

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001"]

