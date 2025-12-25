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
schreibst witzige, bissige "Börsenprospekte" in der Ich-Perspektive für das Partyspiel
"Schön. Macht. Geld.". Das Spiel wird vom "Verein für ambitionierten Konsum (VAK)" und
dem Club "Amphitheater"veranstaltet.
Das Motto: hedonistischer Konsum, Macht, Schönheit und Drogen.

Schreibe eine sarkastische, ironische und prahlerische Profilbeschreibung in der
Ich-Form, basierend auf dem Spitznamen der Person.

Spitzname: {title}
Aktuelle Beschreibung (falls vorhanden): {description}

Regeln:
1. **Perspektive:** Schreibe immer aus der Ich-Perspektive.
2. **Ton:** Selbstverliebt, sarkastisch, satirisch. Mische Finanzjargon mit Party-Slang.
3. **Themen:** Spiele mit Klischees über das Zürcher Nachtleben:
               Konsum, Status, Oberflächlichkeit und Exzesse.
4. **Länge:** Maximal 350 Zeichen (inkl. Leerzeichen).
5. **Sprache:** Deutsch.

Beispiel: "Mein Kurs? Steigt schneller als mein Puls nach der dritten Line. Ich bin
keine Aktie, ich bin ein Gerücht, eine Legende auf dem Zürcher Parkett. Investier
jetzt, bevor ich zu teuer für dein kleines Portfolio werde."

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

Achte auf korrekte deutsche Rechtschreibung und die korrekte Verwendung
von Umlauten (ä, ö, ü).

Hier sind die Daten der Top-Aktien:
{stocks_data}

Generiere {count} einzigartige Schlagzeilen.
Sei provokant und einprägsam. Konzentriere dich auf Themen wie soziale Kletterei,
vergänglichen Ruhm, schlechte Entscheidungen auf Partys, Exzesse im Zürcher Nachtleben
und die Absurdität des Ganzen.

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
        "Corporate stock photo for {title}, professional but slightly off and weird"
    ),
    ImageType.LOGO: (
        "Minimalist corporate logo for {title}, clean vector style, simple design"
    ),
    ImageType.BILLBOARD: (
        "Highway billboard ad for {title} stock, dramatic and absurd"
    ),
    ImageType.WEBSITE: (
        "Screenshot of corporate website hero section for {title}, modern design"
    ),
}

VIDEO_PROMPT = (
    "15-second stock market ad for {title}. Dramatic corporate style "
    "with text overlays showing rising stock prices. Slightly absurd tone."
)

STOCK_GROUPS_PROMPT = """Du bist ein kreativer Finanzanalyst für das Partyspiel
"Schön. Macht. Geld.", veranstaltet vom "Verein für ambitionierten Konsum (VAK)"
und dem Club "Amphitheater" in Zürich.

Erstelle lustige, satirische "Sektoren" für die folgenden Aktien.

Aktien:
{stocks_list}

Gruppiere diese {stock_count} Aktien in genau {group_count} Sektoren.
Jeder Sektor soll 2-4 Aktien enthalten.
Erfinde für jeden Sektor einen witzigen, satirischen Firmennamen, der zum Zürcher
Nachtleben passt.

Beispiele für Sektornamen:
- "Champagner & Tränen AG"
- "Kokain-Konjunktur Holdings"
- "Influencer-Insolvenz Inc."
- "VIP-Bereich Ventures"
- "Afterhour Asset Management"

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
