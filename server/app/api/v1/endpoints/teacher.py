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
                "_id": 1,
                "username": 1
            }
        ))

        # Format the data to match what the front-end expects
        formatted_students = []
        for student in students:
            # Convert ObjectId to string
            student_id = str(student["_id"])
            
            # Map the fields from MongoDB to what the frontend expects
            formatted_students.append({
                "id": student_id,  # Use the actual MongoDB _id
                "student_id": student.get("student_id", "N/A"),
                "name": student.get("name", student.get("username", "Unknown")),
                "section": student.get("section", "Unassigned"),
                "score": student.get("skill_level_score", 0), 
                "email": student.get("email", student.get("username", "N/A"))
            })

        return formatted_students

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch students: {str(e)}"
        )

@router.get("/sections", 
    summary="Get all available sections",
    description="Returns a list of all available sections from students")
async def get_all_sections(current_user: dict = Depends(get_current_user)):
    try:
        user, user_id = current_user
        
        # Verify the user is a teacher
        if user.get("role") != "teacher":
            raise HTTPException(
                status_code=403,
                detail="Only teachers can access this endpoint"
            )

        # Simple approach: Use distinct to get unique section values
        sections = collection.distinct("section", {"role": "student"})
        
        # Format the data for frontend - filter out None and empty strings
        formatted_sections = []
        for section_name in sections:
            if section_name and isinstance(section_name, str) and section_name.strip():
                formatted_sections.append({
                    "id": section_name,
                    "name": section_name
                })
        
        return formatted_sections

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch sections: {str(e)}"
        ) 