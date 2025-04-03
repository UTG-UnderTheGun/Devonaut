from fastapi import APIRouter, HTTPException, Response, Request, status, Depends
from fastapi.responses import RedirectResponse
from typing import Optional
from pydantic import BaseModel
from app.services.auth_service import (
    login,
    register,
    logout,
    process_google_callback,
    get_google_auth_url,
    login_with_tu,  # Import the new TU authentication function
)
from app.db.schemas import User


# Create a model for TU login
class TULoginRequest(BaseModel):
    username: str
    password: str


router = APIRouter()


# Add TU authentication endpoint
@router.post("/tu/login")
async def tu_login(response: Response, request: TULoginRequest):
    """
    Authenticate using Thammasat University API
    """
    return await login_with_tu(response, request.username, request.password)


# Existing endpoints
@router.get("/google")
async def google_login():
    auth_url = await get_google_auth_url()
    print(f"Redirecting to Google Auth URL: {auth_url}")
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(request: Request):
    query_params = request.query_params
    print(f"Received callback with params: {dict(query_params)}")
    if "error" in query_params:
        raise HTTPException(
            status_code=400, detail=f"Google OAuth error: {query_params['error']}"
        )
    code = query_params.get("code")
    if not code:
        raise HTTPException(
            status_code=400, detail="Authorization code missing from callback URL"
        )
    return await process_google_callback(request, code)


@router.post("/register")
async def register_user(user: User):
    try:
        result = await register(user)
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/token")
async def login_user(response: Response, user: User):
    return await login(response, user)


@router.post("/logout")
async def logout_user(response: Response):
    return await logout(response)

