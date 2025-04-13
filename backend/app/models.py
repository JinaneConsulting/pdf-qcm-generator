import uuid
from sqlalchemy import Column, String, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from pydantic import BaseModel, EmailStr
from typing import Optional

# Classe pour la création d'un utilisateur
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class Config:
    orm_mode = True

# Classe pour la mise à jour d'un utilisateur
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None

class Config:
    orm_mode = True

class AccessToken(Base):
    __tablename__ = "access_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    user = relationship("User", back_populates="tokens")

class User(SQLAlchemyBaseUserTableUUID, Base):
    tokens = relationship("AccessToken", back_populates="user")
    full_name = Column(String, nullable=True)
    