# app/auth/backend.py
import os
import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.manager import IntegerIDMixin 
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase

from app.database import get_user_db
from app.models import User, AccessToken
from app.schemas import UserRead, UserCreate, UserUpdate
from app.email_utils import send_verification_email

SECRET = os.environ.get("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE")
SECRET_RESET = os.environ.get("SECRET_RESET", "SECRET_KEY_FOR_RESET_PLEASE_CHANGE")

# Configure transport and JWT strategy
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=SECRET, 
        lifetime_seconds=3600,
        user_id_type=int  # <-- Ajouter ce paramètre
    )

jwt_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

## app/auth/backend.py
# ... (autres imports conservés)

class UserManager(IntegerIDMixin, BaseUserManager[User, int]):  
    reset_password_token_secret = SECRET_RESET
    verification_token_secret = SECRET_RESET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")
        # Solution 1 (recommandée): Utilisez request_verify
        await self.request_verify(user, request)
        
        # OU Solution 2: Si send_verification_email gère déjà le token
        # send_verification_email(user.email)

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        send_verification_email(user.email, token)

async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)

async def on_after_register(self, user: User, request: Optional[Request] = None):
    print(f"User {user.id} has registered.")
    # Utilisez la méthode request_verify si vous voulez envoyer un email de vérification
    await self.request_verify(user, request)
    # Ou simplement envoyer l'email sans token si votre send_verification_email n'en a pas besoin
    # send_verification_email(user.email)

fastapi_users = FastAPIUsers[User, int](get_user_manager, [jwt_backend])

current_active_user = fastapi_users.current_user(active=True)