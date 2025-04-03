from datetime import datetime
from fastapi import HTTPException
from typing import List, Dict, Any, Optional
from bson import ObjectId
from app.db.schemas import Assignment, AssignmentCreate, AssignmentUpdate, AssignmentSummary


async def create_assignment(db, assignment_data: AssignmentCreate, created_by: str) -> Dict:
    """
    Create a new assignment in the database
    """
    try:
        # Convert to dict and add created_by and timestamps
        assignment_dict = assignment_data.dict()
        assignment_dict["created_by"] = created_by
        assignment_dict["created_at"] = datetime.now()
        assignment_dict["updated_at"] = datetime.now()
        
        # Insert into MongoDB
        result = await db["assignments"].insert_one(assignment_dict)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to create assignment")
        
        # Return the created assignment with ID
        created_assignment = await db["assignments"].find_one({"_id": result.inserted_id})
        created_assignment["id"] = str(created_assignment["_id"])
        del created_assignment["_id"]
        
        return created_assignment
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


async def get_all_assignments(db, teacher_id: Optional[str] = None) -> List[Dict]:
    """
    Get all assignments, optionally filtered by teacher ID
    """
    try:
        query = {}
        if teacher_id:
            query["created_by"] = teacher_id
            
        cursor = db["assignments"].find(query).sort("created_at", -1)
        assignments = await cursor.to_list(length=100)
        
        # Process assignments for frontend display
        results = []
        for assignment in assignments:
            # Convert ObjectId to string
            assignment_id = str(assignment["_id"])
            del assignment["_id"]
            
            # Count pending submissions
            pending_count = await db["assignment_submissions"].count_documents({
                "assignment_id": assignment_id,
                "status": "pending"
            })
            
            # Create summary object
            summary = {
                "id": assignment_id,
                "title": assignment["title"],
                "chapter": assignment["chapter"],
                "dueDate": assignment["dueDate"],
                "points": assignment["points"],
                "pending": pending_count,
                "created_at": assignment["created_at"]
            }
            results.append(summary)
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


async def get_assignment_by_id(db, assignment_id: str) -> Dict:
    """
    Get a single assignment by ID
    """
    try:
        assignment = await db["assignments"].find_one({"_id": ObjectId(assignment_id)})
        
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Convert ObjectId to string
        assignment["id"] = str(assignment["_id"])
        del assignment["_id"]
        
        # Count pending submissions
        pending_count = await db["assignment_submissions"].count_documents({
            "assignment_id": assignment_id,
            "status": "pending"
        })
        
        # Add stats if not present
        if "stats" not in assignment or assignment["stats"] is None:
            assignment["stats"] = {
                "total_students": await db["users"].count_documents({"role": "student"}),
                "submissions": await db["assignment_submissions"].count_documents({"assignment_id": assignment_id}),
                "pending_review": pending_count,
                "average_score": 0  # Will calculate this if there are graded submissions
            }
            
            # Calculate average score if there are graded submissions
            if assignment["stats"]["submissions"] > 0:
                pipeline = [
                    {"$match": {"assignment_id": assignment_id, "status": "graded"}},
                    {"$group": {"_id": None, "avg_score": {"$avg": "$score"}}}
                ]
                result = await db["assignment_submissions"].aggregate(pipeline).to_list(length=1)
                if result:
                    assignment["stats"]["average_score"] = result[0]["avg_score"]
        
        return assignment
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


async def update_assignment(db, assignment_id: str, assignment_data: AssignmentUpdate) -> Dict:
    """
    Update an existing assignment
    """
    try:
        # Get non-None fields to update
        update_data = {k: v for k, v in assignment_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now()
        
        # Update in MongoDB
        result = await db["assignments"].update_one(
            {"_id": ObjectId(assignment_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Return the updated assignment
        updated_assignment = await get_assignment_by_id(db, assignment_id)
        return updated_assignment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


async def delete_assignment(db, assignment_id: str) -> Dict:
    """
    Delete an assignment
    """
    try:
        result = await db["assignments"].delete_one({"_id": ObjectId(assignment_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Delete related submissions
        await db["assignment_submissions"].delete_many({"assignment_id": assignment_id})
        
        return {"message": "Assignment deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 