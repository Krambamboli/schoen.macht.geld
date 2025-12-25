from typing import Any, override

from fastapi import FastAPI, HTTPException
from loguru import logger
from sqladmin import Admin, ModelView, action
from sqladmin.helpers import is_async_session_maker
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlmodel import col
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response

from app.config import settings
from app.models.ai_task import AITask
from app.models.stock import PriceEvent, Stock, StockSnapshot
from app.routers.ai import DESCRIPTION_PROMPT
from app.services.ai import AIError, ai
from app.storage import ALLOWED_IMAGE_TYPES, cleanup_old_image


class StockAdmin(ModelView, model=Stock):
    column_list = ["ticker", "title", "is_active", "created_at"]
    column_details_list = [
        "ticker",
        "title",
        "description",
        "is_active",
        "created_at",
        "updated_at",
        "snapshots",
        "price_events",
        "ai_tasks",
    ]
    column_searchable_list = ["ticker", "title"]
    column_sortable_list = ["ticker", "is_active"]
    column_default_sort = [("ticker", False)]
    column_formatters_detail = {
        "snapshots": lambda m, _: [repr(p) for p in m.snapshots],  # pyright: ignore[reportUnknownLambdaType, reportUnknownMemberType, reportUnknownArgumentType]
        "price_events": lambda m, _: [repr(p) for p in m.price_events],  # pyright: ignore[reportUnknownLambdaType, reportUnknownMemberType, reportUnknownArgumentType]
    }
    form_include_pk = True
    form_widget_args = {"image": {"accept": "image/*", "capture": "environment"}}
    form_excluded_columns = [
        "price_events",
        "snapshots",
        "created_at",
        "updated_at",
        "ai_tasks",
    ]
    can_export = False

    @action(  # pyright: ignore[reportAny]
        name="regenerate description",
        label="Gen-Desc",
        add_in_detail=True,
    )
    async def regenerate_description(self, request: Request) -> Response:
        pks = request.query_params.get("pks") or ""
        stock_pks = pks.split(",")
        stmt = self.list_query(request).filter(col(Stock.ticker).in_(stock_pks))  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]
        stocks = await self._run_query(stmt)  # pyright: ignore[reportAny, reportUnknownArgumentType]
        for stock in stocks:  # pyright: ignore[reportAny]
            # Build prompt
            title = str(stock.title)  # pyright: ignore[reportAny]
            description = str(
                stock.description  # pyright: ignore[reportAny]
            )  # TODO(mg): Use image analysis and stuff!
            prompt = DESCRIPTION_PROMPT.format(
                title=title, description=description or "None"
            )

            # Generate description using unified AI client
            try:
                stock.description = await ai.generate_text(prompt, max_tokens=500)
            except AIError as e:
                logger.error("AI generation failed: {}", e)
                raise HTTPException(status_code=503, detail="AI service unavailable")

        if is_async_session_maker(self.session_maker):  # pyright: ignore[reportUnknownMemberType, reportArgumentType]
            async with self.session_maker() as session:  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]
                for stock in stocks:  # pyright: ignore[reportAny]
                    session.add(stock)  # pyright: ignore[reportUnknownMemberType]
                await session.commit()  # pyright: ignore[reportUnknownMemberType]
        else:
            with self.session_maker() as session:  # pyright: ignore[reportUnknownMemberType]
                for stock in stocks:  # pyright: ignore[reportAny]
                    session.add(stock)  # pyright: ignore[reportUnknownMemberType]
                session.commit()  # pyright: ignore[reportUnknownMemberType]

        referer = request.headers.get("Referer")
        if referer:
            return RedirectResponse(referer)
        else:
            return RedirectResponse(
                request.url_for("admin:list", identity=self.identity)
            )

    @action(  # pyright: ignore[reportAny]
        name="clear price history",
        label="Clear History",
        confirmation_message="Are you sure?",
        add_in_detail=True,
    )
    async def clear_history(self, request: Request) -> Response:
        pks = request.query_params.get("pks") or ""
        stock_pks = pks.split(",")
        if is_async_session_maker(self.session_maker):  # pyright: ignore[reportUnknownMemberType, reportArgumentType]
            async with self.session_maker() as session:  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]
                for pk in stock_pks:
                    # Delete all price events belonging to stock
                    stmt = delete(PriceEvent).where(col(PriceEvent.ticker) == pk)
                    _ = await session.execute(stmt)  # pyright: ignore[reportUnknownMemberType]
                    # Delete all stock snapshots belonging to stock
                    stmt = delete(StockSnapshot).where(col(StockSnapshot.ticker) == pk)
                    _ = await session.execute(stmt)  # pyright: ignore[reportUnknownMemberType]
                await session.commit()  # pyright: ignore[reportUnknownMemberType]
        else:
            with self.session_maker() as session:  # pyright: ignore[reportUnknownMemberType]
                for pk in stock_pks:
                    # Delete all price events belonging to stock
                    stmt = delete(PriceEvent).where(col(PriceEvent.ticker) == pk)
                    _ = session.execute(stmt)  # pyright: ignore[reportUnknownMemberType]
                    # Delete all stock snapshots belonging to stock
                    stmt = delete(StockSnapshot).where(col(StockSnapshot.ticker) == pk)
                    _ = session.execute(stmt)  # pyright: ignore[reportUnknownMemberType]
                session.commit()  # pyright: ignore[reportUnknownMemberType]

        referer = request.headers.get("Referer")
        if referer:
            return RedirectResponse(referer)
        else:
            return RedirectResponse(
                request.url_for("admin:list", identity=self.identity)
            )

    @override
    async def on_model_change(
        self,
        data: dict[str, Any],  # pyright: ignore[reportExplicitAny]
        model: Stock,
        is_created: bool,
        request: Request,
    ) -> None:
        """Validate image before model change."""
        image = data.get("image")

        if image and hasattr(image, "content_type"):  # pyright: ignore[reportAny]
            # Validate content type
            if image.content_type not in ALLOWED_IMAGE_TYPES:  # pyright: ignore[reportAny]
                raise ValueError(
                    f"Invalid image type '{image.content_type}'. "  # pyright: ignore[reportAny]
                    + f"Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
                )

            # Validate file size
            if hasattr(image, "size") and image.size is not None:  # pyright: ignore[reportAny]
                if image.size > settings.max_image_size:  # pyright: ignore[reportAny]
                    max_mb = settings.max_image_size / (1024 * 1024)
                    raise ValueError(f"Image too large. Max size: {max_mb:.1f}MB.")
            elif hasattr(image, "file") and image.file:  # pyright: ignore[reportAny]
                # Try to get size by seeking
                current_pos = image.file.tell()  # pyright: ignore[reportAny]
                image.file.seek(0, 2)  # Seek to end  # pyright: ignore[reportAny]
                file_size = image.file.tell()  # pyright: ignore[reportAny]
                image.file.seek(  # pyright: ignore[reportAny]
                    current_pos
                )  # Reset position
                if file_size > settings.max_image_size:
                    max_mb = settings.max_image_size / (1024 * 1024)
                    raise ValueError(f"Image too large. Max size: {max_mb:.1f}MB.")

        # Store old image reference in request.state for cleanup after commit
        # Using request.state makes this per-request, avoiding race conditions
        if not is_created and model.image and image:
            request.state.old_stock_image = model.image
        else:
            request.state.old_stock_image = None

    @override
    async def after_model_change(
        self,
        data: dict[str, Any],  # pyright: ignore[reportExplicitAny]
        model: Stock,
        is_created: bool,
        request: Request,
    ) -> None:
        """Clean up old image after model change."""
        old_image = getattr(request.state, "old_stock_image", None)
        if old_image:
            cleanup_old_image(old_image)  # pyright: ignore[reportAny]
            logger.info("Admin: cleaned up old image for stock {}", model.ticker)


class PriceEventAdmin(ModelView, model=PriceEvent):
    column_list = ["id", "ticker", "price", "change_type", "created_at"]
    column_sortable_list = ["id", "ticker", "created_at"]
    column_default_sort = [("created_at", True)]
    can_create = False
    can_edit = False
    can_export = False
    name = "Price Event"
    name_plural = "Price Events"


class StockSnapshotAdmin(ModelView, model=StockSnapshot):
    column_list = ["id", "ticker", "price", "created_at"]
    column_sortable_list = ["id", "ticker", "created_at"]
    column_default_sort = [("created_at", True)]
    can_create = False
    can_edit = False
    can_delete = False
    can_export = False


class AITaskAdmin(ModelView, model=AITask):
    column_list = [
        "id",
        "ticker",
        "task_type",
        "status",
        "model",
        "created_at",
        "completed_at",
    ]
    column_searchable_list = ["id", "ticker", "prompt"]
    column_sortable_list = ["id", "status", "task_type", "created_at"]
    column_default_sort = [("created_at", True)]
    can_create = False
    can_edit = False
    can_export = False
    name = "AI Task"
    name_plural = "AI Tasks"


def setup_admin(app: FastAPI, engine: AsyncEngine) -> Admin:
    admin = Admin(app, engine, title="Schoen Macht Geld Admin")
    admin.add_view(StockAdmin)
    admin.add_view(PriceEventAdmin)
    admin.add_view(StockSnapshotAdmin)
    admin.add_view(AITaskAdmin)
    return admin
