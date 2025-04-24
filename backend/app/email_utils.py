# app/email_utils.py
import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configuration du logging
logger = logging.getLogger(__name__)

# Récupérer les variables d'environnement
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
SMTP_HOST = os.getenv("SMTP_HOST", "localhost")
SMTP_PORT = int(os.getenv("SMTP_PORT", 25))
SMTP_TLS = os.getenv("SMTP_TLS", "false").lower() == "true"
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "no-reply@tondomaine.com")

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Fonction générique pour envoyer un email
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    part = MIMEText(html_content, "html")
    msg.attach(part)

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_TLS:
                server.starttls()
            if SMTP_USER and SMTP_PASSWORD:
                server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())
            logger.info(f"Email envoyé à {to_email}")
            return True
    except Exception as e:
        logger.error(f"Erreur d'envoi d'e-mail SMTP : {e}")
        return False

def send_verification_email(email: str, token: str) -> bool:
    """
    Envoie un email de vérification avec un token
    """
    verification_link = f"{FRONTEND_URL}/auth/verify?token={token}"

    html = f"""
    <html>
      <body>
        <p>Bonjour,<br>
           Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse e-mail :<br>
           <a href="{verification_link}">Vérifier mon compte</a><br>
           Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer ce message.
        </p>
      </body>
    </html>
    """

    return send_email(email, "Vérification de votre compte", html)

def send_reset_password_email(email: str, token: str) -> bool:
    """
    Envoie un email de réinitialisation de mot de passe avec un token
    """
    reset_link = f"{FRONTEND_URL}/auth/reset-password?token={token}"

    html = f"""
    <html>
      <body>
        <p>Bonjour,<br>
           Vous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le lien ci-dessous pour créer un nouveau mot de passe :<br>
           <a href="{reset_link}">Réinitialiser mon mot de passe</a><br>
           Ce lien est valable pendant 24 heures.<br>
           Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.
        </p>
      </body>
    </html>
    """

    return send_email(email, "Réinitialisation de votre mot de passe", html)