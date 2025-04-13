# app/main.py
import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.auth import fastapi_users, current_active_user, jwt_backend, router as auth_router
from app.models import UserCreate, UserUpdate

# Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# Inclure les routes d'authentification
app.include_router(auth_router)

# Inclure les routes d'authentification
app.include_router(auth_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Change selon ton frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    from app.database import create_db_and_tables
    await create_db_and_tables()
    logger.info("L'application a démarré et est prête à recevoir des requêtes.")

@app.get("/")
def root():
    logger.debug("Accès à la route racine /")
    return {"message": "Bienvenue sur l'API PDF QCM Generator"}

@app.get("/protected-route")
async def protected_route(user=Depends(current_active_user)):
    logger.debug(f"Accès à la route protégée par {user.email}")
    return {"message": f"Bienvenue {user.email} !"}

# Routes utilisateurs
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users", 
    tags=["users"]
)

# Routes d'authentification
app.include_router(auth_router, prefix="/auth", tags=["auth"])

app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"]
)

# Importez le backend JWT directement
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