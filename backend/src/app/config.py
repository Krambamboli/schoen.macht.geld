from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite+aiosqlite:///./data/stocks.db"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:3000"]

    # Stock base price
    stock_base_price = 1000.0

    # Background price tick settings
    price_tick_interval: int = 60  # seconds between random price updates
    price_tick_enabled: bool = True

    # Image upload settings
    image_dir: str = "./data/images"
    max_image_size: int = 5 * 1024 * 1024  # 5MB


settings = Settings()
