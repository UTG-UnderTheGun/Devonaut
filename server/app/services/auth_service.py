import os
from fastapi import HTTPException, status, Response
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.db.session import get_user
from app.db.schemas import User, Token
from app.db.database import collection
from app.core.config import SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.security import verify_password, get_password_hash, create_access_token

async def register(user: User):
    if get_user(collection, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    collection.insert_one({"username": user.username, "hashed_password": hashed_password})
    
    return user  

async def login(response: Response, user: User):
    user_data = get_user(collection, user.username)
    if not user_data or not verify_password(user.password, user_data['hashed_password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect username or password",
                            headers={"WWW-Authenticate": "Bearer"})

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    response.set_cookie(key="access_token", value=access_token, httponly=True, samesite='lax')
    
    return {"message": "Login successful", "token": access_token}

async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}
