from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import register, stocks, swipe


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


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
app.include_router(register.router, prefix="/register", tags=["register"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
