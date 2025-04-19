from dotenv import load_dotenv
load_dotenv()
import logging
import os
from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.schemas import UserRead, UserCreate, UserUpdate
from app.auth import fastapi_users, current_active_user, router as auth_router

# Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app = FastAPI()

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True, log_level="trace")

# Middleware CORS DOIT ÊTRE PLACÉ EN PREMIER
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["OPTIONS", "GET", "POST"],
    allow_headers=["Authorization-Tunnel", "Content-Type", "Authorization"],
    expose_headers=["Authorization-Tunnel", "Location"]  # Crucial pour les redirections
)

# Gestionnaire global pour les requêtes OPTIONS
@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    logger.debug(f"Gestionnaire OPTIONS global appelé pour: {full_path}")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": FRONTEND_URL,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization-Tunnel, Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true"
        }
    )

# Ensuite seulement les routes
app.include_router(auth_router)

@app.on_event("startup")
async def startup_event():
    from app.database import create_db_and_tables
    await create_db_and_tables()
    logger.info("Application started and ready to receive requests.")

@app.get("/")
def root():
    logger.debug("Access to root route /")
    return {"message": "Welcome to PDF QCM Generator API"}

@app.get("/protected-route")
async def protected_route(user=Depends(current_active_user)):
    logger.debug(f"Access to protected route by {user.email}")
    return {"message": f"Welcome {user.email}!"}

app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

from app.auth.google_oauth import verify_google_env
verify_google_env() 