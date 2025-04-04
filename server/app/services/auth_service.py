import os
import json
import httpx
import logging
from urllib.parse import urlencode
from typing import Optional, Dict, Any
from fastapi.responses import RedirectResponse
from fastapi import HTTPException, status, Response, Request
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.db.session import get_user
from app.db.schemas import User
from app.db.database import collection
from app.core.config import SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.security import verify_password, get_password_hash, create_access_token
from bson import ObjectId

# Setup logger
logger = logging.getLogger(__name__)

# Google OAuth Constants
GOOGLE_USER_INFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = (
    os.getenv("OAUTH_REDIRECT_URI") or "http://localhost:8000/auth/google/callback"
)
FRONTEND_URL = os.getenv("FRONTEND_URL") or "http://localhost:3000"
GOOGLE_REDIRECT_URI = "https://www.mari0nette.com/api/auth/google/callback"

# TU API Constants
TU_API_ENDPOINT = "https://restapi.tu.ac.th/api/v1/auth/Ad/verify"
TU_APPLICATION_KEY = os.getenv(
    "TU_APPLICATION_KEY",
    "TUb14a6492de394d94dc7004de36a3187848db8f9f56dda5d63f00cc013861cb916ccaffbf48c9d8cb39b23855c15b088f",
)


async def register(user: User):
    """
    Register a new user in the database
    """
    # Check if username already exists
    if get_user(collection, user.username):
        raise HTTPException(status_code=400, detail="Username already registered")

    # Create user document
    user_doc = {
        "username": user.username,
        "hashed_password": get_password_hash(user.password),
        "email": user.email,
        "name": user.name,
        "role": user.role or "student",  # Default to student if not specified
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "_id": ObjectId(),  # Generate MongoDB ID
    }

    try:
        # Insert into MongoDB
        result = collection.insert_one(user_doc)

        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create user")

        # Remove password from response
        user_doc.pop("hashed_password")
        return {
            "message": "User registered successfully",
            "user": {
                **user_doc,
                "_id": str(user_doc["_id"]),  # Convert ObjectId to string
            },
        }

    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Internal server error during registration"
        )


async def login(response: Response, user: User):
    """
    Authenticate a user and return a JWT token
    """
    user_data = get_user(collection, user.username)
    if not user_data or not verify_password(
        user.password, user_data["hashed_password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user_data.get("role", "student"),  # Include role in token
        },
        expires_delta=access_token_expires,
    )

    response.set_cookie(
        key="access_token", value=access_token, httponly=True, samesite="lax"
    )

    return {
        "message": "Login successful",
        "token": access_token,
        "role": user_data.get("role", "student"),
    }


async def login_with_tu(response: Response, username: str, password: str):
    """
    Authenticate user with Thammasat University API and store comprehensive user data
    """
    try:
        async with httpx.AsyncClient() as client:
            # Call TU API to verify credentials
            auth_response = await client.post(
                TU_API_ENDPOINT,
                json={"UserName": username, "PassWord": password},
                headers={
                    "Content-Type": "application/json",
                    "Application-Key": TU_APPLICATION_KEY,
                },
            )

            # Check if the response is successful
            if auth_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication failed with TU API",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Parse the TU API response
            tu_data = auth_response.json()

            # Check if authentication was successful according to TU API response structure
            if not tu_data.get("status") or tu_data.get("message") != "Success":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication failed with TU API",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Extract all available user data from TU API
            user_type = tu_data.get("type", "student").lower()
            tu_username = tu_data.get("username", username)
            tu_email = tu_data.get("email", f"{username}@dome.tu.ac.th")
            tu_name_en = tu_data.get("displayname_en", "")
            tu_name_th = tu_data.get("displayname_th", "")
            tu_status = tu_data.get("tu_status", "")
            tu_status_id = tu_data.get("statusid", "")
            tu_department = tu_data.get("department", "")
            tu_faculty = tu_data.get("faculty", "")

            # Check if user exists in our database
            existing_user = get_user(collection, tu_username)

            # Prepare user document with all available TU data
            user_doc = {
                "username": tu_username,
                "email": tu_email,
                "name": tu_name_en,
                "name_th": tu_name_th,
                "tu_status": tu_status,
                "status_id": tu_status_id,
                "department": tu_department,
                "faculty": tu_faculty,
                "role": user_type,  # Set role based on TU API response
                "updated_at": datetime.utcnow(),
                "tu_verified": True,
            }

            if not existing_user:
                # For new users, add creation-specific fields
                user_doc.update(
                    {
                        "hashed_password": get_password_hash("tu_authenticated_user"),
                        "created_at": datetime.utcnow(),
                        "_id": ObjectId(),
                    }
                )

                # Insert new user
                result = collection.insert_one(user_doc)
                if not result.inserted_id:
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to create user from TU authentication",
                    )
            else:
                # Update existing user with latest TU information
                collection.update_one({"username": tu_username}, {"$set": user_doc})

            # Create access token with role information
            access_token_expires = timedelta(minutes=120)  # 2 hours
            access_token = create_access_token(
                data={"sub": tu_username, "role": user_type},
                expires_delta=access_token_expires,
            )

            # Set cookie
            response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=7200,  # 2 hours in seconds
            )

            # Return comprehensive user info
            return {
                "status": tu_data.get("status", True),
                "message": tu_data.get("message", "Success"),
                "type": user_type,
                "token": access_token,
                "user": {
                    "username": tu_username,
                    "email": tu_email,
                    "name": tu_name_en,
                    "name_th": tu_name_th,
                    "department": tu_department,
                    "faculty": tu_faculty,
                },
            }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"TU Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TU Authentication error: {str(e)}",
        )


async def get_google_auth_url():
    """
    Generate Google OAuth authorization URL
    """
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    auth_url = f"{GOOGLE_AUTHORIZATION_ENDPOINT}?{urlencode(params)}"
    return auth_url


async def process_google_callback(request: Request, code: Optional[str] = None):
    """
    Process the callback from Google OAuth
    """
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code missing")

    logger.info(f"Processing callback with code: {code[:10]}...")

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_ENDPOINT,
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI,
            },
        )

    if token_response.status_code != 200:
        logger.error(f"Token exchange failed: {token_response.text}")
        raise HTTPException(
            status_code=400, detail=f"Token exchange failed: {token_response.text}"
        )

    token_data = token_response.json()
    access_token = token_data["access_token"]

    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            GOOGLE_USER_INFO_ENDPOINT,
            headers={"Authorization": f"Bearer {access_token}"},
        )

    if user_response.status_code != 200:
        logger.error(f"Failed to get user info: {user_response.text}")
        raise HTTPException(
            status_code=400, detail=f"Failed to get user info: {user_response.text}"
        )

    user_data = user_response.json()
    email = user_data["email"]
    name = user_data.get("name")
    picture = user_data.get("picture")

    # Check if user exists and has complete profile
    existing_user = get_user(collection, email)
    is_new_user = False
    needs_profile = False
    role = "student"  # Default role

    if not existing_user:
        # First time Google sign-in - create a new user
        hashed_password = get_password_hash("defaultpassword")
        collection.insert_one(
            {
                "username": email,
                "hashed_password": hashed_password,
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "role": "student",  # Default new users to student
            }
        )
        is_new_user = True
        needs_profile = True
    else:
        # Get the user's role
        role = existing_user.get("role", "student")

        # Only check for profile completeness if role is student
        if role == "student":
            needs_profile = not (
                existing_user.get("student_id")
                and existing_user.get("section")
                and existing_user.get("skill_level")
            )
        logger.info(f"Creating new user from Google auth: {email}")
        hashed_password = get_password_hash("defaultpassword")
        collection.insert_one(
            {
                "username": email,
                "hashed_password": hashed_password,
                "name": name,
                "picture": picture,
                "email": email,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "google_verified": True,
                "_id": ObjectId(),
            }
        )

    # Create JWT token with additional info
    jwt_token = create_access_token(
        data={
            "sub": email,
            "role": role,
            "is_new_user": is_new_user,
            "needs_profile": needs_profile,
        },
        expires_delta=timedelta(hours=2),
    )

    # Determine redirect URL based on role and profile completeness
    if role == "teacher":
        redirect_url = f"{FRONTEND_URL}/teacher/dashboard"
    else:
        redirect_url = (
            f"{FRONTEND_URL}/auth/profile"
            if needs_profile
            else f"{FRONTEND_URL}/dashboard"
        )

    data = {
        "message": "Login successful",
        "token": jwt_token,
        "role": role,
        "is_new_user": is_new_user,
        "needs_profile": needs_profile,
    }

    redirect = RedirectResponse(url="https://www.mari0nette.com/coding")

    redirect.set_cookie(
        key="access_token",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7200,
    )

    # Add the user role to headers
    redirect.headers["X-User-Role"] = role
    redirect.headers["X-Needs-Profile"] = str(needs_profile).lower()

    # Add the data to headers
    redirect.headers["X-Data"] = json.dumps(data)

    return redirect


async def logout(response: Response):
    """
    Log out a user by removing their access token cookie
    """
    response.delete_cookie(key="access_token")
    return {"message": "Successfully logged out"}
