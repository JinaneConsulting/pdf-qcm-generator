import os
from typing import Dict, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from httpx_oauth.clients.google import GoogleOAuth2
from httpx_oauth.oauth2 import OAuth2Token

from app.auth import get_user_manager, UserManager
from app.database import get_user_db
from app.models import User

router = APIRouter()

google_oauth_client = GoogleOAuth2(
    os.environ.get("GOOGLE_CLIENT_ID", ""),
    os.environ.get("GOOGLE_CLIENT_SECRET", ""),
)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.environ.get("BACKEND_URL", "https://pdf-qcm-generator-tunnel-ox62185z.devinapps.com")

async def get_oauth_token(
    request: Request,
    response: Response,
    oauth_client: GoogleOAuth2,
    redirect_uri: str,
    state: Optional[str] = None,
) -> Tuple[OAuth2Token, str]:
    """
    Get OAuth2 token from Google
    """
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Code not provided")
    
    token = await oauth_client.get_access_token(code, redirect_uri)
    user_info = await oauth_client.get_id_email(token["access_token"])
    
    return token, user_info["email"]

@router.get("/google/login")
async def google_login():
    """
    Redirect to Google login page
    """
    redirect_uri = f"{BACKEND_URL}/auth/callback"
    return await google_oauth_client.get_authorization_url(
        redirect_uri,
        scope=["email", "profile"],
    )

@router.get("/google/callback")
async def google_callback(
    request: Request,
    user_manager: UserManager = Depends(get_user_manager),
    user_db=Depends(get_user_db),
):
    """
    Handle Google OAuth callback
    """
    redirect_uri = f"{BACKEND_URL}/auth/callback"
    
    try:
        token, email = await get_oauth_token(
            request, Response(), google_oauth_client, redirect_uri
        )
        
        user = await user_db.get_by_email(email)
        
        if not user:
            user_dict = {
                "email": email,
                "is_active": True,
                "is_verified": True,
                "is_superuser": False,
            }
            
            import secrets
            import string
            password = "".join(
                secrets.choice(string.ascii_letters + string.digits)
                for _ in range(20)
            )
            
            user = await user_manager.create(
                user_dict, safe=True, password=password
            )
        
        from app.auth import jwt_backend
        token_data = {"sub": str(user.id), "email": user.email}
        access_token = jwt_backend.get_strategy().write_token(token_data)
        
        redirect_url = f"{FRONTEND_URL}/auth/callback?token={access_token}"
        return RedirectResponse(url=redirect_url)
    
    except Exception as e:
        error_redirect = f"{FRONTEND_URL}/auth/error?error={str(e)}"
        return RedirectResponse(url=error_redirect)
