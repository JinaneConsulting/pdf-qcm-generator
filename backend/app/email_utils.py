### email_utils.py (version SMTP)

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_verification_email(email: str, token: str):
    verification_link = f"http://localhost:8000/auth/verify?token={token}"

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
    except Exception as e:
        print(f"Erreur d'envoi d'e-mail SMTP : {e}")
