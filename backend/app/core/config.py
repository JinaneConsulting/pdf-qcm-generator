# Créer un fichier config.py pour centraliser toutes les configurations
import os
from datetime import timedelta

# URLs
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Authentification
TOKEN_EXPIRY_MINUTES = int(os.getenv("TOKEN_EXPIRY_MINUTES", "60"))
SINGLE_SESSION_MODE = os.environ.get("SINGLE_SESSION_MODE", "true").lower() == "true"
MAX_SESSIONS_PER_USER = int(os.environ.get("MAX_SESSIONS_PER_USER", "1"))

# Secrets
JWT_SECRET = os.environ.get("JWT_SECRET", "SECRET_KEY_FOR_JWT_PLEASE_CHANGE")
JWT_RESET_SECRET = os.environ.get("SECRET_RESET", "SECRET_KEY_FOR_RESET_PLEASE_CHANGE")
JWT_ALGORITHM = "HS256"

# Email
SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", 25))
SMTP_TLS = os.getenv("SMTP_TLS", "false").lower() == "true"
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@tondomaine.com")