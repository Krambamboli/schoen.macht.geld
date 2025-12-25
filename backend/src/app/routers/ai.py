import json
import re
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from loguru import logger
from sqlalchemy import func
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.ai_task import AITask, ImageType, TaskStatus, TaskType
from app.models.stock import PriceEvent, Stock
from app.schemas.ai import (
    AITaskCreateResponse,
    AITaskResponse,
    ApplyResultRequest,
    GenerateDescriptionRequest,
    GenerateImageRequest,
    GenerateVideoRequest,
    HeadlinesResponse,
    MessageResponse,
    StockGroup,
    StockGroupsResponse,
    StockInGroup,
)
from app.services.ai import AIError, ai

router = APIRouter()

# Prompt templates (German, Party-Themed for "Schön. Macht. Geld.")
DESCRIPTION_PROMPT = """Du bist ein Ghostwriter für die exzessive Zürcher Partyszene und
schreibst witzige, bissige "Börsenprospekte" für das Partyspiel "Schön. Macht. Geld.".
Das Spiel wird vom "Verein für ambitionierten Konsum (VAK)" und dem Club "Amphitheater"
veranstaltet. Das Motto: hedonistischer Konsum, Macht, Schönheit und Drogen.

Schreibe eine sarkastische, ironische und prahlerische Profilbeschreibung für die Aktie,
basierend auf dem Aktientitel (Name der Person/Firma).

Aktientitel: {title}
Aktuelle Beschreibung (falls vorhanden): {description}

Regeln:
1. **Stil:** Variiere zwischen verschiedenen Formaten:
   - Ich-Perspektive (prahlerisch, selbstverliebt)
   - Corporate Mission Statement (Unternehmensphilosophie-Parodie)
   - Investor Pitch (Q3 Highlights, Kerngeschäft, Prognosen)
   - Tagline (kurz, prägnant, memorable)
2. **Ton:** Selbstverliebt, sarkastisch, satirisch. Mische Finanzjargon mit Party-Slang.
3. **Themen:** Zürcher Nachtleben, Konsum, Status, Oberflächlichkeit, Exzesse,
   Networking, VIP-Kultur, fragwürdige Substanzen, Afterhours.
4. **Länge:** Maximal 500 Zeichen (inkl. Leerzeichen).
5. **Sprache:** Deutsch.

Beispiele (variiere den Stil!):
- "Mission Statement: Wir maximieren hedonistische Rendite bei minimalem Verantwortungs-
  bewusstsein. Unsere Kernkompetenz? Networking zwischen 2 und 6 Uhr morgens."
- "Unternehmensphilosophie: Move fast and break hearts. Unsere Stakeholder sind alle,
  die meine Nummer haben. Meine Shareholder sind alle, die sie gerne hätten."
- "Premium seit der Geburt. Exklusiv bis zum Blackout."
- "Think different. Sniff different."
- "Just do it. Frag nicht was."
- "The Future is Now. Der Kater ist Morgen."
- "Kerngeschäft: strategische Präsenz an exklusiven Locations. Wettbewerbsvorteil:
  Ich kenne den Türsteher. Risikohinweis: keiner."
- "Ich bin keine Investition – ich bin ein Lifestyle. Wer mich kauft, kauft Zugang
  zu Räumen, die auf keiner Karte existieren. Terms & Conditions: Es gibt keine."
- "Analyst*innen empfehlen: STRONG BUY. Meine Ex empfiehlt: SELL. Der Markt
  entscheidet. Der Markt bin ich."
- "Mein Portfolio besteht aus Vitamin K, fragwürdigen Entscheidungen und einem
  Netzwerk aus Menschen, die alle 'irgendwas mit Medien' machen. ROI? Return on
  Intoxication."
- "Mein Lebenswerk? Eine Studie in exzessiver Selbstüberschätzung, finanziert durch
  Vitamin B und den Glauben, dass Schlaf überbewertet ist. Kaufempfehlung: stark."

Gib nur die Beschreibung aus, keinen anderen Text."""

HEADLINES_PROMPT = """Du bist ein zynischer Finanzredakteur für ein Klatschblatt, das
über das Börsen-Partyspiel "Schön. Macht. Geld." berichtet, veranstaltet vom "Verein für
ambitionierten Konsum (VAK)" und "Amphitheater" in Zürich. Dein Publikum liebt Klatsch,
dunklen Humor und ist fasziniert von der hedonistischen Party-Szene, Konsum, Drogen und
der Absurdität, den Selbstwert an einen Aktienkurs zu koppeln.

Basierend auf den folgenden Informationen über die volatilsten Aktien, generiere ein Set
von genau {count} kurzen, schlagkräftigen und urkomischen Schlagzeilen. Jede Schlagzeile
sollte für sich stehen. Der Ton sollte scharf, ironisch und voller Satire sein. Denk an
eine Mischung aus Society-Klatsch und Finanz-Desaster.

Hier sind die Daten der Top-Aktien:
{stocks_data}

Regeln:
1. **Sentiment passend zur Kursrichtung:**
   - Steigende Aktien (positive Veränderung): Übertriebenes Lob, absurde Erfolgs-
     geschichten, Hype, FOMO, "Genie entdeckt", "Investor-Liebling"
   - Fallende Aktien (negative Veränderung): Dramatische Abstürze, Skandale, Gerüchte,
     Schadenfreude, "Absturz des Jahres", "Panikverkäufe", "War da was auf dem Klo?"
2. **Jede Schlagzeile MUSS den Aktientitel ODER das Börsenkürzel enthalten.**
3. **Achte auf korrekte deutsche Rechtschreibung und Umlaute (ä, ö, ü).**
4. **Themen:** Soziale Kletterei, vergänglicher Ruhm, Party-Fails, Exzesse im Zürcher
   Nachtleben, VIP-Abstiege, Afterhour-Tragödien, Networking-Katastrophen.

Generiere {count} einzigartige Schlagzeilen. Sei provokant und einprägsam.

Gib die Schlagzeilen als JSON-Array aus:
["Schlagzeile 1", "Schlagzeile 2", ...]

Nutze die folgenden Markups/Formatierungsmarker in den Schlagzeilen:
- Prozentwerte/Prozentuale Preisänderung: [percent]12.3%[/percent]
- Preise/Schweizer Franken/CHF: [price]123.45 CHF[/price]
- Aktien Name/stock title: [title]Aktien AG[/title]
- Aktien Symbol/stock symbol: [symbol]AAAG[/symbol]
Nicht alle Markups müssen in jeder Schlagzeile vorkommen.

SEHR WICHTIG: Nur das JSON-Array der formatierten Schlagzeilen, kein anderer Text.
"""

IMAGE_PROMPTS = {
    ImageType.MAIN: (
        "Corporate portrait photo for a Zurich party personality stock called '{title}'. "
        "Professional headshot lighting with a satirical twist. The subject exudes "
        "self-importance and excessive confidence. Style: 1980s corporate meets modern "
        "influencer culture. Slight VHS grain or film texture. Gold and black color "
        "accents. The person looks like they just came from a champagne-fueled networking "
        "event. Subtle absurdity: maybe an out-of-place luxury item, unusual background, "
        "or slightly too-perfect hair. Think: Wolf of Wall Street meets Zurich club scene."
    ),
    ImageType.LOGO: (
        "Minimalist corporate logo for '{title}', a satirical Zurich party stock. "
        "Swiss design principles: clean lines, geometric shapes, single accent color. "
        "No text, white or dark background. Hidden satirical element optional (subtle "
        "party reference, champagne glass shape, pill outline, etc.). Style: if a "
        "luxury Swiss bank rebranded for the club scene. Vector-ready, simple enough "
        "to work at small sizes. Colors: gold, black, or neon accents."
    ),
    ImageType.BILLBOARD: (
        "Highway billboard advertisement for stock '{title}'. Dramatic nighttime "
        "lighting, bold sans-serif text saying 'INVEST NOW' or 'BUY {title}'. "
        "Features a confident person in expensive attire looking directly at viewer. "
        "Intentionally tacky aesthetic like a late-night infomercial or casino ad. "
        "Lens flares, gold gradients, stock chart going up in background. "
        "Style: Las Vegas meets Swiss private banking. Slightly desperate energy. "
        "Think: the kind of ad that makes you question capitalism."
    ),
    ImageType.WEBSITE: (
        "Hero section screenshot of a corporate website for '{title}'. Modern SaaS "
        "aesthetic with dark mode, gradient background (purple to black or gold to "
        "black). Floating glassmorphism UI elements. Absurdly corporate buzzwords "
        "visible: 'Synergizing Excellence', 'Disrupting Disruption', 'Premium Human "
        "Capital'. Fake testimonials or trust badges. Stock chart graphic. "
        "Style: if a fintech startup was designed by someone who parties too much. "
        "Clean typography, too many gradient buttons, subtle particle effects."
    ),
}

VIDEO_PROMPT = (
    "Corporate stock advertisement for '{title}', a satirical Zurich party personality. "
    "Scene breakdown: "
    "(1) Slow zoom on logo or confident person's face, dramatic lighting, 2 seconds. "
    "(2) Abstract stock chart animation trending upward, green numbers flying, 2 seconds. "
    "(3) Person in expensive suit nodding approvingly, champagne glass visible, 2 seconds. "
    "(4) Final frame: '{title}' text with 'INVEST NOW' call-to-action, gold on black. "
    "Overall style: 1980s VHS corporate video aesthetic with slight grain and scan lines. "
    "Color palette: gold, black, green (money colors). Implied dramatic synth music. "
    "Tone: satirical take on Wolf of Wall Street meets Swiss banking commercial. "
    "The whole thing should feel like a parody of excess and self-importance."
)

STOCK_GROUPS_PROMPT = """Du bist ein kreativer Finanzanalyst für das Partyspiel
"Schön. Macht. Geld.", veranstaltet vom "Verein für ambitionierten Konsum (VAK)"
und dem Club "Amphitheater" in Zürich.

Erstelle lustige, satirische "Sektoren" (Branchen/Kategorien) für die folgenden Aktien.
Sektoren sind KATEGORIEN, in die mehrere Aktien gruppiert werden – wie Branchen an
der echten Börse, aber satirisch auf das Zürcher Nachtleben bezogen.

Aktien:
{stocks_list}

Gruppiere diese {stock_count} Aktien in genau {group_count} Sektoren.
Jeder Sektor soll 2-4 Aktien enthalten.

Regeln:
1. **Sektornamen sind KATEGORIEN**, nicht Firmennamen. Sie beschreiben eine Gruppe
   von ähnlichen "Persönlichkeiten" oder "Geschäftsfeldern".
2. **Analysiere die Aktientitel** und gruppiere nach gemeinsamen Themen, Vibes oder
   Archetypen (z.B. alle Party-Starter zusammen, alle Networker zusammen).
3. **Variiere den Stil:** Mal als Branche, mal als Bewegung, mal als Phänomen.

Beispiele für Sektornamen (KATEGORIEN, nicht Firmennamen!):
- "Nachtaktive Rohstoffe" (Substanzen, Konsumgüter)
- "Luxusgüter & Eitelkeiten" (Appearance-fokussierte Persönlichkeiten)
- "Entertainment & Eskalation" (DJs, Performer, Party-Starter)
- "Blue Chip Beauties" (Zuverlässig attraktive Dauerbrenner)
- "Stabile Seitwärtsbewegung" (Immer da, nie aufregend)
- "Frühschicht-Veteranen" (Die 6-Uhr-morgens-Überlebenden)
- "Peak-Hour Performers" (1-3 Uhr Spezialisten)
- "Pharma & Freizeitchemie" (Selbsterklärend)
- "Kommunikation & Klatsch" (Gossip, Drama, Influencer)
- "Transport & Eskapismus" (Immer am Gehen, Kommen, Verschwinden)
- "Immobilien & Hinterzimmer" (VIP-Areas, exklusive Spaces)
- "Finanzdienstleistungen" (Die, die immer "was haben")

Gib das Ergebnis als JSON-Array aus:
[
  {{"name": "Sektor Name", "stocks": ["TICK1", "TICK2"]}},
  ...
]

Wichtig: Verwende nur die exakten Ticker aus der Liste oben."""


async def _get_stock_or_none(session: AsyncSession, ticker: str | None) -> Stock | None:
    """Get stock by ticker or return None."""
    if not ticker:
        return None
    return await session.get(Stock, ticker)


@router.post("/generate/description")
async def generate_description(
    request: GenerateDescriptionRequest,
    session: AsyncSession = Depends(get_session),
) -> AITaskCreateResponse:
    """Start generating a stock description."""
    stock = await _get_stock_or_none(session, request.ticker)

    # Determine title and description
    title = request.title or (stock.title if stock else None)
    description = request.description or (stock.description if stock else "")

    if not title:
        raise HTTPException(
            status_code=400, detail="Either ticker or title must be provided"
        )

    # Build prompt
    prompt = DESCRIPTION_PROMPT.format(title=title, description=description or "None")

    # Create task
    task = AITask(
        ticker=request.ticker,
        task_type=TaskType.DESCRIPTION,
        prompt=prompt,
        model=request.model or settings.atlascloud_text_model,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)

    logger.info("Created description task {} for {}", task.id, title)
    return AITaskCreateResponse(
        task_id=task.id,
        status=task.status,
        message=f"Description generation started for '{title}'",
    )


@router.post("/generate/image")
async def generate_image(
    request: GenerateImageRequest,
    session: AsyncSession = Depends(get_session),
) -> AITaskCreateResponse:
    """Start generating an image for a stock."""
    stock = await _get_stock_or_none(session, request.ticker)

    title = request.title or (stock.title if stock else None)
    if not title:
        raise HTTPException(
            status_code=400, detail="Either ticker or title must be provided"
        )

    # Build prompt from template
    default_prompt = IMAGE_PROMPTS[ImageType.MAIN]
    prompt_template = IMAGE_PROMPTS.get(request.image_type, default_prompt)
    prompt = prompt_template.format(title=title)

    # Create task
    task = AITask(
        ticker=request.ticker,
        task_type=TaskType.IMAGE,
        prompt=prompt,
        model=request.model or settings.atlascloud_image_model,
        image_type=request.image_type,
        arguments={"width": 1280, "height": 1280,},
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)

    logger.info("Created image task {} ({}) for {}", task.id, request.image_type, title)
    return AITaskCreateResponse(
        task_id=task.id,
        status=task.status,
        message=f"Image ({request.image_type.value}) generation started for '{title}'",
    )


@router.post("/generate/video")
async def generate_video(
    request: GenerateVideoRequest,
    session: AsyncSession = Depends(get_session),
) -> AITaskCreateResponse:
    """Start generating a video ad for a stock."""
    stock = await _get_stock_or_none(session, request.ticker)

    title = request.title or (stock.title if stock else None)
    if not title:
        raise HTTPException(
            status_code=400, detail="Either ticker or title must be provided"
        )

    prompt = VIDEO_PROMPT.format(title=title)

    # Choose model based on whether we have a source image
    if request.source_image_url:
        model = request.model or settings.atlascloud_video_i2v_model
    else:
        model = request.model or settings.atlascloud_video_t2v_model

    # Create task
    task = AITask(
        ticker=request.ticker,
        task_type=TaskType.VIDEO,
        prompt=prompt,
        model=model,
        arguments={"width": 832, "height": 480,},
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)

    logger.info("Created video task {} for {}", task.id, title)
    return AITaskCreateResponse(
        task_id=task.id,
        status=task.status,
        message=f"Video generation started for '{title}'",
    )


@router.post("/generate/headlines")
async def generate_headlines(
    count: int = 5,
    session: AsyncSession = Depends(get_session),
) -> HeadlinesResponse:
    """
    Generate satirical news headlines about the top volatile stocks.

    Returns headlines immediately (synchronous generation).
    """

    # Clamp count to valid range
    count = max(1, min(10, count))

    # Get stocks with reference_price (needed for percentage_change)
    # Relationships default to noload
    query = (
        select(Stock)
        .where(col(Stock.reference_price).is_not(None))
        .limit(count * 2)  # Get extra to sort by volatility
    )
    result = await session.exec(query)
    stocks = list(result.all())

    if not stocks:
        return HeadlinesResponse(headlines=[], stocks_used=[])

    # Fetch latest price per stock in a single query
    tickers = [s.ticker for s in stocks]
    events_subq = (
        select(
            PriceEvent.ticker,
            PriceEvent.price,
            func.row_number()
            .over(
                partition_by=PriceEvent.ticker,
                order_by=col(PriceEvent.created_at).desc(),
            )
            .label("rn"),
        )
        .where(col(PriceEvent.ticker).in_(tickers))
        .subquery()
    )
    events_query = select(
        events_subq.c.ticker,
        events_subq.c.price,
    ).where(events_subq.c.rn == 1)
    events_result = await session.exec(events_query)
    price_by_ticker = {ticker: price for ticker, price in events_result.all()}  # pyright: ignore[reportAny]

    # Sort by absolute percentage change and take top N
    stocks = sorted(
        stocks,
        key=lambda s: abs(s.percentage_change or 0),
        reverse=True,
    )[:count]

    # Build stocks data string for prompt (use fetched prices)
    stocks_data = "\n".join(
        f"- Börsenkürzel: {s.ticker}, Spitzname: {s.title}, Aktueller Wert: "
        + f"{price_by_ticker.get(s.ticker, s.reference_price or 0):.2f} CHF, "
        + "Veränderung: "
        + f"{(price_by_ticker.get(s.ticker, 0) - (s.reference_price or 0)):.2f} CHF"
        + f"({s.percentage_change:.2f}%)"
        for s in stocks
    )

    prompt = HEADLINES_PROMPT.format(count=count, stocks_data=stocks_data)

    # Generate headlines using unified AI client (handles fallback automatically)
    try:
        response_text = await ai.generate_text(prompt, max_tokens=count * 500)
    except AIError as e:
        logger.error("AI generation failed: {}", e)
        raise HTTPException(status_code=503, detail="AI service unavailable")

    # Parse JSON array from response
    try:
        json_match = re.search(r"\[.*\]", response_text, re.DOTALL)
        if json_match:
            headlines = json.loads(json_match.group())  # pyright: ignore[reportAny]
        else:
            # Fallback: split by newlines and clean up
            headlines = [
                line.strip().strip('"').strip("'")
                for line in response_text.split("\n")
                if line.strip()
                and not line.startswith("[")
                and not line.startswith("]")
            ]
    except json.JSONDecodeError:
        headlines = [response_text.strip()]

    logger.info(
        "Generated {} headlines for stocks: {}",
        len(headlines),
        [s.ticker for s in stocks],
    )
    return HeadlinesResponse(
        headlines=headlines[:count],
        stocks_used=[s.ticker for s in stocks],
    )


@router.get("/generate/stock-groups")
async def generate_stock_groups(
    session: AsyncSession = Depends(get_session),
) -> StockGroupsResponse:
    """
    Generate AI-created sector groupings for random stocks.

    Returns groups of stocks with satirical sector names for sunburst visualization.
    """
    import random

    # Fetch all stocks with prices
    query = select(Stock).where(col(Stock.price).is_not(None))
    result = await session.exec(query)
    all_stocks = list(result.all())

    if len(all_stocks) < 6:
        # Not enough stocks for meaningful groups
        return StockGroupsResponse(groups=[])

    # Select 12-18 random stocks (or all if fewer)
    stock_count = min(len(all_stocks), random.randint(4, 12))
    selected_stocks = random.sample(all_stocks, stock_count)

    # Determine number of groups (2-4 based on stock count)
    group_count = min(4, max(2, stock_count // 3))

    # Build stocks list for prompt
    stocks_list = "\n".join(f"- {s.ticker}: {s.title}" for s in selected_stocks)

    prompt = STOCK_GROUPS_PROMPT.format(
        stocks_list=stocks_list,
        stock_count=stock_count,
        group_count=group_count,
    )

    # Generate groupings using AI
    try:
        response_text = await ai.generate_text(prompt, max_tokens=1500)
    except AIError as e:
        logger.error("AI generation failed for stock groups: {}", e)
        raise HTTPException(status_code=503, detail="AI service unavailable")

    # Parse JSON response
    try:
        json_match = re.search(r"\[.*\]", response_text, re.DOTALL)
        if json_match:
            raw_groups = json.loads(json_match.group())  # pyright: ignore[reportAny]
        else:
            raise ValueError("No JSON array found in response")
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(
            "Failed to parse stock groups JSON: {} - Response: {}", e, response_text
        )
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    # Build stock lookup for enrichment
    stock_lookup = {s.ticker: s for s in selected_stocks}

    # Transform to response format with enriched stock data
    groups: list[StockGroup] = []
    for raw_group in raw_groups:  # pyright: ignore[reportAny]
        group_name = raw_group.get("name", "Unbenannter Sektor")  # pyright: ignore[reportAny]
        group_tickers = raw_group.get("stocks", [])  # pyright: ignore[reportAny]

        stocks_in_group: list[StockInGroup] = []
        for ticker in group_tickers:  # pyright: ignore[reportAny]
            stock = stock_lookup.get(ticker)  # pyright: ignore[reportAny]
            if stock:
                stocks_in_group.append(
                    StockInGroup(
                        ticker=stock.ticker,
                        title=stock.title,
                        price=stock.price or 0.0,
                        percent_change=stock.percentage_change or 0.0,
                    )
                )

        if stocks_in_group:  # Only add non-empty groups
            groups.append(StockGroup(name=group_name, stocks=stocks_in_group))  # pyright: ignore[reportAny]

    logger.info(
        "Generated {} stock groups with {} total stocks",
        len(groups),
        sum(len(g.stocks) for g in groups),
    )
    return StockGroupsResponse(groups=groups)


@router.get("/tasks")
async def list_tasks(
    session: AsyncSession = Depends(get_session),
    status: TaskStatus | None = None,
    task_type: TaskType | None = None,
) -> list[AITaskResponse]:
    """List all AI tasks, optionally filtered by status or type."""
    query = select(AITask).order_by(col(AITask.created_at).desc())

    if status:
        query = query.where(AITask.status == status)
    if task_type:
        query = query.where(AITask.task_type == task_type)

    result = await session.exec(query)
    tasks = result.all()
    return [AITaskResponse.model_validate(t) for t in tasks]


@router.get("/tasks/{task_id}")
async def get_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
) -> AITaskResponse:
    """Get a specific AI task by ID."""
    task = await session.get(AITask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return AITaskResponse.model_validate(task)


@router.post("/tasks/{task_id}/apply")
async def apply_result(
    task_id: str,
    request: ApplyResultRequest,
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    """Apply a completed task's result to a stock."""
    task = await session.get(AITask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task is not completed")

    if not task.result:
        raise HTTPException(status_code=400, detail="Task has no result")

    stock = await session.get(Stock, request.ticker)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")

    # Apply result based on task type
    if task.task_type == TaskType.DESCRIPTION:
        stock.description = task.result
        stock.updated_at = datetime.now(UTC)
        session.add(stock)
        await session.commit()
        logger.info("Applied description from task {} to {}", task_id, request.ticker)
        return MessageResponse(message=f"Description applied to {request.ticker}")

    elif task.task_type == TaskType.IMAGE:
        # For images, result is a file path - would need to copy/move file
        return MessageResponse(
            message=f"Image at {task.result} ready to apply to {request.ticker}",
            note="Manual image upload required for now",
        )

    elif task.task_type == TaskType.VIDEO:
        return MessageResponse(
            message=f"Video at {task.result} ready for {request.ticker}",
            note="Videos are stored separately, not applied to stock directly",
        )

    return MessageResponse(message="Unknown task type")


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    session: AsyncSession = Depends(get_session),
) -> MessageResponse:
    """Delete an AI task."""
    task = await session.get(AITask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await session.delete(task)
    await session.commit()

    logger.info("Deleted task {}", task_id)
    return MessageResponse(message=f"Task {task_id} deleted")
