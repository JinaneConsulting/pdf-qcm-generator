from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from typing import Optional

from app.models import PDFUploadResponse, QCMResponse
from app.pdf_processor import PDFProcessor

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

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a PDF file and store it for QCM generation
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        file_content = await file.read()
        
        file_id = pdf_processor.save_uploaded_pdf(file_content)
        
        return PDFUploadResponse(
            file_id=file_id,
            message="PDF uploaded successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading PDF: {str(e)}")

@app.post("/generate-qcm/{file_id}", response_model=QCMResponse)
async def generate_qcm(file_id: str, num_questions: Optional[int] = Form(5)):
    """
    Generate QCM questions from a previously uploaded PDF
    """
    try:
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
