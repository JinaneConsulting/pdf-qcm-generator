import os
import logging
import uuid
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_async_session
from app.auth import get_current_user
from app.models import User, PDF

# Configuration du logger
logger = logging.getLogger(__name__)

# Création du router pour les opérations PDF
router = APIRouter(prefix="/pdf", tags=["pdf"])

# Configuration du dossier pour les PDFs
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads/pdfs")

# Créer le dossier d'upload s'il n'existe pas
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Route de téléchargement de PDF
@router.post("/upload")
async def upload_pdf(
    request: Request,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Endpoint pour télécharger un fichier PDF
    """
    # Debug de l'authentification
    auth_header = request.headers.get("Authorization")
    logger.info(f"Auth header: {auth_header[:20] + '...' if auth_header else 'None'}")
    
    try:
        # Vérifier l'authentification de l'utilisateur
        current_user, error = await get_current_user(request, session)
        if error:
            logger.error(f"Authentication error: {error}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error,
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        logger.info(f"User authenticated: {current_user.email}")
        
        # Vérifier si le fichier est un PDF
        if not file.filename or not file.filename.lower().endswith('.pdf'):
            logger.warning(f"Invalid file type: {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Seuls les fichiers PDF sont acceptés"
            )
        
        # Générer un nom de fichier unique
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_location = os.path.join(UPLOAD_DIR, unique_filename)
        
        # S'assurer que le dossier d'upload existe
        os.makedirs(os.path.dirname(file_location), exist_ok=True)
        
        # Lire le contenu du fichier
        file_content = await file.read()
        
        # Vérifier la taille du fichier (limite à 10 MB)
        max_size = 10 * 1024 * 1024  # 10 MB en octets
        if len(file_content) > max_size:
            logger.warning(f"File too large: {len(file_content)} bytes")
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Le fichier est trop volumineux. La limite est de 10 MB."
            )
        
        # Sauvegarder le fichier
        with open(file_location, "wb") as f:
            f.write(file_content)
        
        logger.info(f"File saved to {file_location}")
        
        # Enregistrer les informations dans la base de données
        new_pdf = PDF(
            filename=unique_filename,
            original_filename=file.filename,
            filepath=file_location,
            file_size=len(file_content),
            user_id=current_user.id
        )
        
        session.add(new_pdf)
        await session.commit()
        await session.refresh(new_pdf)
        
        logger.info(f"PDF uploaded successfully. ID: {new_pdf.id}, User: {current_user.id}")
        
        # Renvoyer une réponse JSON
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": "Fichier PDF téléchargé avec succès",
                "file_id": new_pdf.id,
                "filename": file.filename
            }
        )
        
    except HTTPException as he:
        # Relancer les HTTPException telles quelles
        raise he
    except Exception as e:
        logger.exception(f"Error uploading PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du téléchargement du fichier: {str(e)}"
        )

# Route pour récupérer tous les PDFs d'un utilisateur
@router.get("/list")
async def list_pdfs(
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Récupère tous les PDFs d'un utilisateur
    """
    # Vérifier l'authentification de l'utilisateur
    current_user, error = await get_current_user(request, session)
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        # Requête pour récupérer tous les PDFs de l'utilisateur
        query = select(PDF).where(PDF.user_id == current_user.id)
        result = await session.execute(query)
        pdfs = result.scalars().all()
        
        pdf_list = []
        for pdf in pdfs:
            pdf_list.append({
                "id": pdf.id,
                "filename": pdf.original_filename,
                "file_size": pdf.file_size,
                "uploaded_at": pdf.upload_date.isoformat()
            })
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "count": len(pdf_list),
                "pdfs": pdf_list
            }
        )
        
    except Exception as e:
        logger.error(f"Error retrieving PDFs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des PDFs: {str(e)}"
        )

# Route pour supprimer un PDF
@router.delete("/{pdf_id}")
async def delete_pdf(
    pdf_id: int,
    request: Request,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Supprime un PDF
    """
    # Vérifier l'authentification de l'utilisateur
    current_user, error = await get_current_user(request, session)
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        # Récupérer le PDF
        result = await session.execute(select(PDF).where(PDF.id == pdf_id))
        pdf = result.scalar_one_or_none()
        
        if not pdf:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDF non trouvé"
            )
        
        # Vérifier que le PDF appartient à l'utilisateur
        if pdf.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas les droits pour supprimer ce PDF"
            )
        
        # Supprimer le fichier
        if os.path.exists(pdf.filepath):
            try:
                os.remove(pdf.filepath)
                logger.info(f"File deleted from disk: {pdf.filepath}")
            except OSError as e:
                logger.warning(f"Could not delete file from disk: {str(e)}")
        else:
            logger.warning(f"File not found on disk: {pdf.filepath}")
        
        # Supprimer l'entrée de la base de données
        await session.delete(pdf)
        await session.commit()
        
        logger.info(f"PDF deleted successfully. ID: {pdf_id}, User: {current_user.id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": "PDF supprimé avec succès"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting PDF: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression du PDF: {str(e)}"
        )