# app/models.py
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, LargeBinary, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTable
from app.base import Base
from app.security.encryption import decrypt_data, encrypt_data 

class User(SQLAlchemyBaseUserTable[int], Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    _encrypted_email = mapped_column(LargeBinary, nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String(1024))
    is_active: Mapped[bool] = mapped_column(default=True)
    is_superuser: Mapped[bool] = mapped_column(default=False)
    is_verified: Mapped[bool] = mapped_column(default=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_picture: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)    
    access_tokens: Mapped[list["AccessToken"]] = relationship(back_populates="user")
    oidc_sub: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, name="sub")
    _encrypted_sub = mapped_column(LargeBinary, nullable=True)
    
    __table_args__ = (UniqueConstraint('_encrypted_email', name='uq_users_encrypted_email'),)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()  # Date automatique par la base de données
    )

    # Propriétés pour accéder aux données déchiffrées

    @property
    def email(self):
        return decrypt_data(self._encrypted_email)

    @email.setter
    def email(self, value):
        self._encrypted_email = encrypt_data(value)

    @property
    def sub(self):
        return decrypt_data(self._encrypted_sub) if self._encrypted_sub else None

    @sub.setter
    def sub(self, value):
        self._encrypted_sub = encrypt_data(value) if value else None

class AccessToken(Base):
    __tablename__ = "access_tokens"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    user: Mapped["User"] = relationship(back_populates="access_tokens")

