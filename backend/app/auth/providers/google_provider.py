import os
import logging
from typing import Dict, Any, Tuple, Optional
import httpx
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User
from .base_provider import AuthProvider

logger = logging.getLogger(__name__)

# Variables d'environnement
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

class GoogleOAuthProvider(AuthProvider):
    """
    Fournisseur d'authentification Google OAuth
    """
    def __init__(self):
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            logger.warning("Variables Google OAuth manquantes!")
    
    async def get_oauth_token(self, code: str, redirect_uri: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Récupère le token OAuth et les informations utilisateur
        """
        logger.info(f"Démarrage de l'échange OAuth - Code reçu: {code[:5]}...")
        if not code:
            return None, "Code OAuth manquant"
        
        try:
            # Échanger le code contre un token d'accès
            token_response = await self._exchange_code_for_token(code, redirect_uri)
            if not token_response:
                return None, "Erreur d'authentification Google"
            
            # Récupérer les infos utilisateur avec le token
            user_info = await self._get_user_info(token_response["access_token"])
            if not user_info:
                return None, "Impossible de récupérer les informations utilisateur"
            
            return {"token": token_response, "user_info": user_info}, None
        except Exception as e:
            logger.error(f"Erreur lors de l'authentification Google: {str(e)}")
            return None, f"Erreur d'authentification Google: {str(e)}"
    
    # Dans google_provider.py, modifiez la méthode _exchange_code_for_token
    async def _exchange_code_for_token(self, code: str, redirect_uri: str) -> Optional[Dict[str, Any]]:
        """
        Échange un code d'autorisation contre un token d'accès
        """
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        logger.debug(f"Échange de code: URL={token_url}, redirect_uri={redirect_uri}")
        logger.debug(f"Client ID présent: {'Oui' if GOOGLE_CLIENT_ID else 'Non'}")
        
        try:
            # Augmentez le timeout à 30 secondes
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(token_url, data=data)
                if response.status_code != 200:
                    logger.error(f"Erreur d'échange de code: Status={response.status_code}, Réponse={response.text}")
                    return None
                
                return response.json()
        except Exception as e:
            logger.error(f"Exception lors de l'échange de code: {type(e).__name__}: {str(e)}")
            return None
    
    async def _get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Récupère les informations utilisateur avec un token d'accès
        """
        user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(user_info_url, headers=headers)
            if response.status_code != 200:
                logger.error(f"Erreur de récupération des infos utilisateur: {response.text}")
                return None
            
            return response.json()
    
    async def authenticate(self, 
                          session: AsyncSession, 
                          data: Dict[str, Any], 
                          request: Request = None) -> Tuple[Optional[User], Optional[str]]:
        """
        Authentifie un utilisateur avec les données Google OAuth
        """
        user_info = data.get("user_info", {})
        if not user_info:
            return None, "Informations utilisateur manquantes"
        
        email = user_info.get("email")
        sub = user_info.get("sub")  # L'identifiant unique Google
        
        if not email or not sub:
            return None, "Informations insuffisantes depuis Google"
        
        # Rechercher d'abord par le sub Google
        query = select(User).where(User.oidc_sub == sub)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            # Rechercher par email
            query = select(User).where(User.email == email)
            result = await session.execute(query)
            user = result.scalar_one_or_none()
            
            if user:
                # Lier le compte existant à Google
                user.oidc_sub = sub
                session.add(user)
                await session.commit()
                logger.info(f"Compte existant lié à Google: {email}")
            else:
                # Créer un nouveau compte
                return await self.register(session, data, request)
        
        # Mettre à jour les infos si nécessaire
        if not user.is_active:
            return None, "Compte désactivé"
        
        # Mise à jour du profil si nécessaire
        updated = False
        if user_info.get("name") and not user.full_name:
            user.full_name = user_info.get("name")
            updated = True
        
        if user_info.get("picture") and not user.profile_picture:
            user.profile_picture = user_info.get("picture")
            updated = True
        
        if not user.is_verified:
            user.is_verified = True
            updated = True
        
        if updated:
            session.add(user)
            await session.commit()
        
        logger.info(f"Authentification Google réussie pour: {email}")
        return user, None
    
    async def register(self, 
                      session: AsyncSession, 
                      data: Dict[str, Any], 
                      request: Request = None) -> Tuple[Optional[User], Optional[str]]:
        """
        Crée un nouvel utilisateur avec les données Google OAuth
        """
        user_info = data.get("user_info", {})
        if not user_info:
            return None, "Informations utilisateur manquantes"
        
        email = user_info.get("email")
        sub = user_info.get("sub")
        
        if not email or not sub:
            return None, "Informations insuffisantes depuis Google"
        
        # Vérifier si l'email existe déjà
        query = select(User).where(User.email == email)
        result = await session.execute(query)
        if result.scalar_one_or_none():
            return None, "Cet email est déjà utilisé"
        
        # Créer un nouvel utilisateur
        new_user = User(
            email=email,
            oidc_sub=sub,
            full_name=user_info.get("name"),
            profile_picture=user_info.get("picture"),
            is_active=True,
            is_verified=True,  # Les utilisateurs OAuth sont vérifiés automatiquement
            is_superuser=False
        )
        
        session.add(new_user)
        await session.commit()
        await session.refresh(new_user)
        
        logger.info(f"Nouvel utilisateur créé via Google: {email}, id: {new_user.id}")
        return new_user, None