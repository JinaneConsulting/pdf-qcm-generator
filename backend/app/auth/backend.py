import os
import uuid
from typing import Optional

from fastapi import Depends, Request, APIRouter
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase

from app.database import get_user_db
from app.models import User, AccessToken
from app.schemas import UserRead, UserCreate, UserUpdate
from app.email_utils import send_verification_email

SECRET = os.environ.get("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE")
SECRET_RESET = os.environ.get("SECRET_RESET", "SECRET_KEY_FOR_RESET_PLEASE_CHANGE")

router = APIRouter()

async def get_access_token_db(user_db=Depends(get_user_db)):
    yield SQLAlchemyAccessTokenDatabase(AccessToken, user_db.session)

# Configurer le transport et la stratégie JWT
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

def get_auth_backend() -> AuthenticationBackend:
    return AuthenticationBackend(
        name="jwt",
        transport=bearer_transport,
        get_strategy=get_jwt_strategy,
    )

# Créer l'authentification avec JWT
jwt_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

# Gestionnaire d'utilisateurs personnalisé
class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET_RESET
    verification_token_secret = SECRET_RESET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")
        verification_token = self.verification_token_generator(user)
        send_verification_email(user.email, verification_token)

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        send_verification_email(user.email, token)

# Gestionnaire d'utilisateurs
async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)

# FastAPIUsers pour gérer les utilisateurs
fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [jwt_backend])

# Utilisateur actif actuel
current_active_user = fastapi_users.current_user(active=True)