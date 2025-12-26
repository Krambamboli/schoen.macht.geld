# Visual Enhancements TODO

## Priority Legend
- [x] = Completed
- [ ] = Not started
- ⭐⭐⭐ = High priority
- ⭐⭐ = Medium priority
- ⭐ = Normal priority
- 🔽 = Low priority
- ❓ = Needs clarification
- 📦 = Later/Maybe

---

## Additional Views

| Status | Feature | Priority | Notes |
|--------|---------|----------|-------|
| [x] | Performance Race | ⭐⭐⭐ | Animated line race of top 5 stocks over time |
| [x] | IPO Spotlight | ⭐⭐⭐ | Highlight newly registered stocks |
| [ ] | Correlation Matrix | ⭐ | Heatmap showing stock correlations. Needs new backend endpoint `GET /api/correlation-matrix` |
| [x] | Sector Sunburst | ⭐ | AI generates group titles for 3-6 random stocks, displayed as hierarchical sunburst |

---

## Visual Effects

| Status | Feature | Priority | Notes |
|--------|---------|----------|-------|
| [x] | Terminal Boot | ⭐ | Fake POST/boot sequence on load. Plays on every page load. |
| [x] | Beat Sync Mode | ⭐⭐ | Audio-reactive visuals synced to music via microphone input |
| [x] | Matrix Mode | ⭐ | Green matrix symbols dropping from top with trace (via Hacker Mode) |
| [ ] | Site Content Matrix | ⭐ | Letters from screen content used for matrix effect, spawned randomly (prefer top) |
| [x] | DVD Logo Mode | ⭐ | Configurable text/image bouncing off screen edges |
| [ ] | Firework Mode | ⭐ | Solitaire-style card explosions |
| [x] | CRT Scanlines | ⭐ | Subtle horizontal lines + screen curvature |
| [x] | Glitch/Static | ⭐ | VHS tracking errors, chromatic aberration |
| [x] | Neon Glow | ⭐ | Cyberpunk-style glowing edges on elements |
| [ ] | Circuit Traces | ⭐ | Animated PCB traces flowing in background |
| [x] | Binary Rain | ⭐ | Subtle 0s and 1s floating in margins |
| [ ] | Pulse Border | ⭐ | Screen edge pulses on major events |
| [x] | Aurora Waves | ⭐ | Slow-moving color gradients in background |
| [ ] | Hologram Flicker | ⭐ | Scan-line hologram effect on elements |

---

## Event Animations

| Status | Feature | Priority | Notes |
|--------|---------|----------|-------|
| [x]    | New #1 Celebration | ⭐⭐ | Confetti + spotlight + large ticker/image reveal before fading to table |
| [x]    | All-Time High | ⭐⭐ | Rocket launch or balloon rise animation |
| [x]    | Big Crash | ⭐⭐ | Explosion particles + screen shake |
| [x]    | Market Open | ⭐⭐ | Bell animation + flash |
| [x]    | Market Close | ⭐⭐ | End of trading day announcement |

---

## Unconventional Effects

| Status | Feature | Priority | Notes |
|--------|---------|----------|-------|
| [x] | Hacker Mode | ⭐⭐⭐ | Matrix rain with scanlines + green terminal aesthetic. Optimized for performance (20fps). |
| [x] | Drunk Mode | ⭐⭐ | Wobble + blur + hue rotation. Excludes settings panel. |
| [x] | Redacted Mode | ⭐⭐ | Randomly blacks out ~15% of text elements + "REDACTED" stamp + corner classification badges. |
| [ ] | Glitch Art | ⭐ | Intentional data corruption aesthetics |
| [ ] | Vaporwave | ⭐ | Pink/cyan gradients, Greek statues, retro sun |
| [ ] | Tilt Shift | 📦 | Miniature/toy effect on the UI |

---

## Physical World Inspired

| Status | Feature | Priority | Notes |
|--------|---------|----------|-------|
| [ ] | Trading Pit | 🔽 | Audio visualizer showing "crowd noise". Needs mic validation on Raspberry Pi Zero 2 W |
| [ ] | Billboard | 🔽 | Times Square style rotating ads. Could integrate AI-generated ads |

---

## Data Art (Needs Clarification)

| Status | Feature | Priority | Notes |
|--------|---------|----------|-------|
| [ ] | Sound Wave | ❓🔽 | Stock price rendered as audio waveform - needs design clarification |
| [ ] | Heartbeat Monitor | ❓🔽 | ECG style for volatile stocks - needs design clarification |

---

## Later / Maybe

### Retro Computing Aesthetics
- DOS/CLI Mode (ASCII art)
- Windows 95 (BSOD, window borders)
- Teletext/Ceefax (blocky BBC style)
- Green Phosphor (CRT afterglow trails)
- Amber Terminal (amber-on-black)
- Apple II (lo-fi pixel font)
- Floppy Load (fake disk loading)

### Screen Saver Modes
- Pipes 3D
- Starfield (stock tickers as stars)
- Aquarium (stocks as fish)
- Lava Lamp
- Bouncing Logos

---

## Backend Requirements

| Endpoint | Purpose | For Feature |
|----------|---------|-------------|
| `GET /api/correlation-matrix` | Returns NxN correlation coefficients | Correlation Matrix view |
| `GET /ai/generate/stock-groups` | AI-generated groupings of 3-6 stocks with titles | Sector Sunburst view (implemented) |
| `GET /api/new-stocks` | Recently registered stocks | IPO Spotlight view |

---

## Implementation Notes

- All visual effects are toggleable via settings panel (gear icon or `F12`) or number keys `1-9, 0`
- Settings persist to localStorage
- Effects auto-disable on server 500 errors
- Consider performance on Raspberry Pi Zero 2 W for heavier effects
- Effects can be layered (e.g., CRT Scanlines + Matrix Mode)
- Use Framer Motion (already installed) for complex animations
- Consider CSS-only implementations for performance-critical effects

---

## Completed Features

### Terminal Boot
- Fake POST/boot sequence with SMG branding
- Memory check, module loading, FSE connection
- ~4.5 second duration, fades out
- Plays on every page load

### Hacker Mode
- Matrix-style rain with Japanese characters
- Optimized canvas rendering (20fps, sparse columns)
- Scanlines overlay
- Green tint
- Monospace font override

### Drunk Mode
- Wobble animation on main content
- Blur + hue rotation filter
- Vignette overlay
- Excludes settings panel and dialogs

### Redacted Mode
- Randomly selects ~15% of text elements
- Black bars via CSS pseudo-elements
- Large centered "REDACTED" stamp
- Corner classification badges (TOP SECRET, EYES ONLY, CLASSIFIED, NO FORN)
- Charts blurred
- Re-scans for new content every 5 seconds

### Effects Infrastructure
- `EffectsContext` for global state management
- `EffectsProvider` wraps app
- `EffectsLayer` renders all effect components
- Settings panel with individual toggles + master disable
- Keyboard shortcuts: `F12` for settings, `1-9, 0` for effects, `E` to disable all, `?` for help
- Auto-reset on 500 server errors

### Event Animations Infrastructure
- `EventsContext` for detecting and triggering events
- `EventsProvider` wraps app (inside EffectsProvider)
- `EventsLayer` renders active event animation
- Event detection: rank changes, all-time highs, crashes (-10%+)
- Events queue system for handling multiple events
- Toggle in settings panel

### New #1 Celebration
- Confetti particles (50 colored pieces falling)
- Spotlight gradient background
- Crown icon with sparkle animation
- Large stock card with glowing border
- Displays new leader info + who was overtaken
- 8 second duration with auto-dismiss

### All-Time High
- Rocket launch animation with flame trail
- Stock card attached to rocket
- Stars twinkling in background
- Green theme with celebration badge
- Shows previous high vs new high
- 6 second duration

### Big Crash
- Red flash on impact
- Screen shake effect
- Explosion particles radiating outward
- Smoke rising effect
- Fire overlay on stock image
- Warning icons and dramatic text
- 6 second duration

### CRT Scanlines
- Horizontal scanlines overlay (1px repeating)
- Screen curvature vignette
- Subtle RGB shift on edges
- Constant subtle flicker animation

### Neon Glow
- Glowing text shadows on headings (pink)
- Glowing box shadows on buttons (cyan)
- Glowing borders on cards (pink)
- Animated border glow cycling through colors
- Tables have cyan glow

### Glitch/Static
- Random glitch lines appearing briefly
- Static noise overlay (subtle)
- Screen shake effect (periodic)
- Chromatic aberration on text (periodic)

### DVD Logo Mode
- Bouncing "SMG" logo
- Changes color on edge bounce
- Neon glow effect on logo
- ~60fps smooth animation

### Binary Rain
- Canvas-based 0s and 1s
- Only in left/right margins (60px each)
- Slower than matrix rain
- Semi-transparent green

### Aurora Waves
- Three layered gradient waves
- Blurred for soft effect
- Slow undulating motion
- Purple, cyan, green color palette

### Beat Sync Mode
- Audio-reactive visuals via microphone input
- Frequency analysis for bass/mid/treble detection
- Visual elements pulse and scale with audio
- Color shifts based on audio intensity
- Configurable sensitivity
