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
