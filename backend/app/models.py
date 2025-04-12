### models.py

import uuid
from typing import Optional
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from fastapi_users import schemas

from sqlalchemy import Column, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(SQLAlchemyBaseUserTableUUID, Base):
    full_name = Column(String, nullable=True)

class UserCreate(schemas.BaseUserCreate):
    full_name: Optional[str] = None

class UserRead(schemas.BaseUser[uuid.UUID]):
    email: str
    full_name: Optional[str] = None
    is_verified: bool

class UserUpdate(schemas.BaseUserUpdate):
    full_name: Optional[str] = None
