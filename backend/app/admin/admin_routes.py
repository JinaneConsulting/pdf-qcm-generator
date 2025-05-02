# app/admin/admin_routes.py
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import get_current_user
from app.database import get_async_session
from app.models import User, AccessToken

# Configuration du logger
logger = logging.getLogger(__name__)

# Création du router pour les opérations d'administration
router = APIRouter(prefix="/admin", tags=["admin"])

# Adresse email de l'administrateur
ADMIN_EMAIL = "jchraa@jinane-consulting.com"

# Middleware pour vérifier les droits d'administration
async def check_admin_rights(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """Vérifie que l'utilisateur a les droits d'administration"""
    user, error = await get_current_user(request, session)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if user.email != ADMIN_EMAIL:
        logger.warning(f"Tentative d'accès admin non autorisée par {user.email}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à l'espace d'administration"
        )
    
    return user

# Route pour obtenir la liste des utilisateurs
@router.get("/users")
async def get_users(
    request: Request,
    admin: User = Depends(check_admin_rights),
    session: AsyncSession = Depends(get_async_session)
):
    """Récupère la liste de tous les utilisateurs"""
    logger.info(f"Admin {admin.email} accède à la liste des utilisateurs")
    
    # Récupérer tous les utilisateurs
    query = select(User).order_by(User.created_at.desc())
    result = await session.execute(query)
    users = result.scalars().all()
    
    return {
        "success": True,
        "count": len(users),
        "users": [
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "created_at": user.created_at.isoformat(),
                "last_login": None,  # To be implemented if tracking is needed
                "login_type": "oauth" if user.is_oauth_user() else "password",
                "profile_picture": user.profile_picture
            }
            for user in users
        ]
    }

# Route pour obtenir les sessions actives (tokens)
@router.get("/sessions")
async def get_sessions(
    request: Request,
    admin: User = Depends(check_admin_rights),
    session: AsyncSession = Depends(get_async_session)
):
    """Récupère la liste des sessions actives (tokens)"""
    logger.info(f"Admin {admin.email} accède à la liste des sessions")
    
    # Récupérer tous les tokens non expirés avec les infos utilisateur
    query = select(AccessToken, User).join(User).order_by(AccessToken.created_at.desc())
    result = await session.execute(query)
    tokens = result.all()
    
    return {
        "success": True,
        "count": len(tokens),
        "sessions": [
            {
                "token_id": token.AccessToken.id,
                "user_id": token.User.id,
                "user_email": token.User.email,
                "user_fullname": token.User.full_name,
                "created_at": token.AccessToken.created_at.isoformat(),
                "expires_at": token.AccessToken.expires_at.isoformat(),
                "is_active": token.User.is_active
            }
            for token in tokens
        ]
    }

# Route pour révoquer un token / déconnecter un utilisateur
@router.delete("/sessions/{token_id}")
async def revoke_session(
    token_id: int,
    request: Request,
    admin: User = Depends(check_admin_rights),
    session: AsyncSession = Depends(get_async_session)
):
    """Révoque un token / déconnecte un utilisateur"""
    # Récupérer le token
    token = await session.get(AccessToken, token_id)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session non trouvée"
        )
    
    # Récupérer l'utilisateur associé
    user = await session.get(User, token.user_id)
    
    # Supprimer le token
    await session.delete(token)
    await session.commit()
    
    logger.info(f"Admin {admin.email} a révoqué le token {token_id} de l'utilisateur {user.email}")
    
    return {
        "success": True,
        "message": f"Session de {user.email} révoquée avec succès"
    }

# Route pour désactiver un compte utilisateur
@router.post("/users/{user_id}/disable")
async def disable_user(
    user_id: int,
    request: Request,
    admin: User = Depends(check_admin_rights),
    session: AsyncSession = Depends(get_async_session)
):
    """Désactive un compte utilisateur"""
    # Vérifier que l'utilisateur n'est pas l'admin lui-même
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas désactiver votre propre compte administrateur"
        )
    
    # Récupérer l'utilisateur
    user = await session.get(User, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    
    # Désactiver l'utilisateur
    user.is_active = False
    session.add(user)
    
    # Supprimer tous les tokens (déconnexion forcée)
    query = select(AccessToken).where(AccessToken.user_id == user_id)
    result = await session.execute(query)
    tokens = result.scalars().all()
    
    for token in tokens:
        await session.delete(token)
    
    await session.commit()
    
    logger.info(f"Admin {admin.email} a désactivé le compte de {user.email}")
    
    return {
        "success": True,
        "message": f"Compte de {user.email} désactivé avec succès"
    }

# Route pour réactiver un compte utilisateur
@router.post("/users/{user_id}/enable")
async def enable_user(
    user_id: int,
    request: Request,
    admin: User = Depends(check_admin_rights),
    session: AsyncSession = Depends(get_async_session)
):
    """Réactive un compte utilisateur"""
    # Récupérer l'utilisateur
    user = await session.get(User, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    
    # Réactiver l'utilisateur
    user.is_active = True
    session.add(user)
    await session.commit()
    
    logger.info(f"Admin {admin.email} a réactivé le compte de {user.email}")
    
    return {
        "success": True,
        "message": f"Compte de {user.email} réactivé avec succès"
    }