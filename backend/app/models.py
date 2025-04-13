# app/models.py
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from app.base import Base

class User(SQLAlchemyBaseUserTable[int], Base):
    __tablename__ = "user"
    id: Mapped[int] = mapped_column(primary_key=True)
    access_tokens: Mapped[list["AccessToken"]] = relationship(back_populates="user")

class AccessToken(Base):
    __tablename__ = "access_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))
    user: Mapped["User"] = relationship(back_populates="access_tokens")