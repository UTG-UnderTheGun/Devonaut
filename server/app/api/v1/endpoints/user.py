from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.db.database import collection
from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()

class UserResponse(BaseModel):
    username: str
    user_id: str

class UserList(BaseModel):
    total_users: int
    users: List[Dict]

class PaginatedUserList(BaseModel):
    total_users: int
    users: List[Dict]
    page: int
    total_pages: int

@router.get("/me", response_model=UserResponse, 
    summary="Get current user information",
    description="Returns the current authenticated user's information")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    user, user_id = current_user
    return {"username": user["username"], "user_id": str(user_id)}

@router.get("/all", response_model=UserList,
    summary="Get all users",
    description="Returns a list of all registered users in the system")
async def get_all_users():
    try:
        # Get all users from MongoDB - Fixed projection
        users = list(collection.find(
            {},  # Empty filter to get all documents
            {
                "hashed_password": 0  # Only exclude hashed_password
            }
        ))

        # Convert ObjectId to string for JSON serialization
        for user in users:
            user["_id"] = str(user["_id"])
            
            # Convert datetime objects to ISO format strings if they exist
            if "created_at" in user:
                user["created_at"] = user["created_at"].isoformat()
            if "updated_at" in user:
                user["updated_at"] = user["updated_at"].isoformat()

        return {
            "total_users": len(users),
            "users": users
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch users: {str(e)}"
        )

@router.get("/paginated", response_model=PaginatedUserList,
    summary="Get paginated users list",
    description="Returns a paginated list of users with specified skip and limit parameters")
async def get_users_paginated(
    skip: int = 0, 
    limit: int = 10
):
    try:
        # Get total count
        total_users = collection.count_documents({})

        # Get paginated users - Fixed projection
        users = list(collection.find(
            {},
            {
                "hashed_password": 0  # Only exclude hashed_password
            }
        ).skip(skip).limit(limit))

        # Convert ObjectId to string for JSON serialization
        for user in users:
            user["_id"] = str(user["_id"])
            
            # Convert datetime objects to ISO format strings if they exist
            if "created_at" in user:
                user["created_at"] = user["created_at"].isoformat()
            if "updated_at" in user:
                user["updated_at"] = user["updated_at"].isoformat()

        return {
            "total_users": total_users,
            "users": users,
            "page": skip // limit + 1,
            "total_pages": (total_users + limit - 1) // limit
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch users: {str(e)}"
        )
