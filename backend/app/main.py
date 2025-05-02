from dotenv import load_dotenv
load_dotenv()
import logging
import os
from fastapi import FastAPI, Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from app.database import create_db_and_tables, get_async_session
from app.auth import router as auth_router
from app.auth import get_current_user
from app.pdf import router as pdf_router  # Importer le router PDF
from sqlalchemy.ext.asyncio import AsyncSession
from app.admin import router as admin_router

# Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Application FastAPI
app = FastAPI()

if __name__ == "__main__":
    uvicorn.run("main:app", reload=True, log_level="debug")

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["OPTIONS", "GET", "POST", "DELETE", "PUT"],  # Ajout de DELETE et PUT pour les opérations PDF
    allow_headers=["Authorization-Tunnel", "Content-Type", "Authorization"],
    expose_headers=["Authorization-Tunnel", "Location"]
)

# Route pour obtenir les informations de l'utilisateur actuel
@app.get("/custom/me")
async def get_current_user_info(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Récupération de l'utilisateur courant via le token JWT"""
    user, error = await get_current_user(request, session)
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "profile_picture": user.profile_picture,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "is_superuser": user.is_superuser
    }

# Inclure les routes d'authentification
app.include_router(auth_router)

# Inclure les routes PDF
app.include_router(pdf_router)

app.include_router(admin_router)

@app.on_event("startup")
async def startup_event():
    # Créer le dossier pour les PDFs s'il n'existe pas
    pdf_upload_dir = os.environ.get("UPLOAD_DIR", "uploads/pdfs")
    os.makedirs(pdf_upload_dir, exist_ok=True)
    
    await create_db_and_tables()
    logger.info("Application started and ready to receive requests.")

@app.get("/")
def root():
    logger.debug("Access to root route /")
    return {"message": "Welcome to PDF QCM Generator API"}

@app.get("/protected-route")
async def protected_route(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    user, error = await get_current_user(request, session)
    if error:
        raise HTTPException(status_code=401, detail=error)
    
    logger.debug(f"Access to protected route by {user.email}")
    return {"message": f"Welcome {user.email}!"}