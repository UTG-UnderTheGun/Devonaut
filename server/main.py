# from fastapi import FastAPI
# from api.v1.endpoints import auth, user
# from db.session import init_db
#
# app = FastAPI()
#
# @app.on_event("startup")
# async def startup_event():
#     await init_db()
#
# app.include_router(auth.router, prefix="/auth", tags=["auth"])
# app.include_router(user.router, prefix="/users", tags=["users"])
#

import os
from fastapi import FastAPI, Depends, HTTPException, status, Response, Request
from pydantic import BaseModel
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from pymongo import MongoClient
from fastapi.middleware.cors import CORSMiddleware

# Setup FastAPI app
app = FastAPI()

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Adjust this to your frontend's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Secret key for JWT and Hashing Algorithm
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# MongoDB connection
client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client["mydatabase"]
collection = db["users"]

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models for requests and responses
class User(BaseModel):
    username: str
    password: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Utility functions

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user(db, username: str):
    user = db.find_one({"username": username})
    if user:
        return user
    return None

# Custom dependency to get current user from cookie
async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        token_data = TokenData(username=username)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = get_user(collection, token_data.username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user

# Routes

@app.post("/register")
async def register(user: User):
    if get_user(collection, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    collection.insert_one({"username": user.username, "hashed_password": hashed_password})
    
    return {"message": "User registered successfully"}

@app.post("/token")
async def login(response: Response, user: User):
    user_data = get_user(collection, user.username)
    if not user_data or not verify_password(user.password, user_data['hashed_password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect username or password",
                            headers={"WWW-Authenticate": "Bearer"})

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    # Store token in a secure cookie
    response.set_cookie(key="access_token", value=access_token, httponly=True, samesite='lax')
    
    return {"message": "Login successful"}

@app.get("/users/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"]}

# Logout endpoint
@app.post("/logout")
async def logout(response: Response):
    # Remove the access_token cookie by setting it to expire immediately
    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}
