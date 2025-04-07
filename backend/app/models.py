from pydantic import BaseModel
from typing import List, Optional

class PDFUploadResponse(BaseModel):
    file_id: str
    message: str

class QuestionChoice(BaseModel):
    id: str
    text: str

class Question(BaseModel):
    id: str
    text: str
    choices: List[QuestionChoice]
    correct_answer_id: str
    explanation: Optional[str] = None

class QCMResponse(BaseModel):
    questions: List[Question]
    pdf_title: str
