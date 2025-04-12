import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("SENDGRID_FROM", "no-reply@tondomaine.com")

def send_verification_email(email: str, token: str):
    verification_link = f"http://localhost:8000/auth/verify?token={token}"

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=email,
        subject="Vérification de votre compte",
        html_content=f"""
        <p>Bonjour,</p>
        <p>Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse e-mail :</p>
        <a href="{verification_link}">Vérifier mon compte</a>
        <p>Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer ce message.</p>
        """,
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        sg.send(message)
    except Exception as e:
        print(f"Erreur d'envoi d'email : {e}")

