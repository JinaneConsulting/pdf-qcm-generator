# app/base.py
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    __allow_unmapped__ = True  # Important pour SQLAlchemy 2.x