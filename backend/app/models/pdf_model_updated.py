# app/models/pdf_model.py - Version mise à jour avec support des dossiers
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, String, Boolean, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.base import Base

class PDF(Base):
    __tablename__ = "pdfs"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    filepath: Mapped[str] = mapped_column(String(1024), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)  # en octets
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    
    # Ajout de la relation avec les dossiers
    folder_id: Mapped[Optional[int]] = mapped_column(ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    
    # Relations
    user: Mapped["User"] = relationship("User", back_populates="pdfs")
    folder: Mapped[Optional["Folder"]] = relationship("Folder", back_populates="pdfs")
    
    # Statut du fichier
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Métadonnées supplémentaires
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)