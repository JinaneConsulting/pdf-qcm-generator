# app/auth/auth_routes.py - Version refactorisée
import os
import logging
from typing import Dict, Optional
from fastapi import APIRouter, Depends, Request, Response, HTTPException, status, Form, Query
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from .auth_service import AuthService
from .auth_middlewares import get_token_from_request, get_current_user, require_authenticated_user

logger = logging.getLogger(__name__)

# Configuration des URLs depuis les variables d'environnement
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Création du router principal d'authentification
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

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_async_session)
):
    """Déconnexion en révoquant le token"""
    try:
        # Récupérer le token depuis l'en-tête Authorization
        token = get_token_from_request(request)
        
        # Révoquer le token
        success = await auth_service.logout(token, session)
        
        # Supprimer le cookie côté client
        response.delete_cookie("auth_token")
        
        if not success:
            return {"message": "Session déjà expirée ou invalide"}
        
        return {"message": "Déconnecté avec succès"}
    except HTTPException:
        # Gérer les erreurs d'authentification
        return {"message": "Session invalide ou déjà expirée"}

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
    
    try:
        authorization_url = await google_client.get_authorization_url(
            redirect_uri,
            scope=["openid", "email", "profile"]
        )
        
        # Ajouter les CORS headers pour éviter les problèmes de redirection
        response.headers["Access-Control-Allow-Origin"] = FRONTEND_URL
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Authorization-Tunnel, Content-Type, Authorization"
        
        return RedirectResponse(url=authorization_url)
    except Exception as e:
        logger.error(f"Erreur lors de la génération de l'URL d'autorisation Google: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur de configuration OAuth Google"
        )

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

# Routes pour la gestion des sessions
@router.get("/sessions/active")
async def get_active_sessions(
    user: dict = Depends(require_authenticated_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Récupère toutes les sessions actives de l'utilisateur authentifié
    """
    from sqlalchemy import select
    from app.models.user_model import AccessToken
    
    # Récupérer toutes les sessions de l'utilisateur
    query = select(AccessToken).where(
        AccessToken.user_id == user.id,
        AccessToken.is_valid == True
    ).order_by(AccessToken.created_at.desc())
    
    result = await session.execute(query)
    tokens = result.scalars().all()
    
    # Déterminer quelle est la session courante
    current_token = get_token_from_request(request)
    
    # Formater les sessions pour la réponse
    return {
        "count": len(tokens),
        "sessions": [
            {
                "id": token.id,
                "created_at": token.created_at.isoformat(),
                "expires_at": token.expires_at.isoformat(),
                "ip_address": token.ip_address,
                "user_agent": token.user_agent,
                "current": token.token == current_token
            }
            for token in tokens
        ]
    }

@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    request: Request,
    user: dict = Depends(require_authenticated_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Révoque une session spécifique de l'utilisateur authentifié
    """
    from app.models.user_model import AccessToken
    
    # Récupérer la session spécifiée
    token = await session.get(AccessToken, session_id)
    
    # Vérifier que la session existe et appartient à l'utilisateur
    if not token or token.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session non trouvée"
        )
    
    # Si c'est la session courante, retourner une erreur
    current_token = get_token_from_request(request)
    if token.token == current_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas révoquer votre session courante. Utilisez /auth/logout à la place."
        )
    
    # Supprimer la session
    await session.delete(token)
    await session.commit()
    
    return {"message": "Session révoquée avec succès"}

@router.delete("/sessions/all")
async def revoke_all_sessions(
    request: Request,
    user: dict = Depends(require_authenticated_user),
    session: AsyncSession = Depends(get_async_session),
    keep_current: bool = Query(True, description="Garder la session courante")
):
    """
    Révoque toutes les sessions de l'utilisateur authentifié sauf la session courante (optionnel)
    """
    from sqlalchemy import delete
    from app.models.user_model import AccessToken
    
    # Récupérer le token courant
    current_token = get_token_from_request(request)
    
    # Créer la requête de suppression appropriée
    if keep_current:
        # Supprimer toutes les sessions sauf la courante
        query = delete(AccessToken).where(
            AccessToken.user_id == user.id,
            AccessToken.token != current_token
        )
    else:
        # Supprimer toutes les sessions, y compris la courante
        query = delete(AccessToken).where(AccessToken.user_id == user.id)
    
    # Exécuter la requête et récupérer le nombre de lignes affectées
    result = await session.execute(query)
    sessions_count = result.rowcount
    
    # Valider les changements
    await session.commit()
    
    return {
        "message": f"{sessions_count} sessions révoquées avec succès",
        "count": sessions_count,
        "logout_required": not keep_current
    }

# Route pour les administrateurs pour nettoyer les tokens expirés
@router.delete("/admin/sessions/expired")
async def clean_expired_sessions(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user = Depends(require_admin_user)  # S'assure que l'utilisateur est un administrateur
):
    """Supprime tous les tokens expirés de la base de données"""
    from sqlalchemy import delete
    from app.models.user_model import AccessToken
    from datetime import datetime
    
    # Supprimer les tokens expirés
    query = delete(AccessToken).where(AccessToken.expires_at < datetime.utcnow())
    result = await session.execute(query)
    count = result.rowcount
    await session.commit()
    
    logger.info(f"Admin {user.email} a supprimé {count} tokens expirés")
    
    return {
        "message": f"{count} tokens expirés supprimés",
        "count": count
    }

# Route pour obtenir les informations sur l'utilisateur actuel
@router.get("/me")
async def get_current_user_info(
    user = Depends(require_authenticated_user)
):
    """Retourne les informations de l'utilisateur actuellement authentifié"""
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "profile_picture": user.profile_picture,
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "is_superuser": user.is_superuser
    }