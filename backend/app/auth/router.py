# app/auth/router.py
from fastapi import APIRouter
from app.schemas import UserRead, UserCreate
from .backend import fastapi_users, jwt_backend
from .google_oauth import router as google_oauth_router

router = APIRouter()

# Configuration optimisée
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"]
)

router.include_router(
    fastapi_users.get_auth_router(jwt_backend),
    prefix="/auth/jwt",
    tags=["auth"]
)

router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"]
)

router.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"]
)

# Modification cruciale pour Google OAuth
router.include_router(
    google_oauth_router,
    prefix="/auth/google",  # Ajout important
    tags=["auth"]
)