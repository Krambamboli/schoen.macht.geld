FROM python:3.13-slim AS builder

# Install uv
RUN pip install uv

WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (no dev dependencies)
RUN uv sync --frozen --no-dev --no-install-project

# Copy source code
COPY src/ src/

# Install the project
RUN uv sync --frozen --no-dev


FROM python:3.13-slim AS runtime

WORKDIR /app

# Install Playwright dependencies (for screenshot service)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libatspi2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy source code
COPY --from=builder /app/src /app/src

# Copy alembic configuration and migrations
COPY alembic.ini ./
COPY migrations/ migrations/

# Create data directories
RUN mkdir -p /app/data/static

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/src"
ENV PYTHONUNBUFFERED=1

# Install Playwright browsers
RUN playwright install chromium

# Default configuration (can be overridden)
ENV DATABASE_URL="sqlite+aiosqlite:////app/data/stocks.db"
ENV STATIC_DIR="/app/data/static"
ENV UVICORN_HOST="0.0.0.0"
ENV UVICORN_PORT="8080"
ENV UVICORN_WORKERS="4"
ENV SCREENSHOT_ENABLED="true"
ENV SCREENSHOT_FRONTEND_URL="http://frontend:3000"

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "4"]