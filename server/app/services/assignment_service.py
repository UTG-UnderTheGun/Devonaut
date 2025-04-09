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
        
        # Debug: Log the assignment type and targeting
        print(f"Assignment type: {assignment_dict.get('assignmentType', 'Not specified')}")
        
        # Handle assignment targeting
        assignment_type = assignment_dict.get("assignmentType", "all")
        print(f"Processing assignment type: {assignment_type}")
        
        if assignment_type == "all":
            # Assignment for all students
            assignment_dict["target"] = "all"
            print("Setting target to ALL students")
            if "selectedStudents" in assignment_dict:
                del assignment_dict["selectedStudents"]
            if "selectedSections" in assignment_dict:
                del assignment_dict["selectedSections"]
        elif assignment_type == "section":
            # Assignment for specific sections
            assignment_dict["target"] = "section"
            assignment_dict["targetSections"] = assignment_dict.get("selectedSections", [])
            print(f"Setting target to SECTIONS: {assignment_dict['targetSections']}")
            if "selectedStudents" in assignment_dict:
                del assignment_dict["selectedStudents"]
        elif assignment_type == "specific":
            # Assignment for specific students
            assignment_dict["target"] = "specific"
            assignment_dict["targetStudents"] = assignment_dict.get("selectedStudents", [])
            print(f"Setting target to STUDENTS: {assignment_dict['targetStudents']}")
            if "selectedSections" in assignment_dict:
                del assignment_dict["selectedSections"]
                
        # Remove the original assignment type field
        if "assignmentType" in assignment_dict:
            del assignment_dict["assignmentType"]
        
        # Debug: Log the final assignment structure
        print(f"Final assignment structure keys: {list(assignment_dict.keys())}")
        
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
        print(f"Error creating assignment: {str(e)}")
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
    Get a single assignment by ID with all necessary data for the coding interface
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
        
        # Ensure exercises have all required fields for the coding interface
        if "exercises" in assignment:
            for exercise in assignment["exercises"]:
                # Ensure each exercise has required fields
                exercise["id"] = exercise.get("id", 1)
                exercise["type"] = exercise.get("type", "code")
                exercise["title"] = exercise.get("title", "Exercise")
                exercise["description"] = exercise.get("description", "")
                exercise["points"] = exercise.get("points", 0)
                exercise["starter_code"] = exercise.get("starter_code", "")
                exercise["test_cases"] = exercise.get("test_cases", "")
                
                # For explain and fill exercises
                if exercise["type"] in ["explain", "fill"]:
                    exercise["code"] = exercise.get("code", "")
                
                # For fill exercises
                if exercise["type"] == "fill":
                    exercise["blanks"] = exercise.get("blanks", [])
        
        return assignment
    except Exception as e:
        print(f"Error getting assignment: {str(e)}")
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


async def get_assignments_for_student(db, student_id: str, student_section: Optional[str] = None) -> List[Dict]:
    """
    Get all assignments for a specific student based on targeting rules
    """
    try:
        # Build query for assignments applicable to this student
        query = {
            "$or": [
                {"target": "all"},  # Assignments for all students
                {"target": "specific", "targetStudents": student_id}  # Student-specific assignments
            ]
        }
        
        # Add section-targeted assignments if student has a section
        if student_section:
            query["$or"].append({
                "target": "section",
                "targetSections": student_section
            })
        
        # Debug: Log the query
        print(f"Assignment query for student {student_id}: {query}")
            
        # Get assignments sorted by due date
        cursor = db["assignments"].find(query).sort("dueDate", 1)
        assignments = await cursor.to_list(length=100)
        
        # Debug: Log the number of assignments found
        print(f"Found {len(assignments)} assignments for student {student_id}")
        
        # Process assignments for frontend display
        results = []
        for assignment in assignments:
            try:
                # Convert ObjectId to string
                assignment_id = str(assignment["_id"])
                del assignment["_id"]
                assignment["id"] = assignment_id
                
                # Check if student has submitted this assignment
                submission = await db["assignment_submissions"].find_one({
                    "assignment_id": assignment_id,
                    "user_id": student_id
                })
                
                # Add submission status to assignment
                assignment["submitted"] = bool(submission)
                if submission:
                    assignment["submission_status"] = submission["status"]
                    assignment["submission_date"] = submission["submitted_at"]
                    if submission["status"] == "graded":
                        assignment["score"] = submission["score"]
                
                # Add to results
                results.append(assignment)
            except Exception as e:
                print(f"Error processing assignment {assignment.get('_id', 'unknown')}: {str(e)}")
                continue
            
        return results
    except Exception as e:
        print(f"Error getting assignments for student: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


async def submit_assignment(db, assignment_id: str, user_id: str, username: str, submission_data: Dict) -> Dict:
    """
    Submit an assignment for grading
    """
    try:
        # Check if assignment exists
        assignment = await db["assignments"].find_one({"_id": ObjectId(assignment_id)})
        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Check if student has already submitted this assignment
        existing_submission = await db["assignment_submissions"].find_one({
            "assignment_id": assignment_id,
            "user_id": user_id
        })
        
        # If already submitted, we could either update or reject
        if existing_submission:
            # Option 1: Reject if already submitted
            # raise HTTPException(status_code=400, detail="You have already submitted this assignment")
            
            # Option 2: Update existing submission (chosen approach)
            submission_id = existing_submission["id"]
            
            # Update the submission
            update_data = {
                "answers": submission_data.get("answers", {}),
                "code": submission_data.get("code", ""),
                "output": submission_data.get("output", ""),
                "error": submission_data.get("error", ""),
                "status": "pending",  # Reset to pending when resubmitted
                "submitted_at": datetime.now()
            }
            
            await db["assignment_submissions"].update_one(
                {"id": submission_id},
                {"$set": update_data}
            )
            
            return {
                "success": True,
                "message": "Assignment resubmitted successfully",
                "id": submission_id,
                "status": "COMPLETED"
            }
        
        # Create new submission
        submission = {
            "id": str(datetime.now().timestamp()),
            "assignment_id": assignment_id,
            "user_id": user_id,
            "username": username,
            "answers": submission_data.get("answers", {}),
            "code": submission_data.get("code", ""),
            "output": submission_data.get("output", ""),
            "error": submission_data.get("error", ""),
            "score": None,
            "status": "pending",
            "submitted_at": datetime.now(),
            "graded_at": None,
            "feedback": None,
            "comments": []
        }
        
        # Insert the submission
        result = await db["assignment_submissions"].insert_one(submission)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to save submission")
        
        # Update assignment stats
        await db["assignments"].update_one(
            {"_id": ObjectId(assignment_id)},
            {"$inc": {"stats.submissions": 1, "stats.pending_review": 1}}
        )
        
        # Save to code history as well for tracking
        await db["code_history"].insert_one({
            "user_id": user_id,
            "username": username,
            "code": submission_data.get("code", ""),
            "output": submission_data.get("output", ""),
            "error": submission_data.get("error", ""),
            "is_submission": True,
            "action_type": "submission",
            "assignment_id": assignment_id,
            "created_at": datetime.now()
        })
        
        return {
            "success": True,
            "message": "Assignment submitted successfully",
            "id": submission["id"],
            "status": "COMPLETED"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting assignment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to submit assignment: {str(e)}") 