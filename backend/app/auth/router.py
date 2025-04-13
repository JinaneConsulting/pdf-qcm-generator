from fastapi import APIRouter
from app.schemas import UserRead, UserCreate
from .backend import fastapi_users, jwt_backend

router = APIRouter()

# Inclure le routeur d'enregistrement standard
register_router = fastapi_users.get_register_router(UserRead, UserCreate)
router.include_router(register_router, prefix="/auth", tags=["auth"])

# Inclure le routeur d'authentification JWT
auth_router = fastapi_users.get_auth_router(jwt_backend)
router.include_router(auth_router, prefix="/auth/jwt", tags=["auth"])

# Route personnalisée optionnelle
@router.post("/auth/users/", response_model=UserRead, tags=["custom"])
async def custom_create_user(user: UserCreate):
    return await fastapi_users.create_user(user)