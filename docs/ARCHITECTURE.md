# System Architecture

**Project**: Schön. Macht. Geld. - Stock Exchange Party Game
**Event**: One-time party event with ~1000 guests
**Organizers**: VAK (Verein für ambitionierten Konsum) & Amphitheater Zürich

---

## Overview

A satirical stock exchange game where party guests become tradeable "stocks". Guests can interact with the market through swipe-based games, affecting stock prices in real-time. Multiple display screens show live market visualizations.

```
┌───────────────────────────────────────────────────────────┐
│               CENTRAL SERVER (Pi 4 / Laptop)              │
│  ┌────────────────────────────────────────────────────┐   │
│  │          Docker Compose Stack (root level)         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌───────┐  ┌────────┐ │   │
│  │  │ Frontend │  │ Backend  │  │ Caddy │  │ Backup │ │   │
│  │  │ Next.js  │  │ FastAPI  │  │ Proxy │  │ SQLite │ │   │
│  │  │  :3000   │  │  :8080   │  │ :80   │  │ Cron   │ │   │
│  │  └────┬─────┘  └────┬─────┘  └───┬───┘  └────────┘ │   │
│  │       └─────────────┴────────────┘                 │   │
│  │                      ↑ internal network            │   │
│  └────────────────────────────────────────────────────┘   │
│                              │                            │
│                         port 80 (HTTP)                    │
└──────────────────────────────┼────────────────────────────┘
                               │
              Private WiFi Network (no guest access)
         ┌─────────────┬───────┴───────┬─────────────┐
         │             │               │             │
    ┌────┴────┐   ┌────┴────┐    ┌─────┴────┐  ┌─────┴────┐
    │ Pi Zero │   │ Pi Zero │    │   Pi 4   │  │   Pi 4   │
    │ Display │   │ Display │    │  Swipe   │  │  Admin   │
    │ /ticker │   │ /leader │    │ /swipe   │  │ /admin   │
    │  board  │   │  board  │    │          │  │          │
    └─────────┘   └─────────┘    └──────────┘  └──────────┘
      Chromium      Chromium       Chromium     Chromium
      Kiosk Mode    Kiosk Mode     Kiosk Mode   Kiosk Mode
```

---

## Components

### 1. Backend (FastAPI + SQLite)

**Location**: `/backend/`

**Responsibilities**:
- Stock CRUD operations
- Swipe processing with price calculations
- Price snapshots and ranking calculations (scheduled)
- AI generation (descriptions, images, videos)
- Admin interface (`/admin`)

**Stack**:
- Python 3.13 + FastAPI
- SQLModel + SQLite (async via aiosqlite)
- Alembic for migrations
- APScheduler for background jobs
- sqladmin for admin UI

**Key Endpoints**:
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stocks/` | List all stocks |
| POST | `/stocks/` | Create stock |
| GET | `/stocks/{ticker}` | Get single stock |
| POST | `/stocks/{ticker}/image` | Upload image |
| POST | `/stocks/{ticker}/price` | Admin price adjustment |
| GET | `/stocks/{ticker}/snapshots` | Price history for charts |
| WS | `/stocks/ws` | WebSocket for real-time updates |
| POST | `/swipe/` | Record swipe (up/down) |
| GET | `/health` | Health check |
| POST | `/ai/generate/*` | AI generation endpoints |
| GET | `/screenshot/{view}.jpg` | Screenshot for Pi display |
| GET | `/screenshot/stream/{view}` | MJPEG stream for Pi display |

### 2. Frontend (Next.js)

**Location**: `/frontend/` (after reorganization)

**Pages**:
| Route | Purpose | Target Device |
|-------|---------|---------------|
| `/display` | Scrolling stock ticker | Pi Zero |
| `/display/leaderboard` | Stock grid sorted by rank | Pi Zero |
| `/display/market-map` | Treemap visualization | Pi Zero |
| `/display/stock-chart` | Rotating price charts | Pi Zero |
| `/display/terminal` | Bloomberg-style terminal with AI news | Pi Zero |
| `/display/performance-race` | Animated stock race visualization | Pi Zero |
| `/display/ipo-spotlight` | New stock announcements | Pi Zero |
| `/display/sector-sunburst` | Sector breakdown chart | Pi Zero |
| `/swipe` | Tinder-like swipe interface | Pi 4 |

**Stack**:
- Next.js 15 (React 18)
- SWR + WebSocket for real-time data
- Tailwind CSS + Radix UI
- Recharts for visualizations
- Framer Motion for animations

**Real-Time Features**:
- WebSocket connection for instant price updates
- Market events (new leader, all-time high, crash alerts)
- Market open ceremony with countdown

### 3. Caddy (Reverse Proxy)

**Purpose**: Single entry point, routes requests to appropriate service

**Routing**:
```
:80
├── /api/*     → backend:8080  (API requests)
├── /admin/*   → backend:8080  (Admin UI)
├── /images/*  → file server   (Static images)
└── /*         → frontend:3000 (Next.js app)
```

### 4. Screenshot Service (Optional)

**Purpose**: Render display views to images for resource-constrained Pi Zero devices

The Pi Zero 2 W has only 512MB RAM, which may be insufficient for running Chromium. Two approaches are available:

**Option A: Lightweight Browser**
- Use Surf, Midori, or similar lightweight browser in kiosk mode
- Pros: Native rendering, lower latency, simpler setup
- Cons: May still struggle with complex React pages

**Option B: Screenshot Streaming**
Backend renders views using Playwright and serves them as images or MJPEG streams.

**Endpoints**:
| Path | Purpose |
|------|---------|
| `/api/screenshot/{view}.jpg` | Single screenshot |
| `/api/screenshot/stream/{view}?fps=5` | MJPEG stream |
| `/api/screenshot/views` | List available views |
| `/api/screenshot/reload` | Reload all pages |

**Pi Zero Usage (Option B)**:
```bash
# Display via mpv
mpv --no-cache http://server/api/screenshot/stream/leaderboard

# Display via fbi (framebuffer, no X11 needed)
while true; do
  curl -s http://server/api/screenshot/leaderboard.jpg -o /tmp/display.jpg
  fbi -a -T 1 --noverbose -1 /tmp/display.jpg
  sleep 0.2
done
```

### 5. Backup Service

**Purpose**: Automated SQLite snapshots + image backups

**Schedule**: Every 10 minutes

**Storage**: `./backend/backups/` with timestamped snapshots

---

## Data Flow

### Stock Display (Read Path)
```
Pi Browser → Caddy → Frontend (SSR or client) → Backend API → SQLite
                                    ↓
                         WebSocket Connection (real-time)
                                    ↓
                              React Components
```

### Pi Zero Display (Screenshot Path)
```
Pi Zero (mpv/fbi) → Caddy → Backend Screenshot Service
                                    ↓
                         Playwright (Chromium headless)
                                    ↓
                         JPEG/MJPEG Response
```

### Swipe Action (Write Path)
```
Pi Browser (swipe gesture)
       ↓
Frontend: POST /api/swipe { ticker, direction, token }
       ↓
Backend: Validate token, calculate price delta
       ↓
SQLite: Create PriceEvent, update Stock.current_price
       ↓
WebSocket: Broadcast stock_update to all clients
       ↓
Response: { new_price, new_token }
       ↓
All displays update in real-time
```

### Price Updates (Background)
```
APScheduler (every 60s)
       ↓
Create StockSnapshot for each stock
       ↓
Calculate rankings
       ↓
Update Stock.rank fields
       ↓
WebSocket: Broadcast stocks_update + market events
```

### Market Events (WebSocket)
```
Backend detects event condition
       ↓
Broadcast event to all clients:
  - new_leader: Rank #1 changed
  - all_time_high: Stock hit new peak
  - big_crash: Stock dropped below -10%
  - market_open: Trading session started
       ↓
Frontend shows full-screen overlay animation
```

---

## Network Topology

### Hardware
| Device | Role | Connection | Display Method |
|--------|------|------------|----------------|
| Central Server | Docker host | Wired LAN | - |
| Pi Zero 2W #1 | Ticker display | WiFi | Lightweight browser or screenshot stream |
| Pi Zero 2W #2 | Leaderboard | WiFi | Lightweight browser or screenshot stream |
| Pi Zero 2W #3 | Market map | WiFi | Lightweight browser or screenshot stream |
| Pi Zero 2W #4 | Stock chart | WiFi | Lightweight browser or screenshot stream |
| Pi Zero 2W #5 | Terminal | WiFi | Lightweight browser or screenshot stream |
| Pi 4 #1 | Swipe kiosk | WiFi/Wired | Chromium kiosk mode |
| Pi 4 #2 | Admin/Backup | Wired | Chromium kiosk mode |

**Note**: Pi Zero 2W devices have limited RAM (512MB). Options include lightweight browsers (Surf, Midori) or server-side screenshot streaming.

### Network Requirements
- Private WiFi network (not accessible to guests)
- Static IP for central server (e.g., `192.168.1.100`)
- All Pis configured to auto-start Chromium in kiosk mode

### Resilience
- Frontend uses SWR with `fallbackData` for graceful degradation
- If API unreachable, displays continue showing last known data
- Swipe kiosks show error toast but don't crash

---

## Deployment

### Central Server Setup
```bash
# Clone and navigate
cd /path/to/schoen.macht.geld

# Start all services
docker compose up -d

# Check health
curl http://localhost/health
```

### Pi 4 Kiosk Setup (Chromium)
```bash
# /etc/xdg/lxsession/LXDE-pi/autostart
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --kiosk --noerrdialogs --disable-infobars \
  http://192.168.1.100/swipe
```

### Pi Zero Setup

**Option A: Lightweight Browser (e.g., Surf)**
```bash
# /etc/xdg/lxsession/LXDE-pi/autostart
@xset s off
@xset -dpms
@xset s noblank
@surf -F http://192.168.1.100/display/leaderboard
```

**Option B: Screenshot Stream (mpv)**
```bash
# /etc/xdg/lxsession/LXDE-pi/autostart
@xset s off
@xset -dpms
@xset s noblank
@mpv --no-cache --fullscreen --loop \
  http://192.168.1.100/api/screenshot/stream/leaderboard?fps=5
```

**Option B: Framebuffer (no X11 needed)**
```bash
# /etc/rc.local or systemd service
while true; do
  curl -s http://192.168.1.100/api/screenshot/leaderboard.jpg -o /tmp/display.jpg
  fbi -a -T 1 --noverbose -1 /tmp/display.jpg 2>/dev/null
  sleep 0.2
done
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=sqlite+aiosqlite:////app/data/stocks.db
STATIC_DIR=/app/data/static

# AI Configuration
ATLASCLOUD_API_KEY=...
ATLASCLOUD_TEXT_MODEL=deepseek-ai/deepseek-v3.2
ATLASCLOUD_IMAGE_MODEL=black-forest-labs/flux-schnell

# Screenshot Service (for Pi Zero displays)
SCREENSHOT_ENABLED=true
SCREENSHOT_FRONTEND_URL=http://frontend:3000
SCREENSHOT_WIDTH=1920
SCREENSHOT_HEIGHT=1080
SCREENSHOT_QUALITY=85
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://backend:8000
```

---

## Security Considerations

- Network is private (no guest access)
- No authentication required for kiosk operations
- Admin panel accessible only from trusted devices
- SQLite database backed up every 10 minutes
- No sensitive data stored (it's a party game)
