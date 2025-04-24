import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# Secrets pour les JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE")
JWT_RESET_SECRET = os.environ.get("SECRET_RESET", "SECRET_KEY_FOR_RESET_PLEASE_CHANGE")
JWT_ALGORITHM = "HS256"

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Crée un JWT d'accès avec les données fournies
    """
    to_encode = data.copy()
    
    # Définir l'expiration
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=1)
    
    to_encode.update({"exp": expire})
    
    # Encoder le token
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Décode un JWT et retourne ses données
    """
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None

def create_verification_token(user_id: int) -> str:
    """
    Crée un token de vérification d'email
    """
    to_encode = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(hours=24),
        "type": "verification"
    }
    return jwt.encode(to_encode, JWT_RESET_SECRET, algorithm=JWT_ALGORITHM)

def create_reset_token(user_id: int) -> str:
    """
    Crée un token de réinitialisation de mot de passe
    """
    to_encode = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(hours=24),
        "type": "reset"
    }
    return jwt.encode(to_encode, JWT_RESET_SECRET, algorithm=JWT_ALGORITHM)

def decode_special_token(token: str, expected_type: str = None) -> Optional[Dict[str, Any]]:
    """
    Décode un token spécial (vérification, réinitialisation)
    """
    try:
        payload = jwt.decode(token, JWT_RESET_SECRET, algorithms=[JWT_ALGORITHM])
        
        if expected_type and payload.get("type") != expected_type:
            return None
            
        return payload
    except jwt.PyJWTError:
        return None