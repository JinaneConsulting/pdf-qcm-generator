# PDF QCM Generator

Application de génération de questionnaires à choix multiples (QCM) à partir de documents PDF.

## Structure du projet

- **backend/** - API FastAPI pour traiter les PDF et générer des QCM
- **frontend/** - Interface React avec Tailwind CSS et shadcn/ui

## Fonctionnalités

- Upload de fichiers PDF
- Génération de QCM à partir du contenu des PDF via LLM
- Interface utilisateur intuitive inspirée de ChatPDF
- Système de quiz interactif avec notation automatique

## Prérequis

- Python 3.10+
- Node.js 18+
- Poetry (pour la gestion des dépendances Python)
- Clé API OpenAI

## Installation

### Backend

1. Configurer la clé API OpenAI dans `backend/.env`
   ```
   OPENAI_API_KEY=votre-clé-api-openai
   ```

2. Installer les dépendances et démarrer le serveur
   ```bash
   cd backend
   poetry install
   poetry run fastapi dev app/main.py
   ```

### Frontend

1. Installer les dépendances et démarrer le serveur de développement
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. Accéder à l'application via http://localhost:5173

## Utilisation

1. Télécharger un fichier PDF
2. Configurer le nombre de questions à générer
3. Générer le QCM
4. Répondre aux questions et voir les résultats

## Technologies utilisées

### Backend
- FastAPI
- LangChain
- OpenAI
- PyPDF

### Frontend
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons

## Déploiement

L'application est prête à être déployée sur un serveur. Vous pouvez utiliser des services comme:

- Backend: Fly.io, Heroku, AWS, etc.
- Frontend: Vercel, Netlify, GitHub Pages, etc.

## Licence

MIT
