# app/email_utils.py
import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configuration du logging
logger = logging.getLogger(__name__)

def send_verification_email(email: str, token: str):
    """
    Envoie un email de vérification avec un token
    """
    # Utiliser l'URL frontend pour la vérification
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    verification_link = f"{frontend_url}/auth/verify?token={token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Vérification de votre compte"
    msg["From"] = os.getenv("SMTP_FROM", "no-reply@tondomaine.com")
    msg["To"] = email

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

    part = MIMEText(html, "html")
    msg.attach(part)

    try:
        with smtplib.SMTP(os.getenv("SMTP_HOST", "localhost"), int(os.getenv("SMTP_PORT", 25))) as server:
            if os.getenv("SMTP_TLS", "false").lower() == "true":
                server.starttls()
            if os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"):
                server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
            server.sendmail(msg["From"], [email], msg.as_string())
            logger.info(f"Email de vérification envoyé à {email}")
            return True
    except Exception as e:
        logger.error(f"Erreur d'envoi d'e-mail SMTP : {e}")
        return False

def send_password_reset_email(email: str, token: str):
    """
    Envoie un email de réinitialisation de mot de passe
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/auth/reset-password?token={token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Réinitialisation de votre mot de passe"
    msg["From"] = os.getenv("SMTP_FROM", "no-reply@tondomaine.com")
    msg["To"] = email

    html = f"""
    <html>
      <body>
        <p>Bonjour,<br>
           Vous avez demandé une réinitialisation de votre mot de passe. Veuillez cliquer sur le lien ci-dessous :<br>
           <a href="{reset_link}">Réinitialiser mon mot de passe</a><br>
           Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.
        </p>
      </body>
    </html>
    """

    part = MIMEText(html, "html")
    msg.attach(part)

    try:
        with smtplib.SMTP(os.getenv("SMTP_HOST", "localhost"), int(os.getenv("SMTP_PORT", 25))) as server:
            if os.getenv("SMTP_TLS", "false").lower() == "true":
                server.starttls()
            if os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD"):
                server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
            server.sendmail(msg["From"], [email], msg.as_string())
            logger.info(f"Email de réinitialisation envoyé à {email}")
            return True
    except Exception as e:
        logger.error(f"Erreur d'envoi d'e-mail SMTP : {e}")
        return False