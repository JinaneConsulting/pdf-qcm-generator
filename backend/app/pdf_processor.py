import os
import uuid
from pathlib import Path
from typing import List, Dict, Any
import pypdf
from langchain_openai import ChatOpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class PDFProcessor:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.7,
            api_key=os.environ.get("OPENAI_API_KEY", "placeholder-key")
        )
        
        self.qcm_prompt = PromptTemplate(
            input_variables=["content", "num_questions"],
            template="""
            Based on the following content from a PDF document, create {num_questions} multiple-choice questions.
            
            CONTENT:
            {content}
            
            For each question, provide:
            1. A clear question text
            2. Four possible answer choices (A, B, C, D)
            3. The correct answer (indicate which letter is correct)
            4. A brief explanation of why the answer is correct
            
            Format your response as a JSON array with the following structure:
            [
                {{
                    "question": "Question text here",
                    "choices": [
                        {{"id": "A", "text": "First choice"}},
                        {{"id": "B", "text": "Second choice"}},
                        {{"id": "C", "text": "Third choice"}},
                        {{"id": "D", "text": "Fourth choice"}}
                    ],
                    "correct_answer_id": "A",
                    "explanation": "Explanation of why A is correct"
                }},
                // more questions...
            ]
            
            Make sure the questions cover different aspects of the content and vary in difficulty.
            """
        )
        
        self.qcm_chain = LLMChain(llm=self.llm, prompt=self.qcm_prompt)
    
    def save_uploaded_pdf(self, file_content: bytes) -> str:
        """Save the uploaded PDF and return a unique file ID"""
        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{file_id}.pdf"
        
        with open(file_path, "wb") as f:
            f.write(file_content)
            
        return file_id
    
    def extract_text_from_pdf(self, file_id: str) -> str:
        """Extract text content from a PDF file"""
        file_path = UPLOAD_DIR / f"{file_id}.pdf"
        
        if not file_path.exists():
            raise FileNotFoundError(f"PDF file with ID {file_id} not found")
        
        text_content = ""
        pdf_title = ""
        
        with open(file_path, "rb") as f:
            pdf_reader = pypdf.PdfReader(f)
            
            if pdf_reader.metadata and hasattr(pdf_reader.metadata, "title") and pdf_reader.metadata.title:
                pdf_title = pdf_reader.metadata.title
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text_content += page.extract_text() + "\n\n"
        
        if not pdf_title:
            pdf_title = f"Document {file_id}"
            
        return text_content, pdf_title
    
    def generate_qcm(self, file_id: str, num_questions: int = 5) -> Dict[str, Any]:
        """Generate QCM questions from a PDF file"""
        try:
            text_content, pdf_title = self.extract_text_from_pdf(file_id)
            
            max_tokens = 4000  # Approximate token limit for context
            if len(text_content) > max_tokens * 4:  # Rough character to token ratio
                text_content = text_content[:max_tokens * 4]
            
            result = self.qcm_chain.invoke({
                "content": text_content,
                "num_questions": num_questions
            })
            
            import json
            import re
            
            json_match = re.search(r'\[\s*{.*}\s*\]', result["text"], re.DOTALL)
            if json_match:
                questions_json = json_match.group(0)
                questions = json.loads(questions_json)
            else:
                questions = []
            
            return {
                "questions": questions,
                "pdf_title": pdf_title
            }
            
        except Exception as e:
            print(f"Error generating QCM: {str(e)}")
            return {
                "questions": [],
                "pdf_title": f"Document {file_id}"
            }
