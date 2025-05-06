#!/usr/bin/env python
# Script pour donner les droits d'administrateur à un utilisateur dans la base de données

import asyncio
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Import chemin absolu (ajustez selon votre structure)
sys.path.append('.')  # Permet d'importer depuis le répertoire courant

from app.models.user_model import User  # Importer le modèle User
from app.database import DATABASE_URL  # URL de votre base de données

async def make_user_admin(email: str):
    """Rend un utilisateur administrateur en définissant is_superuser = True"""
    
    print(f"Connexion à la base de données: {DATABASE_URL}")
    
    # Créer le moteur et la session asynchrone
    engine = create_async_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    
    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with async_session() as session:
        # Rechercher l'utilisateur par email
        query = select(User).where(User.email == email)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"Erreur: Aucun utilisateur trouvé avec l'email '{email}'")
            return
        
        # Vérifier si l'utilisateur est déjà administrateur
        if user.is_superuser:
            print(f"L'utilisateur '{email}' est déjà administrateur")
            return
        
        # Mettre à jour l'utilisateur comme administrateur
        user.is_superuser = True
        session.add(user)
        await session.commit()
        
        print(f"L'utilisateur '{email}' est maintenant administrateur !")

if __name__ == "__main__":
    # Vérifier les arguments
    if len(sys.argv) != 2:
        print("Usage: python make_admin.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(make_user_admin(email))