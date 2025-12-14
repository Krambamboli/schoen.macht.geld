from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncEngine
from sqladmin import Admin, ModelView

from app.models.stock import PriceHistory, Stock


class StockAdmin(ModelView, model=Stock):
    column_list = ["ticker", "nickname", "current_value", "initial_value", "rank", "created_at"]
    column_searchable_list = ["ticker", "nickname"]
    column_sortable_list = ["ticker", "current_value", "rank"]
    column_default_sort = [("current_value", True)]
    form_excluded_columns = ["history", "created_at", "updated_at"]
    can_export = False


class PriceHistoryAdmin(ModelView, model=PriceHistory):
    column_list = ["ticker", "value", "timestamp"]
    column_sortable_list = ["ticker", "timestamp"]
    column_default_sort = [("timestamp", True)]
    can_create = False
    can_edit = False
    can_export = False


def setup_admin(app: FastAPI, engine: AsyncEngine) -> Admin:
    admin = Admin(app, engine, title="Schoen Macht Geld Admin")
    admin.add_view(StockAdmin)
    admin.add_view(PriceHistoryAdmin)
    return admin
