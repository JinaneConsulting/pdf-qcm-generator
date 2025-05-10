# app/models/folder_model.py
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, ForeignKey, String, DateTime, Text, func, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.base import Base

class Folder(Base):
    __tablename__ = "folders"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    
    # Relations
    user: Mapped["User"] = relationship("User", back_populates="folders")
    parent: Mapped[Optional["Folder"]] = relationship("Folder", remote_side=[id], back_populates="children")
    children: Mapped[List["Folder"]] = relationship("Folder", back_populates="parent", cascade="all, delete-orphan")
    
    # Relation avec les PDF (si un PDF peut être dans un dossier)
    pdfs: Mapped[List["PDF"]] = relationship("PDF", back_populates="folder", cascade="all, delete-orphan")