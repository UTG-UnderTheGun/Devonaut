from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.db.database import collection
from typing import List, Dict, Optional
from bson import ObjectId

router = APIRouter()

@router.get("/students", 
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

        # Get all users with role "student" from MongoDB
        students = list(collection.find(
            {"role": "student"},
            {
                "hashed_password": 0,  # Exclude sensitive data
                "student_id": 1,
                "name": 1,
                "section": 1,
                "skill_level": 1,
                "email": 1,
                "_id": 1
            }
        ))

        # Format the data to match what the front-end expects
        formatted_students = []
        for student in students:
            # Convert ObjectId to string
            student["_id"] = str(student["_id"])
            
            # Map the fields from MongoDB to what the frontend expects
            formatted_students.append({
                "id": student.get("student_id", "N/A"),
                "name": student.get("name", "Unknown"),
                "section": student.get("section", "Unassigned"),
                "score": student.get("skill_level_score", 0),  # You might need to adjust this
                "email": student.get("email", "N/A")
            })

        return formatted_students

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch students: {str(e)}"
        ) 