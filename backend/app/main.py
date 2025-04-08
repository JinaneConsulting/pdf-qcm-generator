from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
from typing import Optional, List
import uuid

from app.models import PDFUploadResponse, QCMResponse, User, UserRead, UserCreate, UserUpdate, UserPDF
from app.pdf_processor import PDFProcessor
from app.database import create_db_and_tables, get_async_session
from app.auth import fastapi_users, current_active_user, jwt_backend
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

app = FastAPI(title="PDF QCM Generator")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

pdf_processor = PDFProcessor()

app.include_router(
    fastapi_users.get_auth_router(jwt_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

from app.google_oauth import router as google_oauth_router
app.include_router(
    google_oauth_router,
    prefix="/auth",
    tags=["auth"],
)


@app.on_event("startup")
async def on_startup():
    await create_db_and_tables()

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Upload a PDF file and store it for QCM generation
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        file_content = await file.read()
        
        file_id = pdf_processor.save_uploaded_pdf(file_content)
        
        user_pdf = UserPDF(
            user_id=user.id,
            file_id=file_id,
            title=file.filename
        )
        session.add(user_pdf)
        await session.commit()
        
        return PDFUploadResponse(
            file_id=file_id,
            message="PDF uploaded successfully"
        )
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Error uploading PDF: {str(e)}")

@app.post("/generate-qcm/{file_id}", response_model=QCMResponse)
async def generate_qcm(
    file_id: str, 
    num_questions: Optional[int] = Form(5),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Generate QCM questions from a previously uploaded PDF
    """
    try:
        stmt = select(UserPDF).where(
            (UserPDF.user_id == user.id) & (UserPDF.file_id == file_id)
        )
        result = await session.execute(stmt)
        user_pdf = result.scalar_one_or_none()
        
        if not user_pdf:
            raise HTTPException(status_code=404, detail="PDF not found or you don't have access to it")
        
        if num_questions < 1 or num_questions > 20:
            raise HTTPException(
                status_code=400, 
                detail="Number of questions must be between 1 and 20"
            )
        
        result = pdf_processor.generate_qcm(file_id, num_questions)
        
        if not result["questions"]:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate questions from the PDF"
            )
        
        return QCMResponse(
            questions=result["questions"],
            pdf_title=result["pdf_title"]
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"PDF with ID {file_id} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating QCM: {str(e)}")

@app.get("/user/pdfs", response_model=List[dict])
async def get_user_pdfs(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get all PDFs uploaded by the current user
    """
    try:
        stmt = select(UserPDF).where(UserPDF.user_id == user.id)
        result = await session.execute(stmt)
        user_pdfs = result.scalars().all()
        
        return [
            {
                "id": pdf.id,
                "file_id": pdf.file_id,
                "title": pdf.title,
                "created_at": pdf.created_at
            }
            for pdf in user_pdfs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving PDFs: {str(e)}")
