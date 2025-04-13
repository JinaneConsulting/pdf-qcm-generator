# app/auth/backend.py
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy
)
from app.models import User
from app.database import get_user_db
from app.auth.backend import get_auth_backend
from fastapi_users import FastAPIUsers
from app.auth.manager import get_user_manager  # Assurez-vous de définir ce manager
from app.auth.auth import fastapi_users, current_active_user, jwt_backend, router  # Assurez-vous d'inclure 'router'
import os

SECRET = os.environ.get("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE")

bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

def get_auth_backend() -> AuthenticationBackend:
    return AuthenticationBackend(
        name="jwt",
        transport=bearer_transport,
        get_strategy=get_jwt_strategy,
    )

fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [get_auth_backend()],
)

current_active_user = fastapi_users.current_user(active=True)

jwt_backend = get_auth_backend()  # Ici, on définit directement jwt_backend
