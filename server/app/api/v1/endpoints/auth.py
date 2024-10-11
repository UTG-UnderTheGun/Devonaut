from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import OAuth2PasswordRequestForm
from app.services.auth_service import login, register, logout
from app.db.schemas import User, Token

router = APIRouter()

@router.post("/register", response_model=User)
async def register_user(user: User):
    return await register(user)

@router.post("/token")
async def login_user(response: Response, user: User):
    return await login(response, user)

@router.post("/logout")
async def logout_user(response: Response):
    return await logout(response)

