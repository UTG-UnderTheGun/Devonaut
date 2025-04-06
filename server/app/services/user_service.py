from app.db.database import collection
from bson import ObjectId
from datetime import datetime
from fastapi import HTTPException


async def update_user_profile(user_id: str, name: str, student_id: str, section: str):
    """
    Update user profile information in the database
    """
    try:
        # Validate input data if needed
        if not name or not student_id or not section:
            raise ValueError("All fields are required")
        
        # Update user document
        result = collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "name": name,
                    "student_id": student_id,
                    "section": section,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            # Document might exist but no changes were made
            if collection.count_documents({"_id": ObjectId(user_id)}) == 0:
                raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Profile updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


async def get_user_by_id(user_id: str):
    """
    Get user by ID from the database
    """
    try:
        user = collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert ObjectId to string
        user["_id"] = str(user["_id"])
        
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")
