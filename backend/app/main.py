# app/main.py
import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import UserRead, UserCreate, UserUpdate
from app.auth import fastapi_users, current_active_user, router as auth_router

# Logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# Include authentication routes
app.include_router(auth_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    from app.database import create_db_and_tables
    await create_db_and_tables()
    logger.info("Application started and ready to receive requests.")

@app.get("/")
def root():
    logger.debug("Access to root route /")
    return {"message": "Welcome to PDF QCM Generator API"}

@app.get("/protected-route")
async def protected_route(user=Depends(current_active_user)):
    logger.debug(f"Access to protected route by {user.email}")
    return {"message": f"Welcome {user.email}!"}