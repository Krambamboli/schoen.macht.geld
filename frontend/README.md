# Frontend

Next.js frontend for the Schön. Macht. Geld. stock exchange party game.

## Requirements

- Node.js 20+
- pnpm

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

Runs at http://localhost:3000

By default, the frontend expects the backend API at `/api` (proxied via Caddy). For local development without Docker, set:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev
```

## Build

```bash
pnpm build
```

The build uses `output: 'standalone'` for Docker deployment.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Home page
│   ├── swipe/              # Swipe interface
│   └── display/            # Display screens
│       ├── page.tsx        # Stock ticker
│       ├── leaderboard/    # Top stocks ranking
│       ├── market-map/     # Visual market overview (treemap)
│       ├── stock-chart/    # Price history charts
│       ├── terminal/       # News ticker + headlines
│       ├── performance-race/ # Animated stock race
│       ├── ipo-spotlight/  # New stock announcements
│       └── sector-sunburst/ # Sector breakdown chart
├── components/             # React components
│   ├── ui/                 # ShadCN UI components
│   ├── effects/            # Visual effects (hacker mode, etc.)
│   └── events/             # Market event overlays
├── contexts/               # React contexts
│   ├── effects-context.tsx # Visual effects state
│   ├── events-context.tsx  # Market events state
│   └── websocket-context.tsx # WebSocket connection
├── hooks/                  # Custom React hooks
│   └── use-stocks.ts       # SWR + WebSocket stock data
└── lib/
    └── api/                # Generated TypeScript API client
        └── client/         # @hey-api/openapi-ts generated code
```

## API Client

The API client is auto-generated from the backend's OpenAPI spec.

### Regenerate after backend changes

```bash
pnpm generate-api
```

This fetches `http://localhost:8080/openapi.json` and generates TypeScript types and functions in `src/lib/api/client/`.

### Usage

```typescript
import { useStocks, useStock, submitSwipe } from '@/hooks/use-stocks';

// List stocks with auto-refresh
const { stocks, isLoading, mutate } = useStocks({ limit: 10, random: true });

// Single stock
const { stock, snapshots } = useStock('APPL');

// Submit a swipe
await submitSwipe('APPL', 'right', swipeToken);
```

## Data Fetching

Uses [SWR](https://swr.vercel.app/) combined with WebSocket for real-time updates:

- WebSocket connection for instant price updates
- SWR for initial data load and fallback
- Automatic reconnection on disconnect
- Deduplication of requests

## Real-Time Updates

The app connects to the backend WebSocket for live data:

```typescript
// WebSocket context provides connection state
const { isConnected, lastMessage } = useWebSocket();

// Stocks hook automatically syncs with WebSocket
const { stocks } = useStocks(); // Updates in real-time
```

### Market Events

Visual overlays for market events:

| Event | Description |
|-------|-------------|
| **Market Open** | Countdown ceremony when trading starts |
| **New Leader** | Celebration when #1 rank changes |
| **All-Time High** | Alert when stock hits new peak |
| **Big Crash** | Warning when stock drops below -10% |

Events are managed via `EventsContext` and displayed as full-screen overlays.

## Styling

- Tailwind CSS for utility classes
- ShadCN UI for component primitives
- Dark theme by default (`class="dark"` on `<html>`)

## Visual Effects

The app includes toggleable visual effects for an enhanced viewing experience.

### Startup Effects

| Effect | Description |
|--------|-------------|
| **Terminal Boot** | Fake POST/boot sequence on page load |

### Visual Modes

| Mode | Description |
|------|-------------|
| **Hacker Mode** | Matrix rain with scanlines and green terminal aesthetic |
| **Drunk Mode** | Wobble and blur effect (for after-hours trading) |
| **Redacted Mode** | Black bars over "classified" data with TOP SECRET stamps |
| **CRT Mode** | Retro CRT monitor effect with scan lines |
| **Neon Mode** | Cyberpunk neon glow effects |
| **Glitch Mode** | Digital glitch and distortion effects |
| **Aurora Mode** | Northern lights background animation |
| **DVD Mode** | Bouncing DVD logo screensaver |
| **Binary Mode** | Binary code rain overlay |

### Usage

- **Settings Panel**: Click the gear icon (bottom-right corner)
- **Keyboard Shortcut**: `Ctrl/Cmd+Shift+E` to toggle settings panel
- **Master Toggle**: "Disable All Effects" turns everything off
- Settings persist to localStorage
- Effects auto-disable on server 500 errors

### Files

```
src/
├── contexts/
│   ├── effects-context.tsx    # Global effects state
│   ├── events-context.tsx     # Market events state
│   └── websocket-context.tsx  # WebSocket connection
└── components/
    ├── effects/
    │   ├── index.tsx          # EffectsLayer wrapper
    │   ├── terminal-boot.tsx  # Boot sequence
    │   ├── hacker-mode.tsx    # Matrix rain
    │   ├── drunk-mode.tsx     # Wobble/blur
    │   ├── redacted-mode.tsx  # Black bars
    │   ├── crt-mode.tsx       # CRT monitor effect
    │   ├── neon-mode.tsx      # Neon glow
    │   ├── glitch-mode.tsx    # Digital glitch
    │   ├── aurora-mode.tsx    # Northern lights
    │   ├── dvd-mode.tsx       # DVD screensaver
    │   ├── binary-mode.tsx    # Binary rain
    │   └── settings-panel.tsx # Toggle UI
    └── events/
        ├── index.tsx          # EventsLayer wrapper
        ├── market-open.tsx    # Market open ceremony
        ├── new-leader-celebration.tsx # New #1 celebration
        ├── all-time-high.tsx  # Peak price alert
        └── big-crash.tsx      # Crash warning
```

See [VISUAL_ENHANCEMENTS_TODO.md](./VISUAL_ENHANCEMENTS_TODO.md) for planned features.

## Docker

The Dockerfile uses multi-stage builds:

1. **deps** - Install dependencies
2. **builder** - Build the Next.js app
3. **runner** - Minimal production image with standalone output

```bash
docker build -t frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=/api frontend
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `/api` | Backend API base URL |
