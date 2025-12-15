from fastapi import FastAPI
from sqladmin import Admin, ModelView
from sqlalchemy.ext.asyncio import AsyncEngine

from app.models.stock import Stock, StockPrice


class StockAdmin(ModelView, model=Stock):
    column_list = ["ticker", "title", "is_active", "created_at"]
    column_searchable_list = ["ticker", "title"]
    column_sortable_list = ["ticker", "is_active"]
    column_default_sort = [("ticker", False)]
    form_excluded_columns = ["prices", "created_at", "updated_at"]
    can_export = False


class StockPriceAdmin(ModelView, model=StockPrice):
    column_list = ["id", "ticker", "price", "change_type", "created_at"]
    column_sortable_list = ["id", "ticker", "created_at"]
    column_default_sort = [("created_at", True)]
    can_create = False
    can_edit = False
    can_export = False


def setup_admin(app: FastAPI, engine: AsyncEngine) -> Admin:
    admin = Admin(app, engine, title="Schoen Macht Geld Admin")
    admin.add_view(StockAdmin)
    admin.add_view(StockPriceAdmin)
    return admin
