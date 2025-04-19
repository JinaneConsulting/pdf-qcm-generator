# app/auth/google_oauth.py
import os
import secrets
import string
import logging
from fastapi_users import BaseUserManager
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
import httpx

from dotenv import load_dotenv
load_dotenv()
from .backend import UserManager, get_user_manager
from typing import Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from httpx_oauth.clients.google import GoogleOAuth2
from httpx_oauth.oauth2 import OAuth2Token
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.models import User, AccessToken
from app.schemas import UserCreate
from secrets import token_urlsafe

# Configuration du logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Variables d'environnement
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")

def verify_google_env():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise ValueError("Variables Google OAuth manquantes dans .env !")

# Configuration Google OAuth
google_oauth_client = GoogleOAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

async def get_oauth_token(
    request: Request,
    oauth_client: GoogleOAuth2,
    redirect_uri: str,
) -> Tuple[OAuth2Token, dict]:
    """
    Obtenir le token OAuth2 et les infos utilisateur de Google
    """
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code non fourni")
    
    try:
        # Récupération du token d'accès
        token = await oauth_client.get_access_token(code, redirect_uri)
        
        # Récupération des infos utilisateur avec httpx directement
        async with httpx.AsyncClient() as client:
            user_info_response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token['access_token']}"}
            )
            user_info = user_info_response.json()

        return token, user_info
    except Exception as e:
        logger.error(f"Erreur lors de l'obtention du token Google: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Erreur d'authentification Google: {str(e)}")

@router.api_route("/login", methods=["GET", "OPTIONS"])
async def google_login(request: Request):
    """Gestion des requêtes OPTIONS et GET pour /login"""
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": FRONTEND_URL,
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization-Tunnel, Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true"
            }
        )

    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    
    # 1. Générer l'URL de base
    auth_url = await google_oauth_client.get_authorization_url(
        redirect_uri,
        scope=["openid", "email", "profile"]
    )
    
    # 2. Ajouter les paramètres
    auth_url += "&prompt=select_account"
    state = token_urlsafe(16)
    auth_url += f"&state={state}"
    
    return RedirectResponse(url=auth_url)
    

@router.api_route("/callback", methods=["GET", "OPTIONS"])
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_async_session)):
    """Gestion du callback OAuth Google"""
    if request.method == "OPTIONS":
        return Response(
            status_code=200,
            headers={
                "Access-Control-Allow-Origin": FRONTEND_URL,
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization-Tunnel, Content-Type, Authorization",
                "Access-Control-Allow-Credentials": "true"
            }
        )
    
    from app.auth.backend import jwt_backend, get_user_manager
    from app.database import get_user_db  # Ajoutez cette ligne
    from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase  # Ajoutez cette ligne
        
    try:
        # Récupération des informations
        token, user_info = await get_oauth_token(
            request, google_oauth_client, f"{BACKEND_URL}/auth/google/callback"
        )
        
        email = user_info["email"]
        full_name = user_info.get("name")
        profile_picture = user_info.get("picture")

        user_db_generator = get_user_db(db)
        user_db = await anext(user_db_generator)
        user_manager_generator = get_user_manager(user_db)
        user_manager = await anext(user_manager_generator)

        # Gestion utilisateur
        user = await user_manager.user_db.get_by_email(email)
              
        if not user:
            # Création utilisateur
            user_create = UserCreate(
                email=email,
                password=secrets.token_urlsafe(32),
                is_active=True,
                is_verified=True,
                full_name=full_name,
                profile_picture=profile_picture
            )
            user = await user_manager.create(user_create)
        else:
            # Mise à jour
            if full_name: user.full_name = full_name
            if profile_picture: user.profile_picture = profile_picture
            await db.commit()

        # Génération JWT
        strategy = jwt_backend.get_strategy()
        access_token = await strategy.write_token(user)

        # Redirection
        return RedirectResponse(
        url=f"{FRONTEND_URL}/auth/callback?token={access_token}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Set-Cookie": f"auth_token={access_token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax"  # Durée de vie limitée
        }
    )

    except Exception as e:
        logger.error(f"Erreur callback Google: {str(e)}", exc_info=True)
        return RedirectResponse(f"{FRONTEND_URL}/auth/error?error=oauth_failed")