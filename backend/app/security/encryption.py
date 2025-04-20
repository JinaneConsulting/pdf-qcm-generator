from cryptography.fernet import Fernet
import os

# Générer une clé une seule fois (à stocker de manière sécurisée)
KEY = os.environ.get("ENCRYPTION_KEY", Fernet.generate_key().decode())

cipher_suite = Fernet(KEY)

def encrypt_data(data: str) -> bytes:
    return cipher_suite.encrypt(data.encode())

def decrypt_data(encrypted_data: bytes) -> str:
    return cipher_suite.decrypt(encrypted_data).decode()