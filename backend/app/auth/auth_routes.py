import os
import logging
from typing import Dict, Optional
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status, Form, Query
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from .auth_service import AuthService

logger = logging.getLogger(__name__)

# Configuration des URLs
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Création du router
router = APIRouter(prefix="/auth", tags=["auth"])

# Initialisation du service d'authentification
auth_service = AuthService()

# Middleware CORS personnalisé pour les routes OPTIONS
@router.options("/{path:path}")
async def options_handler(path: str, request: Request):
    """Gestionnaire pour les requêtes OPTIONS"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": FRONTEND_URL,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization-Tunnel, Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true"
        }
    )

@router.post("/login")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_async_session)
):
    """Authentification par email/mot de passe"""
    result, error = await auth_service.authenticate_user(
        "password",
        {"email": form_data.username, "password": form_data.password},
        request,
        session
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return result

@router.post("/register")
async def register(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    full_name: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_async_session)
):
    """Inscription par email/mot de passe"""
    result, error = await auth_service.register_user(
        "password",
        {"email": email, "password": password, "full_name": full_name},
        request,
        session
    )
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error
        )
    
    return result

@router.post("/verify")
async def verify_email(
    token: str,
    session: AsyncSession = Depends(get_async_session)
):
    """Vérification d'email avec token"""
    success, message = await auth_service.verify_email(token, session)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.get("/verify")
async def verify_email_redirect(
    token: str,
    session: AsyncSession = Depends(get_async_session)
):
    """Redirection après vérification d'email par lien"""
    success, message = await auth_service.verify_email(token, session)
    
    if success:
        return RedirectResponse(f"{FRONTEND_URL}/auth/verify-success")
    else:
        return RedirectResponse(f"{FRONTEND_URL}/auth/verify-error?error={message}")

@router.post("/password-reset/request")
async def request_password_reset(
    request: Request,
    email: str = Form(...),
    session: AsyncSession = Depends(get_async_session)
):
    """Demande de réinitialisation de mot de passe"""
    success, message = await auth_service.request_password_reset(email, request, session)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS if "Trop de tentatives" in message else status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

@router.post("/password-reset/reset")
async def reset_password(
    request: Request,
    token: str = Form(...),
    new_password: str = Form(...),
    session: AsyncSession = Depends(get_async_session)
):
    """Réinitialisation de mot de passe avec token"""
    success, message = await auth_service.reset_password(token, new_password, request, session)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS if "Trop de tentatives" in message else status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"message": message}

# Routes Google OAuth
@router.get("/google/login")
async def google_login(response: Response):
    """Redirection vers l'authentification Google"""
    from httpx_oauth.clients.google import GoogleOAuth2
    
    google_client = GoogleOAuth2(
        os.environ.get("GOOGLE_CLIENT_ID", ""),
        os.environ.get("GOOGLE_CLIENT_SECRET", "")
    )
    
    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    authorization_url = await google_client.get_authorization_url(
        redirect_uri,
        scope=["openid", "email", "profile"]
    )
    
    # Ajouter les CORS headers pour éviter les problèmes de redirection
    response.headers["Access-Control-Allow-Origin"] = FRONTEND_URL
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Authorization-Tunnel, Content-Type, Authorization"
    
    return RedirectResponse(url=authorization_url)

# Modification de la route de callback Google
@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session)
):
    """Traitement du callback OAuth Google"""
    if not code:
        logger.error("Code OAuth manquant dans le callback")
        return RedirectResponse(f"{FRONTEND_URL}/auth/error?error=oauth_failed")
    
    result, error = await auth_service.authenticate_user(
        "google",
        {"code": code, "redirect_uri": f"{BACKEND_URL}/auth/google/callback"},
        request,
        session
    )
    
    if error:
        logger.error(f"Erreur d'authentification Google: {error}")
        return RedirectResponse(f"{FRONTEND_URL}/auth/error?error=oauth_failed")
    
    # Redirection avec le token
    access_token = result["access_token"]
    
    # Log pour le débogage
    logger.info(f"Redirection vers: {FRONTEND_URL}/auth/callback?token={access_token[:10]}...")
    
    # Utiliser une redirection 302 au lieu de 307
    response = RedirectResponse(
        url=f"{FRONTEND_URL}/auth/callback?token={access_token}",
        status_code=302
    )
    
    # Ajouter des headers explicites
    response.headers["Authorization"] = f"Bearer {access_token}"
    response.headers["Set-Cookie"] = f"auth_token={access_token}; Path=/; Max-Age=86400; SameSite=Lax"
    
    return response

@router.post("/logout")
async def logout(response: Response):
    """Déconnexion (suppression du cookie)"""
    response.delete_cookie("auth_token")
    return {"message": "Déconnecté avec succès"}