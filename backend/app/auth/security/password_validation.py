import re
from typing import Tuple

# Constantes pour la validation des mots de passe
MIN_PASSWORD_LENGTH = 8
SPECIAL_CHARS = "!@#$%^&*(),.?\":{}|<>"

# Texte expliquant les règles de mot de passe
PASSWORD_RULES_TEXT = f"""
Le mot de passe doit respecter les règles suivantes :
- Au moins {MIN_PASSWORD_LENGTH} caractères
- Au moins une lettre majuscule
- Au moins une lettre minuscule
- Au moins un chiffre
- Au moins un caractère spécial ({SPECIAL_CHARS})
- Ne pas être un mot de passe courant
"""

# Liste de mots de passe courants à interdire
COMMON_PASSWORDS = [
    "password", "123456", "qwerty", "abc123", "admin123", 
    "welcome", "welcome1", "password123", "admin", "user"
]

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Vérifie que le mot de passe respecte les règles de sécurité.
    Retourne (True, "") si le mot de passe est valide, sinon (False, "message d'erreur").
    """
    # Longueur minimale
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, PASSWORD_RULES_TEXT
    
    # Vérifier la présence d'au moins une lettre majuscule
    if not re.search(r'[A-Z]', password):
        return False, PASSWORD_RULES_TEXT
    
    # Vérifier la présence d'au moins une lettre minuscule
    if not re.search(r'[a-z]', password):
        return False, PASSWORD_RULES_TEXT
    
    # Vérifier la présence d'au moins un chiffre
    if not re.search(r'\d', password):
        return False, PASSWORD_RULES_TEXT
    
    # Vérifier la présence d'au moins un caractère spécial
    if not re.search(f'[{re.escape(SPECIAL_CHARS)}]', password):
        return False, PASSWORD_RULES_TEXT
    
    # Vérifier que le mot de passe n'est pas trop commun
    if password.lower() in COMMON_PASSWORDS:
        return False, PASSWORD_RULES_TEXT
    
    # Si toutes les validations sont passées
    return True, ""