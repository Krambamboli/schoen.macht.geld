from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.admin import setup_admin
from app.config import settings
from app.database import engine, init_db
from app.routers import stocks, swipe


@asynccontextmanager
async def lifespan(app: FastAPI):  # pyright: ignore[reportUnusedParameter]
    """Initialize database on startup."""
    logger.info("Starting up")
    await init_db()
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Schoen Macht Geld API",
    description="Backend for the stock exchange party game",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
app.include_router(swipe.router, prefix="/swipe", tags=["swipe"])

# Admin panel at /admin
_ = setup_admin(app, engine)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
