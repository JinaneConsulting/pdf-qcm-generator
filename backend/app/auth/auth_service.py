import os
import logging
from typing import Dict, Any, Tuple, Optional
from fastapi import Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User
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

logger = logging.getLogger(__name__)

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
        await session.commit()
        
        # Réinitialiser les tentatives
        login_tracker.reset_attempts(ip_address, user.email)
        
        return True, "Mot de passe mis à jour avec succès"
    
    async def get_user_from_token(self, token: str, session: AsyncSession) -> Tuple[Optional[User], Optional[str]]:
        """
        Récupère l'utilisateur à partir d'un token JWT
        """
        payload = decode_access_token(token)
        if not payload:
            return None, "Token invalide ou expiré"
        
        user_id = payload.get("sub")
        if not user_id:
            return None, "Token invalide"
        
        # Rechercher l'utilisateur
        user = await session.get(User, int(user_id))
        if not user:
            return None, "Utilisateur non trouvé"
        
        if not user.is_active:
            return None, "Compte désactivé"
        
        return user, None