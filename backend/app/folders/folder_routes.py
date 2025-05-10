import os
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_async_session
from app.auth import get_current_user
from app.models import User, Folder, PDF

# Configuration du logger
logger = logging.getLogger(__name__)

# Création du router pour les opérations sur les dossiers
router = APIRouter(prefix="/folders", tags=["folders"])

# Route pour créer un nouveau dossier
@router.post("/create")
async def create_folder(
    request: Request,
    name: str = Body(..., embed=True),
    parent_id: Optional[int] = Body(None, embed=True),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Endpoint pour créer un nouveau dossier
    """
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
        
        # Vérifier si le dossier parent existe (si spécifié)
        if parent_id:
            parent_folder = await session.get(Folder, parent_id)
            if not parent_folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dossier parent non trouvé"
                )
            
            # Vérifier que le dossier parent appartient à l'utilisateur
            if parent_folder.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Vous n'avez pas les droits pour ce dossier parent"
                )
        
        # Créer le nouveau dossier
        new_folder = Folder(
            name=name,
            user_id=current_user.id,
            parent_id=parent_id
        )
        
        session.add(new_folder)
        await session.commit()
        await session.refresh(new_folder)
        
        logger.info(f"Folder created successfully. ID: {new_folder.id}, User: {current_user.id}")
        
        # Renvoyer une réponse JSON
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": "Dossier créé avec succès",
                "folder_id": new_folder.id,
                "name": new_folder.name
            }
        )
        
    except HTTPException as he:
        # Relancer les HTTPException telles quelles
        raise he
    except Exception as e:
        logger.exception(f"Error creating folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la création du dossier: {str(e)}"
        )

# Route pour récupérer tous les dossiers d'un utilisateur
@router.get("/list")
async def list_folders(
    request: Request,
    parent_id: Optional[int] = None,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Récupère tous les dossiers d'un utilisateur
    Si parent_id est fourni, récupère uniquement les dossiers enfants du dossier spécifié
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
        # Requête pour récupérer les dossiers de l'utilisateur
        query = select(Folder).where(Folder.user_id == current_user.id)
        
        # Si parent_id est fourni, filtrer par parent_id
        if parent_id is not None:
            query = query.where(Folder.parent_id == parent_id)
        else:
            # Sinon, récupérer les dossiers racine (sans parent)
            query = query.where(Folder.parent_id == None)
        
        result = await session.execute(query)
        folders = result.scalars().all()
        
        folder_list = []
        for folder in folders:
            # Compter le nombre d'éléments dans le dossier (sous-dossiers et fichiers)
            subfolders_query = select(Folder).where(Folder.parent_id == folder.id)
            subfolders_result = await session.execute(subfolders_query)
            subfolder_count = len(subfolders_result.scalars().all())
            
            # Compter le nombre de fichiers dans le dossier
            files_query = select(PDF).where(PDF.folder_id == folder.id)
            files_result = await session.execute(files_query)
            file_count = len(files_result.scalars().all())
            
            folder_list.append({
                "id": folder.id,
                "name": folder.name,
                "created_at": folder.created_at.isoformat(),
                "subfolder_count": subfolder_count,
                "file_count": file_count
            })
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "count": len(folder_list),
                "folders": folder_list
            }
        )
        
    except Exception as e:
        logger.error(f"Error retrieving folders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des dossiers: {str(e)}"
        )

# Route pour supprimer un dossier
@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: int,
    request: Request,
    recursive: bool = False,
    session: AsyncSession = Depends(get_async_session)
):
    """
    Supprime un dossier
    Si recursive=True, supprime également tous les sous-dossiers et fichiers
    Sinon, la suppression échoue si le dossier n'est pas vide
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
        # Récupérer le dossier
        folder = await session.get(Folder, folder_id)
        
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dossier non trouvé"
            )
        
        # Vérifier que le dossier appartient à l'utilisateur
        if folder.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas les droits pour supprimer ce dossier"
            )
        
        # Vérifier si le dossier a des sous-dossiers
        subfolders_query = select(Folder).where(Folder.parent_id == folder_id)
        subfolders_result = await session.execute(subfolders_query)
        subfolders = subfolders_result.scalars().all()
        
        # Vérifier si le dossier contient des fichiers
        files_query = select(PDF).where(PDF.folder_id == folder_id)
        files_result = await session.execute(files_query)
        files = files_result.scalars().all()
        has_files = len(files) > 0
        
        # Si le dossier n'est pas vide et que la suppression récursive n'est pas demandée
        if (len(subfolders) > 0 or has_files) and not recursive:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le dossier n'est pas vide. Utilisez recursive=true pour supprimer le dossier et son contenu"
            )
        
        # Si suppression récursive est demandée, supprimer tous les sous-dossiers
        if recursive:
            # Fonction récursive pour supprimer les sous-dossiers
            async def delete_subfolder(subfolder_id):
                # Récupérer les sous-dossiers du sous-dossier actuel
                sub_query = select(Folder).where(Folder.parent_id == subfolder_id)
                sub_result = await session.execute(sub_query)
                sub_folders = sub_result.scalars().all()
                
                # Supprimer récursivement chaque sous-dossier
                for sub in sub_folders:
                    await delete_subfolder(sub.id)
                
                # Supprimer le sous-dossier actuel
                sub_folder = await session.get(Folder, subfolder_id)
                if sub_folder:
                    await session.delete(sub_folder)
            
            # Supprimer tous les sous-dossiers
            for subfolder in subfolders:
                await delete_subfolder(subfolder.id)
                
            # Mettre à jour les fichiers pour enlever la référence au dossier
            for file in files:
                file.folder_id = None
                session.add(file)
        
        # Supprimer le dossier principal
        await session.delete(folder)
        await session.commit()
        
        logger.info(f"Folder deleted successfully. ID: {folder_id}, User: {current_user.id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": "Dossier supprimé avec succès"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la suppression du dossier: {str(e)}"
        )

# Route pour renommer un dossier
@router.patch("/{folder_id}")
async def update_folder(
    folder_id: int,
    request: Request,
    name: str = Body(..., embed=True),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Renomme un dossier
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
        # Récupérer le dossier
        folder = await session.get(Folder, folder_id)
        
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dossier non trouvé"
            )
        
        # Vérifier que le dossier appartient à l'utilisateur
        if folder.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas les droits pour modifier ce dossier"
            )
        
        # Renommer le dossier
        folder.name = name
        session.add(folder)
        await session.commit()
        await session.refresh(folder)
        
        logger.info(f"Folder renamed successfully. ID: {folder_id}, User: {current_user.id}")
        
        # Compter les sous-dossiers et fichiers pour la réponse
        subfolders_query = select(Folder).where(Folder.parent_id == folder.id)
        subfolders_result = await session.execute(subfolders_query)
        subfolder_count = len(subfolders_result.scalars().all())
        
        files_query = select(PDF).where(PDF.folder_id == folder.id)
        files_result = await session.execute(files_query)
        file_count = len(files_result.scalars().all())
        
        return {
            "id": folder.id,
            "name": folder.name,
            "parent_id": folder.parent_id,
            "created_at": folder.created_at.isoformat(),
            "subfolder_count": subfolder_count,
            "file_count": file_count
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour du dossier: {str(e)}"
        )