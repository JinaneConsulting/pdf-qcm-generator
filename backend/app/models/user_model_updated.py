# Modification à apporter à app/models/user_model.py

from datetime import datetime
from typing import Optional, List
from sqlalchemy import DateTime, ForeignKey, String, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.base import Base

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_picture: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Ajouter le champ pour suivre la dernière connexion
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Champ pour l'authentification OAuth
    oidc_sub: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    
    # Relations
    access_tokens: Mapped[List["AccessToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    pdfs: Mapped[List["PDF"]] = relationship("PDF", back_populates="user", cascade="all, delete-orphan")
    # Ajout de la relation avec les dossiers
    folders: Mapped[List["Folder"]] = relationship("Folder", back_populates="user", cascade="all, delete-orphan")
    
    def can_login_with_password(self) -> bool:
        """Indique si l'utilisateur peut se connecter avec un mot de passe"""
        return self.hashed_password is not None and len(self.hashed_password) > 0
    
    def is_oauth_user(self) -> bool:
        """Indique si l'utilisateur est connecté via OAuth"""
        return self.oidc_sub is not None
    
    def update_last_login(self):
        """Met à jour la date de dernière connexion"""
        self.last_login = datetime.now()

class AccessToken(Base):
    __tablename__ = "access_tokens"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(1024), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    user: Mapped["User"] = relationship(back_populates="access_tokens")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    
    # Ajouter ces champs pour plus d'informations sur le token
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)