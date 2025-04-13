from fastapi_users import BaseUserManager, UUIDIDMixin
from uuid import UUID
from app.models import User
from app.database import get_user_db
from typing import Optional
from fastapi import Depends
import os

SECRET = os.environ.get("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE")

class UserManager(UUIDIDMixin, BaseUserManager[User, UUID]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Optional[object] = None):
        print(f"Utilisateur enregistré : {user.email}")

    async def on_after_forgot_password(self, user: User, token: str, request: Optional[object] = None):
        print(f"Mot de passe oublié pour : {user.email}. Token : {token}")

    async def on_after_request_verify(self, user: User, token: str, request: Optional[object] = None):
        print(f"Vérification demandée pour : {user.email}. Token : {token}")

async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)
