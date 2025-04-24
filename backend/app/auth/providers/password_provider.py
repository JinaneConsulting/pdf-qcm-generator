import logging
from typing import Dict, Any, Tuple, Optional
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_users.password import PasswordHelper
from app.models import User
from app.auth.security.bruteforce_protection import login_tracker
from app.auth.security.password_validation import validate_password_strength
from .base_provider import AuthProvider

logger = logging.getLogger(__name__)

class PasswordAuthProvider(AuthProvider):
    """
    Fournisseur d'authentification par mot de passe
    """
    def __init__(self):
        self.password_helper = PasswordHelper()
    
    async def authenticate(self, 
                          session: AsyncSession, 
                          data: Dict[str, Any], 
                          request: Request = None) -> Tuple[Optional[User], Optional[str]]:
        """
        Authentifie un utilisateur avec email/mot de passe
        """
        email = data.get("email", "").lower()
        password = data.get("password", "")
        ip_address = self.get_client_ip(request) if request else "unknown"
        
        # Vérifier les tentatives de force brute
        if login_tracker.is_blocked(ip_address, email):
            return None, "Trop de tentatives. Veuillez réessayer plus tard."
        
        # Rechercher l'utilisateur
        query = select(User).where(User.email == email)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        # Utilisateur introuvable
        if not user:
            login_tracker.record_attempt(ip_address, email, success=False)
            logger.warning(f"Tentative de connexion avec un email inexistant: {email}")
            return None, "Identifiants incorrects"
        
        # Vérifier que l'utilisateur est actif
        if not user.is_active:
            login_tracker.record_attempt(ip_address, email, success=False)
            logger.warning(f"Tentative de connexion pour un compte inactif: {email}")
            return None, "Compte inactif"
        
        # Vérifier le mot de passe
        verify_result = self.password_helper.verify_and_update(
            password, user.hashed_password
        )
        
        if not verify_result[0]:
            login_tracker.record_attempt(ip_address, email, success=False)
            logger.warning(f"Échec d'authentification pour: {email}")
            return None, "Identifiants incorrects"
        
        # Mettre à jour le hash du mot de passe si nécessaire (rehashing)
        if verify_result[1]:
            user.hashed_password = verify_result[1]
            session.add(user)
            await session.commit()
        
        # Authentification réussie
        login_tracker.record_attempt(ip_address, email, success=True)
        logger.info(f"Authentification réussie pour: {email}")
        return user, None
    
    async def register(self, 
                      session: AsyncSession, 
                      data: Dict[str, Any], 
                      request: Request = None) -> Tuple[Optional[User], Optional[str]]:
        """
        Enregistre un nouvel utilisateur avec email/mot de passe
        """
        email = data.get("email", "").lower()
        password = data.get("password", "")
        full_name = data.get("full_name")
        ip_address = self.get_client_ip(request) if request else "unknown"
        
        # Vérifier la robustesse du mot de passe
        is_valid, error_message = validate_password_strength(password)
        if not is_valid:
            logger.warning(f"Tentative d'inscription avec un mot de passe faible pour: {email}")
            return None, error_message
        
        # Vérifier si l'email existe déjà
        query = select(User).where(User.email == email)
        result = await session.execute(query)
        if result.scalar_one_or_none():
            logger.warning(f"Tentative d'inscription avec un email déjà utilisé: {email}")
            return None, "Cet email est déjà utilisé"
        
        # Créer le hash du mot de passe
        hashed_password = self.password_helper.hash(password)
        
        # Créer un nouvel utilisateur
        new_user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True,
            is_verified=False,
            is_superuser=False
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        logger.info(f"Nouvel utilisateur créé: {email}, id: {new_user.id}")
        return new_user, None