# app/auth/backend.py
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy
)
from fastapi_users.authentication.strategy.db import DatabaseStrategy
from fastapi_users_db_sqlalchemy.access_token import SQLAlchemyAccessTokenDatabase
from app.models import User, AccessToken
from app.schemas import UserRead, UserCreate, UserUpdate
from fastapi_users import FastAPIUsers
from app.auth import get_auth_backend
from app.database import get_user_db
from app.auth.manager import get_user_manager  # tu dois créer ce fichier `manager.py`
from fastapi import APIRouter, Depends
from app.auth import fastapi_users 

import os


SECRET = os.environ.get("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE")

bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

# Définir le router pour les routes d'authentification
router = APIRouter()

# Route pour créer un utilisateur
@router.post("/users/", response_model=UserCreate)
async def create_user(user: UserCreate, fastapi_users: FastAPIUsers = Depends(fastapi_users)):
    # Logique pour créer un utilisateur, par exemple :
    new_user = await fastapi_users.create_user(user)
    return new_user

@router.post("/login")
async def login():
    # Implémenter la logique de login ici
    pass

@router.post("/register")
async def register(user: UserCreate):
    # Implémenter la logique d'inscription ici
    pass

@router.post("/verify")
async def verify():
    # Implémenter la logique de vérification ici
    pass

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

jwt_backend = get_auth_backend()