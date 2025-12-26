# AI Prompts Reference

All AI prompts for the party game "Schön. Macht. Geld." by VAK & Amphitheater Zürich.

## Model Configuration

### Backend (Primary)
- **Provider**: AtlasCloud
- **Models**:
  - Text: `settings.atlascloud_text_model`
  - Image: `settings.atlascloud_image_model`
  - Video T2V: `settings.atlascloud_video_t2v_model`
  - Video I2V: `settings.atlascloud_video_i2v_model`

### Fallback
- **Provider**: Google AI (`GOOGLE_AI_API_KEY`)

### Generation Parameters
```python
ai_temperature: 0.85        # Creativity vs coherence
ai_top_p: 0.9               # Nucleus sampling
ai_frequency_penalty: 0.3   # Reduce repetition
ai_presence_penalty: 0.2    # Encourage variety
```

---

## 1. Profile Description Generation

**Location**: `src/app/routers/ai.py` → `DESCRIPTION_PROMPT`
**Endpoint**: `POST /ai/generate/description`

**Key Features**:
- Multiple style formats (I-perspective, Mission Statement, Investor Pitch, Tagline)
- 500 character limit
- 11 diverse examples included

**Examples in Prompt**:
```
- "Mission Statement: Wir maximieren hedonistische Rendite bei minimalem
   Verantwortungsbewusstsein. Unsere Kernkompetenz? Networking zwischen 2 und 6 Uhr morgens."
- "Premium seit der Geburt. Exklusiv bis zum Blackout."
- "Think different. Sniff different."
- "Just do it. Frag nicht was."
- "The Future is Now. Der Kater ist Morgen."
- "Kerngeschäft: strategische Präsenz an exklusiven Locations.
   Wettbewerbsvorteil: Ich kenne den Türsteher. Risikohinweis: keiner."
- "Analyst*innen empfehlen: STRONG BUY. Meine Ex empfiehlt: SELL.
   Der Markt entscheidet. Der Markt bin ich."
```

---

## 2. News Headlines Generation

**Location**: `src/app/routers/ai.py` → `HEADLINES_PROMPT`
**Endpoint**: `POST /ai/generate/headlines`

**Key Features**:
- Sentiment matching to price direction (rising = hype, falling = scandal)
- Must include stock title or ticker in each headline
- Markup tags for frontend parsing

**Sentiment Rules**:
```
Steigende Aktien: Übertriebenes Lob, Hype, FOMO, "Genie entdeckt"
Fallende Aktien: Skandale, Schadenfreude, "War da was auf dem Klo?"
```

**Markup Tags**:
| Tag | Purpose |
|-----|---------|
| `[percent]...[/percent]` | Percentage changes |
| `[price]...[/price]` | CHF prices |
| `[title]...[/title]` | Stock names |
| `[symbol]...[/symbol]` | Stock tickers |

---

## 3. Stock Groups / Sectors

**Location**: `src/app/routers/ai.py` → `STOCK_GROUPS_PROMPT`
**Endpoint**: `GET /ai/generate/stock-groups`

**Key Features**:
- Creates CATEGORIES (like industry sectors), not company names
- Groups stocks by archetype/vibe
- 12 example sector categories included

**Example Sectors**:
```
- "Nachtaktive Rohstoffe" (Substanzen, Konsumgüter)
- "Luxusgüter & Eitelkeiten" (Appearance-fokussiert)
- "Entertainment & Eskalation" (DJs, Performer)
- "Blue Chip Beauties" (Zuverlässig attraktive Dauerbrenner)
- "Frühschicht-Veteranen" (6-Uhr-morgens-Überlebende)
- "Peak-Hour Performers" (1-3 Uhr Spezialisten)
- "Pharma & Freizeitchemie" (Selbsterklärend)
- "Kommunikation & Klatsch" (Gossip, Influencer)
- "Immobilien & Hinterzimmer" (VIP-Areas)
- "Finanzdienstleistungen" (Die, die immer "was haben")
```

---

## 4. Batch Stock Generation (Seeding)

**Location**: `scripts/seed_ai.py` → `STOCK_GENERATION_PROMPT`
**Command**: `python -m scripts.seed_ai [count]`

**Key Features**:
- Ticker as wordplay (COKE, FLEX, VIBE, NOSE, GOLD)
- Diverse archetypes (DJ, Influencer, Banker, Dealer, Erbin, Promoter...)
- Varied description styles
- Gender/style diversity

**Example Tickers**:
```
"COKE" → Schneewittchen
"FLEX" → Rolex-Rolf
"VIBE" → DJ Endorphin
"NOSE" → Powder-Paula
"GOLD" → Champagner-Charlotte
```

---

## 5. Image Generation

**Location**: `src/app/routers/ai.py` → `IMAGE_PROMPTS`
**Endpoint**: `POST /ai/generate/image`

### MAIN (Portrait)
```
Corporate portrait photo for a Zurich party personality stock called '{title}'.
Professional headshot lighting with a satirical twist. The subject exudes
self-importance and excessive confidence. Style: 1980s corporate meets modern
influencer culture. Slight VHS grain or film texture. Gold and black color
accents. Think: Wolf of Wall Street meets Zurich club scene.
```

### LOGO
```
Minimalist corporate logo for '{title}', a satirical Zurich party stock.
Swiss design principles: clean lines, geometric shapes, single accent color.
Hidden satirical element optional (champagne glass, pill outline).
Style: luxury Swiss bank rebranded for the club scene.
```

### BILLBOARD
```
Highway billboard advertisement for stock '{title}'. Dramatic nighttime
lighting, bold text 'INVEST NOW'. Confident person in expensive attire.
Intentionally tacky aesthetic like late-night infomercial or casino ad.
Style: Las Vegas meets Swiss private banking.
```

### WEBSITE
```
Hero section of corporate website for '{title}'. Modern SaaS dark mode,
gradient background, glassmorphism UI. Absurdly corporate buzzwords:
'Synergizing Excellence', 'Disrupting Disruption'.
Style: fintech startup designed by someone who parties too much.
```

---

## 6. Video Generation

**Location**: `src/app/routers/ai.py` → `VIDEO_PROMPT`
**Endpoint**: `POST /ai/generate/video`

```
Corporate stock advertisement for '{title}', a satirical Zurich party personality.
Scene breakdown:
(1) Slow zoom on logo or confident person's face, dramatic lighting, 2 seconds.
(2) Abstract stock chart animation trending upward, green numbers flying, 2 seconds.
(3) Person in expensive suit nodding approvingly, champagne glass visible, 2 seconds.
(4) Final frame: '{title}' text with 'INVEST NOW' call-to-action, gold on black.
Overall style: 1980s VHS corporate video aesthetic with slight grain and scan lines.
Color palette: gold, black, green (money colors). Implied dramatic synth music.
Tone: satirical take on Wolf of Wall Street meets Swiss banking commercial.
```

---

## Implementation Status

| Feature | Endpoint | Status |
|---------|----------|--------|
| Description | `POST /ai/generate/description` | ✅ |
| Headlines | `POST /ai/generate/headlines` | ✅ |
| Stock groups | `GET /ai/generate/stock-groups` | ✅ |
| Image | `POST /ai/generate/image` | ✅ |
| Video | `POST /ai/generate/video` | ✅ |
| Batch seeding | `python -m scripts.seed_ai` | ✅ |
