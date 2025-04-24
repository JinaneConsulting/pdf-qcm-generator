from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, Optional
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User

class AuthProvider(ABC):
    """
    Classe de base abstraite pour tous les fournisseurs d'authentification
    """
    @abstractmethod
    async def authenticate(self, 
                          session: AsyncSession, 
                          data: Dict[str, Any], 
                          request: Request = None) -> Tuple[Optional[User], Optional[str]]:
        """
        Authentifie un utilisateur avec les données fournies
        Retourne (user, None) en cas de succès, (None, error_message) en cas d'échec
        """
        pass
    
    @abstractmethod
    async def register(self, 
                      session: AsyncSession, 
                      data: Dict[str, Any], 
                      request: Request = None) -> Tuple[Optional[User], Optional[str]]:
        """
        Enregistre un nouvel utilisateur avec les données fournies
        Retourne (user, None) en cas de succès, (None, error_message) en cas d'échec
        """
        pass
    
    @staticmethod
    def get_client_ip(request: Request) -> str:
        """Récupère l'adresse IP du client"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        if request.client:
            return request.client.host
            
        return "127.0.0.1"