# app/auth/backend.py
import logging
import os
from typing import Optional
from fastapi import Depends, Request, HTTPException, status
from fastapi_users import BaseUserManager, FastAPIUsers, schemas
from fastapi_users.manager import IntegerIDMixin 
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from fastapi_users.exceptions import UserAlreadyExists
from sqlalchemy import select
from app.database import get_user_db
from app.models import User, AccessToken
from app.schemas import UserRead, UserCreate, UserUpdate
from app.email_utils import send_verification_email
from app.security.encryption import encrypt_data



# Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

SECRET = os.environ.get("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE")
SECRET_RESET = os.environ.get("SECRET_RESET", "SECRET_KEY_FOR_RESET_PLEASE_CHANGE")

# Configuration JWT
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(SECRET, lifetime_seconds=3600) 

jwt_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

class UserManager(IntegerIDMixin, BaseUserManager[User, int]):  
    reset_password_token_secret = SECRET_RESET
    verification_token_secret = SECRET_RESET

    async def get_by_email(self, email: str) -> Optional[User]:
        encrypted_email = encrypt_data(email)
        return await self.user_db.get_by_email(encrypted_email)

    async def create(self, user_create: schemas.UC, safe: bool = False, request: Optional[Request] = None) -> User:
        try:
            # Vérification existence email
            encrypted_email = encrypt_data(user_create.email)
            existing_user = await self.user_db.session.execute(
                select(User).where(User._encrypted_email == encrypted_email)
            )
            
            if existing_user.scalars().first():
                raise UserAlreadyExists()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email déjà utilisé"
                )
                       
            # Validation supplémentaire
            if len(user_create.password) < 8:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Le mot de passe doit contenir au moins 8 caractères"
                )
                        
            return await super().create(user_create, safe, request)
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Erreur création utilisateur: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la création du compte"
            )
        
    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")
         # Ne pas envoyer de vérification si l'utilisateur est déjà vérifié
        if not user.is_verified:
            await self.request_verify(user, request)

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

fastapi_users = FastAPIUsers[User, int](get_user_manager, [jwt_backend])
current_active_user = fastapi_users.current_user(active=True)