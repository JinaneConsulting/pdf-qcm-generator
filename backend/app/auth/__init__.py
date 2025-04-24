# app/auth/__init__.py
from .auth_routes import router
from .auth_service import AuthService

async def get_current_user(request, session):
    """Fonction utilitaire pour récupérer l'utilisateur courant"""
    auth_service = AuthService()
    
    # Récupérer le token
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None, "Token manquant"
    
    token = auth_header.replace("Bearer ", "")
    
    # Récupérer l'utilisateur
    return await auth_service.get_user_from_token(token, session)