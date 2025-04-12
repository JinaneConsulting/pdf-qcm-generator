from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from fastapi_users.db import SQLAlchemyBaseUserTable
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase, SQLAlchemyBaseAccessTokenTable
from fastapi_users import schemas
from app.database import Base

class UserRead(schemas.BaseUser[uuid.UUID]):
    pass

class UserCreate(schemas.BaseUserCreate):
    pass

class User(SQLAlchemyBaseUserTable[uuid.UUID], Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(length=320), unique=True, index=True, nullable=False)
    hashed_password = Column(String(length=1024), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    pdfs = relationship("UserPDF", back_populates="user", cascade="all, delete-orphan")

class AccessToken(SQLAlchemyBaseAccessTokenTable[uuid.UUID], Base):
    __tablename__ = "access_tokens"
    
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

class UserPDF(Base):
    __tablename__ = "user_pdfs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_id = Column(String, nullable=False)
    title = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="pdfs")

class PDFUploadResponse(BaseModel):
    file_id: str
    message: str

class QuestionChoice(BaseModel):
    id: str
    text: str

class Question(BaseModel):
    id: str
    text: str
    choices: List[QuestionChoice]
    correct_answer_id: str
    explanation: Optional[str] = None

class QCMResponse(BaseModel):
    questions: List[Question]
    pdf_title: str

class UserRead(BaseModel):
    id: str
    email: str
    is_active: bool = True
    is_verified: bool = False
    is_superuser: bool = False
    created_at: datetime

class UserCreate(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
