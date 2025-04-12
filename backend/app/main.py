### main.py

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.auth import fastapi_users, jwt_backend, current_active_user
from app.models import UserCreate, UserRead, UserUpdate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
    options={"verify_user": True}  # Activation de la vérification par email
)

app.include_router(
    fastapi_users.get_auth_router(jwt_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_users_router(UserRead),
    prefix="/users",
    tags=["users"],
)

@app.get("/protected-route")
async def protected_route(user=Depends(current_active_user)):
    return {"message": f"Bienvenue {user.email} !"}

@app.get("/")
def root():
    return {"message": "Bienvenue sur l'API PDF QCM Generator"}


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


### email_utils.py

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("SENDGRID_FROM", "no-reply@tondomaine.com")

def send_verification_email(email: str, token: str):
    verification_link = f"http://localhost:8000/auth/verify?token={token}"

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=email,
        subject="Vérification de votre compte",
        html_content=f"""
        <p>Bonjour,</p>
        <p>Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse e-mail :</p>
        <a href=\"{verification_link}\">Vérifier mon compte</a>
        <p>Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer ce message.</p>
        """,
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
    except Exception as e:
        print(f"Erreur d'envoi d'email : {e}")


### auth.py (modification partielle uniquement de la méthode concernée)

import os
import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users.authentication.strategy.db import DatabaseStrategy
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase

from app.database import get_user_db
from app.models import User, AccessToken
from app.email_utils import send_verification_email

SECRET = os.environ.get("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE")
SECRET_RESET = os.environ.get("SECRET_RESET", "SECRET_KEY_FOR_RESET_PLEASE_CHANGE")

async def get_access_token_db(user_db=Depends(get_user_db)):
    yield SQLAlchemyAccessTokenDatabase(AccessToken, user_db)

bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

def get_database_strategy(
    access_token_db: SQLAlchemyAccessTokenDatabase = Depends(get_access_token_db),
) -> DatabaseStrategy:
    return DatabaseStrategy(access_token_db, lifetime_seconds=3600)

jwt_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET_RESET
    verification_token_secret = SECRET_RESET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        send_verification_email(user.email, token)

async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [jwt_backend])

current_active_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)
