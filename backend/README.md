# Backend

FastAPI backend for the Schön. Macht. Geld. stock exchange party game.

## Requirements

- Python 3.13+
- [uv](https://github.com/astral-sh/uv)

## Setup

```bash
cp .env.example .env
uv sync
```

## Run

```bash
PYTHONPATH=src uv run uvicorn app.main:app --reload
```

Server runs at http://localhost:8080. API docs at `/api/docs`. Admin panel at `/api/admin/`.

## Project Structure

```
src/app/
├── main.py           # Application entry point
├── config.py         # Settings (env vars)
├── database.py       # SQLite async connection
├── storage.py        # Image storage with validation & compression
├── scheduler.py      # Background jobs (price ticks, snapshots)
├── admin.py          # Admin panel (SQLAdmin)
├── models/           # SQLModel database models
├── schemas/          # Pydantic request/response schemas
├── routers/          # API endpoints
├── services/         # External services (AtlasCloud, Google AI, Screenshot)
└── websocket.py      # WebSocket connection manager
data/
├── stocks.db         # SQLite database (auto-created)
└── static/           # Static files (images, videos)
```

## Data Models

### Stock

| Field | Type | Description |
|-------|------|-------------|
| ticker | str | Primary key (e.g. "APPL") |
| title | str | Display name |
| image | str? | Image path (served at `/static/`) |
| description | str | Profile description |
| is_active | bool | Whether stock is tradeable |
| price | float | Current price |
| max_price | float? | Session high (resets on market open) |
| min_price | float? | Session low (resets on market open) |
| reference_price | float? | Market open price (for % change) |
| rank | int? | Rank by price (1 = highest) |
| change_rank | int? | Rank by % change (1 = top gainer) |

### PriceEvent

| Field | Type | Description |
|-------|------|-------------|
| id | int | Auto-increment primary key |
| ticker | str | Foreign key to Stock |
| price | float | Price after change |
| change_type | enum | initial, swipe_up, swipe_down, random, admin |
| created_at | datetime | Timestamp |

### StockSnapshot

Used for price history charts.

| Field | Type | Description |
|-------|------|-------------|
| id | int | Auto-increment primary key |
| ticker | str | Foreign key to Stock |
| price | float | Price at snapshot time |
| created_at | datetime | Timestamp |

### MarketState

Global singleton tracking market state and lifecycle.

| Field | Type | Description |
|-------|------|-------------|
| id | int | Always 1 (singleton) |
| is_open | bool | Market open (true) or after-hours (false) |
| snapshot_count | int | Snapshots taken in current market day |
| after_hours_snapshot_count | int | Snapshots during after-hours period |
| market_day_count | int | Total completed market days |

## API Reference

Full interactive docs at `/docs` (Swagger UI).

### Core Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /stocks/ | List stocks (?random, ?limit) |
| POST | /stocks/ | Create stock |
| GET | /stocks/{ticker} | Get stock by ticker |
| POST | /stocks/{ticker}/image | Upload stock image |
| POST | /stocks/{ticker}/price | Set price (admin) |
| GET | /stocks/{ticker}/snapshots | Price history |
| GET | /stocks/{ticker}/events | Price change log |
| POST | /swipe/ | Record swipe vote |

### AI Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /ai/generate/description | Generate stock description |
| POST | /ai/generate/headlines | Generate news headlines |
| POST | /ai/generate/image | Generate stock image |
| POST | /ai/generate/video | Generate ad video |
| GET | /ai/tasks | List AI tasks |
| GET | /ai/tasks/{id} | Get task status |
| POST | /ai/tasks/{id}/apply | Apply result to stock |
| DELETE | /ai/tasks/{id} | Delete task |

### Screenshot Endpoints

For rendering display views to images (useful for Raspberry Pi displays).

| Method | Path | Description |
|--------|------|-------------|
| GET | /screenshot/views | List available views |
| GET | /screenshot/{view}.jpg | Get single screenshot |
| GET | /screenshot/stream/{view} | MJPEG stream (default 5 FPS) |
| POST | /screenshot/reload | Reload all pages |
| POST | /screenshot/reload/{view} | Reload specific page |

### WebSocket

| Path | Description |
|------|-------------|
| ws://host/api/stocks/ws | Real-time stock updates |

WebSocket message types:
- `stocks_update` - Full stock list
- `stock_update` - Single stock change
- `event` - Market events (new_leader, all_time_high, big_crash, market_open, market_close)

### API Examples

**Create stock:**

```bash
# Without image
curl -X POST http://localhost:8000/stocks/ \
  -F 'ticker=TEST' \
  -F 'title=Test Stock'

# With image
curl -X POST http://localhost:8000/stocks/ \
  -F 'ticker=TEST' \
  -F 'title=Test Stock' \
  -F 'image=@photo.jpg'
```

**Upload/replace image:**

```bash
curl -X POST http://localhost:8000/stocks/TEST/image \
  -F 'image=@photo.jpg'
```

**Set price:**

```bash
curl -X POST "http://localhost:8000/stocks/TEST/price?price=1050.0"
```

**Submit swipe:**

```bash
curl -X POST http://localhost:8000/swipe/ \
  -H "Content-Type: application/json" \
  -d '{"ticker": "TEST", "direction": "right", "swipe_token": null}'
```

**Generate AI content:**

```bash
# Generate description
curl -X POST http://localhost:8000/ai/generate/description \
  -H "Content-Type: application/json" \
  -d '{"ticker": "TEST"}'

# Check task status
curl http://localhost:8000/ai/tasks/{task_id}

# Apply result
curl -X POST http://localhost:8000/ai/tasks/{task_id}/apply \
  -H "Content-Type: application/json" \
  -d '{"ticker": "TEST"}'
```

## Swipe Token System

Swipes use a stateless token to track user behavior without sessions. The token is a base64-encoded JSON:

```json
{"ts": 1703001234, "buckets": [[3, 1], [2, 4], ...]}
```

Features:
- **Streak detection**: Consecutive same-direction swipes reduce impact (0.7x after 5+)
- **Pickiness bonus**: Users who swipe left often get bonus on right swipes
- **Time decay**: Old swipe data expires automatically

Price formula:
```
base = price * random(1-3%)
final = base * streak_penalty * pickiness_bonus * random(0.5-2.0) * direction
```

## Admin Panel

Access at `/admin/`. Features:

- **Stocks**: View, create, edit, delete, search (supports camera capture on mobile)
- **Price Events**: View price change history (read-only)
- **Stock Snapshots**: View periodic snapshots (read-only)
- **AI Tasks**: View generation tasks and status

## Background Jobs

The scheduler runs automatically:

| Job | Interval | Description |
|-----|----------|-------------|
| Price Tick | 60s | Random ±5% price changes (reduced during after-hours) |
| Snapshots | 10s | Capture prices, calculate rankings, manage market lifecycle |
| AI Tasks | 10s | Poll and process AI generation |

## Market Lifecycle

The market follows a configurable day/night cycle with optional after-hours trading:

### Standard Flow (AFTER_HOURS_SNAPSHOTS = 0)

1. **Market Open** - Reference prices set, max/min reset
2. **Trading Day** - N snapshots with full volatility
3. **Market Close** → **Immediate Market Open** - New day starts instantly

### With After-Hours (AFTER_HOURS_SNAPSHOTS > 0)

1. **Market Open** - Reference prices set, max/min reset, `market_open` event
2. **Trading Day** - N snapshots with full volatility (100%)
3. **Market Close** - `market_close` event, enter after-hours mode
4. **After-Hours Trading** - K snapshots with reduced volatility (default 30%)
5. **After-Hours Complete** → **Market Open** - New day starts with fresh reference prices

### Key Behaviors

- **Reference Price**: Set on market open, remains constant during trading day
- **Percentage Changes**: Always calculated from market open price
- **Max/Min Prices**: Track session high/low, reset on market open
- **After-Hours Volatility**: Configurable multiplier (default 0.3 = 30% of normal)
- **Trading Continues**: Swipes and admin actions work during after-hours

### Example Timeline

With `SNAPSHOT_INTERVAL=10s`, `SNAPSHOTS_PER_MARKET_DAY=30`, `AFTER_HOURS_SNAPSHOTS=5`:

```
T=0s    Market Open (Day 1)
T=10s   Snapshot 1
T=20s   Snapshot 2
...
T=300s  Snapshot 30 → Market Close → Enter After-Hours
T=310s  After-Hours Snapshot 1 (30% volatility)
T=320s  After-Hours Snapshot 2 (30% volatility)
...
T=350s  After-Hours Snapshot 5 → Market Open (Day 2)
T=360s  Snapshot 1
...
```

## Image Handling

- **Formats**: JPEG, PNG, GIF, WebP, AVIF, HEIC/HEIF, BMP
- **Max size**: 20MB
- **Auto-processing**: Resize to 1920px max, convert to JPEG, compress to 85%
- **Cleanup**: Old images deleted when replaced

HEIC/HEIF support via `pillow-heif` for iPhone photos.

## AI Content Generation

Requires AtlasCloud API key. Google AI available as fallback for text.

| Type | Model | Cost |
|------|-------|------|
| Text | deepseek-ai/deepseek-v3.2 | Free |
| Image | black-forest-labs/flux-schnell | $0.003/img |
| Video | alibaba/wan-2.2/t2v-480p | $0.009/sec |

## Database Migrations

```bash
uv run alembic upgrade head          # Apply migrations
uv run alembic revision --autogenerate -m "description"  # Create migration
uv run alembic downgrade -1          # Rollback
```

## Configuration

All settings via environment variables or `.env` file.

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | sqlite+aiosqlite:///./data/stocks.db | Database path |
| ROOT_PATH | | Set to `/api` behind proxy |
| CORS_ALLOW_ALL | false | Allow all origins (dev) |

### Pricing

| Variable | Default | Description |
|----------|---------|-------------|
| STOCK_BASE_PRICE | 1000.0 | Initial stock price |
| PRICE_TICK_INTERVAL | 60 | Seconds between random ticks |
| PRICE_TICK_ENABLED | true | Enable random price updates |
| SNAPSHOT_INTERVAL | 10 | Seconds between snapshots |
| SNAPSHOTS_PER_MARKET_DAY | 30 | Snapshots per market day |
| SNAPSHOT_RETENTION | 90 | Snapshots to keep per stock |
| AFTER_HOURS_SNAPSHOTS | 0 | After-hours snapshots (0 = instant cycling) |
| AFTER_HOURS_VOLATILITY_MULTIPLIER | 0.3 | Volatility during after-hours (0.3 = 30%) |

### Static Files

| Variable | Default | Description |
|----------|---------|-------------|
| STATIC_DIR | ./data/static | Storage path |
| MAX_IMAGE_SIZE | 20971520 | Max upload size (bytes) |
| IMAGE_MAX_DIMENSION | 1920 | Max width/height |
| IMAGE_QUALITY | 85 | JPEG quality (1-100) |

### AI

| Variable | Default | Description |
|----------|---------|-------------|
| ATLASCLOUD_API_KEY | | Required for AI features |
| ATLASCLOUD_TEXT_MODEL | deepseek-ai/deepseek-v3.2 | Text model |
| ATLASCLOUD_IMAGE_MODEL | black-forest-labs/flux-schnell | Image model |
| GOOGLE_AI_API_KEY | | Fallback for text |
| FORCE_GOOGLE_AI | false | Always use Google AI |
| AI_TEXT_MAX_TOKENS | 10000 | Max tokens for text generation |

### Swipe

| Variable | Default | Description |
|----------|---------|-------------|
| SWIPE_BUCKET_DURATION | 20 | Seconds per history bucket |
| SWIPE_BUCKET_COUNT | 30 | Number of buckets |
| SWIPE_BASE_PERCENT_MIN | 0.01 | Min price change (1%) |
| SWIPE_BASE_PERCENT_MAX | 0.03 | Max price change (3%) |
| SWIPE_STREAK_THRESHOLD | 5 | Buckets for streak detection |
| SWIPE_STREAK_PENALTY | 0.7 | Multiplier when streak detected |

### Screenshot Service

| Variable | Default | Description |
|----------|---------|-------------|
| SCREENSHOT_ENABLED | true | Enable screenshot service |
| SCREENSHOT_FRONTEND_URL | http://localhost:3000 | Frontend URL to capture |
| SCREENSHOT_INTERVAL | 0.2 | Seconds between captures (~5 FPS) |
| SCREENSHOT_WIDTH | 1920 | Viewport width |
| SCREENSHOT_HEIGHT | 1080 | Viewport height |
| SCREENSHOT_QUALITY | 85 | JPEG quality (1-100) |
| SCREENSHOT_VIEWS | [...] | List of views to capture |

Requires Playwright and Chromium:
```bash
uv run playwright install chromium
```

## Development

```bash
uv run ruff check src/        # Lint
uv run basedpyright src/      # Type check
uv run pytest                 # Test
```
