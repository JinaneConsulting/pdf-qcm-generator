from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import fastapi_users, jwt_backend
from app.models import UserCreate, UserRead
from app.auth import current_active_user  # Optionnel si tu veux protéger des routes

app = FastAPI()

# ⚙️ CORS si tu as un frontend React ou autre
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À adapter en prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📥 Route d'inscription
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

# 🔑 Route de login JWT
app.include_router(
    fastapi_users.get_auth_router(jwt_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

# 🧑‍💼 Route de gestion des utilisateurs (lecture)
app.include_router(
    fastapi_users.get_users_router(UserRead),
    prefix="/users",
    tags=["users"],
)

# 🌐 Route test sécurisée
@app.get("/protected-route")
async def protected_route(user=Depends(current_active_user)):
    return {"message": f"Bienvenue {user.email} !"}


# Route de base
@app.get("/")
def root():
    return {"message": "Bienvenue sur l'API PDF QCM Generator"}
