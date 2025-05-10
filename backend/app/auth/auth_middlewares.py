# app/auth/auth_middlewares.py

from fastapi import Request, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_session
from app.models import User
from app.auth.auth_service import AuthService
import logging

# Configuration du logger
logger = logging.getLogger(__name__)

# Initialisation du service d'authentification pour les middlewares
auth_service = AuthService()

async def get_token_from_request(request: Request) -> str:
    """
    Extrait le token JWT de l'en-tête Authorization.
    Retourne le token si présent, sinon lève une exception.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token d'authentification manquant",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return auth_header.replace("Bearer ", "")

async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
) -> tuple[User, None] | tuple[None, str]:
    """
    Récupère l'utilisateur courant à partir du token JWT.
    Retourne (user, None) si l'authentification réussit, sinon (None, error_message).
    """
    try:
        # Récupérer le token
        token = get_token_from_request(request)
        
        # Vérifier le token et récupérer l'utilisateur
        return await auth_service.get_user_from_token(token, session)
    except HTTPException as e:
        return None, e.detail
    except Exception as e:
        logger.error(f"Erreur lors de la récupération de l'utilisateur: {str(e)}")
        return None, "Erreur d'authentification"

async def require_authenticated_user(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
) -> User:
    """
    Middleware pour les routes nécessitant un utilisateur authentifié.
    Retourne l'utilisateur si authentifié, sinon lève une exception.
    """
    user, error = await get_current_user(request, session)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return user

async def require_verified_user(
    user: User = Depends(require_authenticated_user)
) -> User:
    """
    Middleware pour les routes nécessitant un utilisateur vérifié.
    Retourne l'utilisateur si vérifié, sinon lève une exception.
    """
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email non vérifié. Veuillez vérifier votre email avant de continuer."
        )
    
    return user

async def require_admin_user(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
) -> User:
    """
    Middleware pour les routes nécessitant un utilisateur administrateur.
    Retourne l'utilisateur si admin, sinon lève une exception.
    """
    user, error = await get_current_user(request, session)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_superuser:
        logger.warning(f"Tentative d'accès admin non autorisée par {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à l'espace d'administration"
        )
    
    return user

# Alias pour compatibilité avec le code existant
check_admin_rights = require_admin_user