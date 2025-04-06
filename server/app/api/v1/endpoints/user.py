from fastapi import APIRouter, Depends, HTTPException, Response, Request
from app.core.security import get_current_user
from app.db.database import collection
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from bson import ObjectId
from app.db.schemas import UserProfile
from app.services.user_service import update_user_profile
from app.services.assignment_service import get_assignments_for_student

router = APIRouter()

class UserResponse(BaseModel):
    username: str
    user_id: str
    name: Optional[str] = None
    student_id: Optional[str] = None
    section: Optional[str] = None
    skill_level: Optional[str] = None
    email: Optional[str] = None

class UserList(BaseModel):
    total_users: int
    users: List[Dict]

class PaginatedUserList(BaseModel):
    total_users: int
    users: List[Dict]
    page: int
    total_pages: int

class SkillLevel(BaseModel):
    skill_level: str

@router.get("/me", response_model=UserResponse, 
    summary="Get current user information",
    description="Returns the current authenticated user's information")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    user, user_id = current_user
    return {
        "username": user["username"],
        "user_id": str(user_id),
        "name": user.get("name", None),
        "student_id": user.get("student_id", None),
        "section": user.get("section", None),
        "skill_level": user.get("skill_level", None),
        "email": user.get("email", None)
    }

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

@router.post("/profile", 
    summary="Update user profile information",
    description="Updates the name, student ID, and section of the authenticated user")
async def update_profile(
    profile_data: UserProfile,
    current_user: dict = Depends(get_current_user)
):
    try:
        user, user_id = current_user
        
        # Update profile using the user service
        result = await update_user_profile(
            user_id=user_id,
            name=profile_data.name,
            student_id=profile_data.student_id,
            section=profile_data.section
        )

        return {
            "message": "Profile updated successfully",
            "name": profile_data.name,
            "student_id": profile_data.student_id,
            "section": profile_data.section
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update profile: {str(e)}"
        )

@router.post("/skill-level", 
    summary="Update user's skill level",
    description="Updates the skill level of the authenticated user")
async def update_skill_level(
    skill_data: SkillLevel,
    current_user: dict = Depends(get_current_user)
):
    try:
        user, user_id = current_user
        
        # Validate skill level
        valid_levels = ["beginner", "intermediate", "advanced"]
        if skill_data.skill_level.lower() not in valid_levels:
            raise HTTPException(
                status_code=400,
                detail="Invalid skill level. Must be one of: beginner, intermediate, advanced"
            )

        # Update user's skill level in database
        result = collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "skill_level": skill_data.skill_level.lower(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=404,
                detail="User not found or skill level not updated"
            )

        return {
            "message": "Skill level updated successfully",
            "skill_level": skill_data.skill_level
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update skill level: {str(e)}"
        )

@router.post("/logout",
    summary="Logout user",
    description="Logs out the current user by clearing their session cookie")
async def logout(response: Response):
    try:
        # Clear both session and access_token cookies
        response.delete_cookie(
            key="session",
            path="/",
            secure=True,
            httponly=True,
            samesite="lax"
        )
        response.delete_cookie(
            key="access_token",  # Add this to clear the access token
            path="/",
            secure=True,
            httponly=True,
            samesite="lax"
        )
        
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to logout: {str(e)}"
        )

@router.get("/students", response_model=UserList,
    summary="Get all students",
    description="Returns a list of all students for teacher dashboard")
async def get_all_students(current_user: dict = Depends(get_current_user)):
    try:
        user, user_id = current_user
        
        # Verify the user is a teacher
        if user.get("role") != "teacher":
            raise HTTPException(
                status_code=403,
                detail="Only teachers can access this endpoint"
            )

        # Get all users with role "student"
        users = list(collection.find(
            {"role": "student"},
            {
                "_id": 1,
                "username": 1,  # Include username as it might contain email
                "name": 1,
                "student_id": 1,
                "section": 1,
                "skill_level": 1,
                "email": 1       # Explicitly include email field
            }
        ))

        # Format the data for frontend
        formatted_users = []
        for user in users:
            formatted_users.append({
                "id": user.get("student_id", "N/A"),
                "name": user.get("name", "Unknown"),
                "section": user.get("section", "Unassigned"),
                "score": user.get("skill_level", 0),
                "email": user.get("email", user.get("username", "N/A"))  # Try both email and username
            })

        return {
            "total_users": len(formatted_users),
            "users": formatted_users
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch students: {str(e)}"
        )

@router.get("/dashboard",
    summary="Get user dashboard data",
    description="Returns the user's dashboard information including assigned tasks")
async def get_user_dashboard(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    try:
        user, user_id = current_user
        
        # Debug: Log user info
        print(f"Getting dashboard for user: {user.get('username')} (ID: {user_id})")
        print(f"User section: {user.get('section')}")
        print(f"User role: {user.get('role')}")
        
        # Get assignments for this student
        assignments = await get_assignments_for_student(
            db=request.app.mongodb,  # Use the MongoDB instance from the request
            student_id=user_id,
            student_section=user.get("section")
        )
        
        # Format the data for the dashboard
        formatted_assignments = []
        for assignment in assignments:
            try:
                # Calculate progress based on submission status
                progress = 0  # Default to 0
                
                # Format the date properly - handle both string and datetime objects
                due_date = assignment["dueDate"]
                if isinstance(due_date, str):
                    try:
                        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                    except ValueError:
                        try:
                            due_date = datetime.strptime(due_date, "%Y-%m-%dT%H:%M:%S")
                        except ValueError:
                            print(f"Failed to parse date: {due_date}, using default")
                            due_date = datetime.now() + timedelta(days=7)
                
                # Check submission status
                submission = await request.app.mongodb["assignment_submissions"].find_one({
                    "assignment_id": assignment["id"],
                    "user_id": user_id
                })
                
                # Determine status based on submission and due date
                status = "UPCOMING"
                if submission:
                    if submission["status"] == "graded":
                        status = "COMPLETED"
                        progress = 100
                    else:
                        status = "SUBMITTED"
                        progress = 50
                elif due_date < datetime.now():
                    status = "OVERDUE"
                
                formatted_assignments.append({
                    "id": assignment["id"],
                    "title": assignment["title"],
                    "chapter": assignment["chapter"],
                    "link": f"/coding?assignment={assignment['id']}",
                    "dueDate": due_date.strftime("%Y-%m-%d"),
                    "dueTime": due_date.strftime("%H:%M"),
                    "totalPoints": assignment["points"],
                    "progress": progress,
                    "status": status,
                    "problems": [
                        {
                            "id": ex["id"],
                            "completed": bool(submission),
                            "type": ex["type"]
                        } for ex in assignment["exercises"]
                    ]
                })
            except Exception as ex:
                print(f"Error formatting assignment {assignment.get('id', 'unknown')}: {str(ex)}")
                continue
        
        # Debug: Log number of formatted assignments
        print(f"Returning {len(formatted_assignments)} formatted assignments")
        
        # Calculate performance data based on submissions
        total_score = 0
        total_possible = 0
        chapter_performances = {}
        
        # Get all graded submissions for this student
        submissions_cursor = request.app.mongodb["assignment_submissions"].find({
            "user_id": user_id,
            "status": "graded"
        })
        submissions = await submissions_cursor.to_list(length=100)
        
        # Calculate scores by chapter
        for submission in submissions:
            assignment = next((a for a in assignments if a["id"] == submission["assignment_id"]), None)
            if assignment:
                chapter = assignment.get("chapter", "Uncategorized")
                if chapter not in chapter_performances:
                    chapter_performances[chapter] = {
                        "id": chapter,
                        "title": chapter,
                        "score": 0,
                        "total": 0,
                        "completed": False
                    }
                
                chapter_performances[chapter]["score"] += submission.get("score", 0)
                chapter_performances[chapter]["total"] += assignment.get("points", 0)
                chapter_performances[chapter]["completed"] = True
                
                total_score += submission.get("score", 0)
                total_possible += assignment.get("points", 0)
        
        # Add chapters without submissions
        for assignment in assignments:
            chapter = assignment.get("chapter", "Uncategorized")
            if chapter not in chapter_performances:
                chapter_performances[chapter] = {
                    "id": chapter,
                    "title": chapter,
                    "score": 0,
                    "total": assignment.get("points", 0),
                    "completed": False
                }
            elif not chapter_performances[chapter]["completed"]:
                chapter_performances[chapter]["total"] += assignment.get("points", 0)
        
        return {
            "user": {
                "username": user["username"],
                "user_id": str(user_id),
                "name": user.get("name", None),
                "student_id": user.get("student_id", None),
                "section": user.get("section", None),
                "skill_level": user.get("skill_level", None),
            },
            "chapters": formatted_assignments,
            "performance": {
                "totalScore": total_score,
                "totalPossible": total_possible,
                "chapters": list(chapter_performances.values())
            }
        }

    except Exception as e:
        print(f"Dashboard error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch dashboard data: {str(e)}"
        )
