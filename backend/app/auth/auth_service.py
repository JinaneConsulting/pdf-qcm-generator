# app/auth/auth_service.py - Version améliorée
import os
import logging
from typing import Dict, Any, Tuple, Optional, List
from fastapi import Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, timedelta

from app.database import get_async_session
from app.email_utils import send_verification_email, send_reset_password_email
from .jwt_utils import (
    create_access_token, 
    decode_access_token, 
    create_verification_token, 
    create_reset_token, 
    decode_special_token
)
from .providers.password_provider import PasswordAuthProvider
from .providers.google_provider import GoogleOAuthProvider
from .security.bruteforce_protection import login_tracker
from fastapi_users.password import PasswordHelper
from app.models.user_model import AccessToken, User

logger = logging.getLogger(__name__)

# Option de configuration pour la gestion des sessions
SINGLE_SESSION_MODE = os.environ.get("SINGLE_SESSION_MODE", "true").lower() == "true"
MAX_SESSIONS_PER_USER = int(os.environ.get("MAX_SESSIONS_PER_USER", "1"))
TOKEN_EXPIRY_MINUTES = int(os.environ.get("TOKEN_EXPIRY_MINUTES", "60"))  # 1 heure par défaut

class AuthService:
    """
    Service central qui gère toutes les fonctionnalités d'authentification
    """
    def __init__(self):
        self.password_provider = PasswordAuthProvider()
        self.google_provider = GoogleOAuthProvider()
    
    async def authenticate_user(self, 
                          provider: str, 
                          data: Dict[str, Any], 
                          request: Request, 
                          session: AsyncSession) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Authentifie un utilisateur avec le provider spécifié et retourne un token JWT
        """
        user = None
        error = None
        
        # Récupérer l'adresse IP et le User-Agent
        ip_address = self.password_provider.get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "")
        
        if provider == "password":
            user, error = await self.password_provider.authenticate(session, data, request)
        elif provider == "google":
            oauth_data = await self.process_google_oauth_data(data, request)
            if oauth_data:
                user, error = await self.google_provider.authenticate(session, oauth_data, request)
            else:
                error = "Impossible de traiter les données Google OAuth"
        else:
            error = f"Provider d'authentification non supporté: {provider}"
        
        if error:
            return None, error
        
        if not user:
            return None, "Erreur d'authentification"
        
        # Mettre à jour la date de dernière connexion
        user.last_login = datetime.utcnow()
        session.add(user)
        
        # Gérer les sessions multiples selon la configuration
        if SINGLE_SESSION_MODE:
            # Révoquer toutes les sessions existantes de l'utilisateur
            await self.revoke_all_sessions(session, user.id)
        else:
            # Limiter le nombre de sessions actives (supprimer les plus anciennes si dépassé)
            await self.enforce_session_limit(session, user.id, MAX_SESSIONS_PER_USER)
        
        await session.commit()
        
        # Créer le token JWT
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "is_superuser": user.is_superuser,
            "full_name": user.full_name,
            "profile_picture": user.profile_picture
        })
        
        # Créer un enregistrement de token dans la base de données
        access_token = AccessToken(
            token=token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES),
            ip_address=ip_address,
            user_agent=user_agent[:255] if user_agent else None,
            is_valid=True
        )
        session.add(access_token)
        await session.commit()
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "profile_picture": user.profile_picture,
                "is_verified": user.is_verified
            }
        }, None

    async def revoke_all_sessions(self, session: AsyncSession, user_id: int) -> int:
        """Révoque toutes les sessions actives d'un utilisateur"""
        query = delete(AccessToken).where(AccessToken.user_id == user_id)
        result = await session.execute(query)
        return result.rowcount

    async def enforce_session_limit(self, session: AsyncSession, user_id: int, max_sessions: int) -> int:
        """Limite le nombre de sessions par utilisateur en supprimant les plus anciennes"""
        # Compter les sessions actives
        query = select(AccessToken).where(
            AccessToken.user_id == user_id
        ).order_by(AccessToken.created_at.asc())
        result = await session.execute(query)
        tokens = result.scalars().all()
        
        # Si le nombre est supérieur à la limite, supprimer les plus anciennes
        tokens_to_delete = len(tokens) - max_sessions + 1  # +1 pour faire de la place à la nouvelle session
        if tokens_to_delete > 0:
            for i in range(tokens_to_delete):
                if i < len(tokens):
                    await session.delete(tokens[i])
            
            await session.flush()
            return tokens_to_delete
        
        return 0

    async def logout(self, token: str, session: AsyncSession) -> bool:
        """Déconnecte un utilisateur en révoquant son token"""
        query = select(AccessToken).where(AccessToken.token == token)
        result = await session.execute(query)
        access_token = result.scalar_one_or_none()
        
        if not access_token:
            return False
        
        await session.delete(access_token)
        await session.commit()
        return True

    async def register_user(self, 
                           provider: str, 
                           data: Dict[str, Any], 
                           request: Request, 
                           session: AsyncSession) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Enregistre un nouvel utilisateur et retourne un token JWT
        """
        user = None
        error = None
        
        if provider == "password":
            user, error = await self.password_provider.register(session, data, request)
            
            # Envoyer l'email de vérification
            if user and not user.is_verified:
                token = create_verification_token(user.id)
                send_verification_email(user.email, token)
                
        elif provider == "google":
            oauth_data = await self.process_google_oauth_data(data, request)
            if oauth_data:
                user, error = await self.google_provider.register(session, oauth_data, request)
            else:
                error = "Impossible de traiter les données Google OAuth"
        else:
            error = f"Provider d'enregistrement non supporté: {provider}"
        
        if error:
            return None, error
        
        if not user:
            return None, "Erreur d'enregistrement"
        
        # Créer le token JWT
        token = create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "is_superuser": user.is_superuser,
            "full_name": user.full_name,
            "profile_picture": user.profile_picture
        })
        
        # Créer l'enregistrement de token dans la base de données
        ip_address = self.password_provider.get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "")
        
        access_token = AccessToken(
            token=token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRY_MINUTES),
            ip_address=ip_address,
            user_agent=user_agent[:255] if user_agent else None,
            is_valid=True
        )
        session.add(access_token)
        await session.commit()
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "profile_picture": user.profile_picture,
                "is_verified": user.is_verified
            }
        }, None
    
    async def process_google_oauth_data(self, 
                                       data: Dict[str, Any], 
                                       request: Request) -> Optional[Dict[str, Any]]:
        """
        Traite les données Google OAuth (code ou token)
        """
        # Si on reçoit directement les infos utilisateur
        if "user_info" in data:
            return data
        
        # Si on reçoit un code OAuth
        code = data.get("code")
        if code:
            redirect_uri = data.get("redirect_uri", f"{os.environ.get('BACKEND_URL', 'http://localhost:8000')}/auth/google/callback")
            oauth_result, error = await self.google_provider.get_oauth_token(code, redirect_uri)
            if error:
                logger.error(f"Erreur OAuth Google: {error}")
                return None
            return oauth_result
        
        return None
    
    async def verify_email(self, token: str, session: AsyncSession) -> Tuple[bool, str]:
        """
        Vérifie l'email d'un utilisateur avec un token
        """
        payload = decode_special_token(token, expected_type="verification")
        if not payload:
            return False, "Token invalide ou expiré"
        
        user_id = payload.get("sub")
        if not user_id:
            return False, "Token invalide"
        
        # Rechercher l'utilisateur
        user = await session.get(User, int(user_id))
        if not user:
            return False, "Utilisateur non trouvé"
        
        # Marquer l'email comme vérifié
        if not user.is_verified:
            user.is_verified = True
            session.add(user)
            await session.commit()
        
        return True, "Email vérifié avec succès"
    
    async def request_password_reset(self, email: str, request: Request, session: AsyncSession) -> Tuple[bool, str]:
        """
        Demande de réinitialisation de mot de passe
        """
        ip_address = self.password_provider.get_client_ip(request)
        
        # Vérifier les tentatives de force brute
        if login_tracker.is_blocked(ip_address, email):
            return False, "Trop de tentatives. Veuillez réessayer plus tard."
        
        # Rechercher l'utilisateur
        query = select(User).where(User.email == email.lower())
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            # Ne pas révéler l'existence du compte
            login_tracker.record_attempt(ip_address, email, success=False)
            return True, "Si un compte existe avec cette adresse email, un email de réinitialisation a été envoyé."
        
        # Vérifier que l'utilisateur est actif
        if not user.is_active:
            login_tracker.record_attempt(ip_address, email, success=False)
            return True, "Si un compte existe avec cette adresse email, un email de réinitialisation a été envoyé."
        
        # Créer un token de réinitialisation
        token = create_reset_token(user.id)
        
        # Envoyer l'email
        success = send_reset_password_email(user.email, token)
        
        login_tracker.record_attempt(ip_address, email, success=True)
        return True, "Si un compte existe avec cette adresse email, un email de réinitialisation a été envoyé."
    
    async def reset_password(self, token: str, new_password: str, request: Request, session: AsyncSession) -> Tuple[bool, str]:
        """
        Réinitialisation du mot de passe avec un token
        """
        ip_address = self.password_provider.get_client_ip(request)
        
        # Vérifier les tentatives de force brute
        if login_tracker.is_blocked(ip_address):
            return False, "Trop de tentatives. Veuillez réessayer plus tard."
        
        # Valider le token
        payload = decode_special_token(token, expected_type="reset")
        if not payload:
            login_tracker.record_attempt(ip_address, "reset_token", success=False)
            return False, "Token invalide ou expiré"
        
        user_id = payload.get("sub")
        if not user_id:
            login_tracker.record_attempt(ip_address, "reset_token", success=False)
            return False, "Token invalide"
        
        # Rechercher l'utilisateur
        user = await session.get(User, int(user_id))
        if not user:
            login_tracker.record_attempt(ip_address, "reset_token", success=False)
            return False, "Utilisateur non trouvé"
        
        # Vérifier la robustesse du mot de passe
        from .security.password_validation import validate_password_strength
        is_valid, error_message = validate_password_strength(new_password)
        if not is_valid:
            return False, error_message
        
        # Mettre à jour le mot de passe
        password_helper = PasswordHelper()
        user.hashed_password = password_helper.hash(new_password)
        session.add(user)
        
        # Révoquer toutes les sessions existantes
        await self.revoke_all_sessions(session, user.id)
        
        await session.commit()
        
        # Réinitialiser les tentatives
        login_tracker.reset_attempts(ip_address, user.email)
        
        return True, "Mot de passe mis à jour avec succès"
    
    async def get_user_from_token(self, token: str, session: AsyncSession) -> Tuple[Optional[User], Optional[str]]:
        """
        Récupère l'utilisateur à partir d'un token JWT et vérifie que le token est valide en base de données
        """
        # Vérifier d'abord si le token existe en base de données
        query = select(AccessToken).where(AccessToken.token == token, AccessToken.is_valid == True)
        result = await session.execute(query)
        db_token = result.scalar_one_or_none()
        
        if not db_token:
            return None, "Session invalide ou expirée"
        
        # Vérifier si le token est expiré
        if db_token.expires_at < datetime.utcnow():
            db_token.is_valid = False
            session.add(db_token)
            await session.commit()
            return None, "Session expirée"
        
        # Décoder le JWT
        payload = decode_access_token(token)
        if not payload:
            return None, "Token JWT invalide ou expiré"
        
        user_id = payload.get("sub")
        if not user_id:
            return None, "Token JWT invalide"
        
        # Vérifier que le user_id du token correspond à celui en base de données
        if int(user_id) != db_token.user_id:
            return None, "Token JWT invalide"
        
        # Récupérer l'utilisateur
        user = await session.get(User, int(user_id))
        if not user:
            return None, "Utilisateur non trouvé"
        
        if not user.is_active:
            # Si l'utilisateur est désactivé, on révoque toutes ses sessions
            await self.revoke_all_sessions(session, user.id)
            await session.commit()
            return None, "Compte désactivé"
        
        # Mettre à jour la date de dernière utilisation
        db_token.updated_at = datetime.utcnow()
        session.add(db_token)
        await session.commit()
        
        return user, None