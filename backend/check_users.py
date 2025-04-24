import sqlite3
import os
from pathlib import Path

# Trouver le chemin absolu du répertoire actuel
current_dir = Path().absolute()
print(f"Répertoire actuel: {current_dir}")

# Chercher test.db dans le répertoire actuel
db_path = current_dir / "test.db"
print(f"Recherche de la base de données à: {db_path}")

if not os.path.exists(db_path):
    print(f"La base de données n'existe pas à cet emplacement!")
    
    # Chercher dans le répertoire parent
    parent_dir = current_dir.parent
    db_path = parent_dir / "test.db"
    print(f"Tentative dans le répertoire parent: {db_path}")
    
    if not os.path.exists(db_path):
        print("Base de données introuvable!")
        exit(1)

print(f"Base de données trouvée à: {db_path}")

# Connecter à la base de données
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Afficher la structure de la table users
cursor.execute("PRAGMA table_info(users)")
columns = cursor.fetchall()
print("\nStructure de la table users:")
for col in columns:
    print(f"  {col[1]} ({col[2]})")

# Lister tous les utilisateurs
print("\nListe des utilisateurs:")
cursor.execute("SELECT id, _encrypted_email, is_active, is_verified, created_at FROM users")
users = cursor.fetchall()

if not users:
    print("Aucun utilisateur trouvé dans la base de données.")
else:
    for user in users:
        print(f"ID: {user[0]}, Email chiffré: {user[1]}, Actif: {user[2]}, Vérifié: {user[3]}, Créé le: {user[4]}")

# Vérifier s'il y a des doublons d'emails
print("\nVérification des doublons potentiels:")
cursor.execute("SELECT _encrypted_email, COUNT(*) FROM users GROUP BY _encrypted_email HAVING COUNT(*) > 1")
duplicates = cursor.fetchall()

if not duplicates:
    print("Aucun doublon d'email trouvé.")
else:
    print("Doublons trouvés:")
    for dup in duplicates:
        print(f"  Email chiffré: {dup[0]}, Nombre d'occurrences: {dup[1]}")
        
        # Afficher les détails des utilisateurs en double
        cursor.execute("SELECT id, is_active, is_verified, created_at FROM users WHERE _encrypted_email = ?", (dup[0],))
        dup_users = cursor.fetchall()
        for u in dup_users:
            print(f"    ID: {u[0]}, Actif: {u[1]}, Vérifié: {u[2]}, Créé le: {u[3]}")

conn.close()