from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any
from app.db.schemas import Assignment, AssignmentCreate, AssignmentUpdate, AssignmentSummary, SubmissionGrading, Comment, AssignmentSubmission
from app.core.security import get_current_user
from app.services.assignment_service import (
    create_assignment,
    get_all_assignments,
    get_assignment_by_id,
    update_assignment,
    delete_assignment,
    get_assignments_for_student,
    submit_assignment
)
from datetime import datetime
from bson.objectid import ObjectId

router = APIRouter()

@router.post("/", response_model=Assignment)
async def create_new_assignment(
    request: Request,
    assignment: AssignmentCreate,
    current_user=Depends(get_current_user)
):
    """
    Create a new assignment (teachers only)
    """
    user, user_id = current_user
    
    # Check if user is a teacher
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")
    
    return await create_assignment(request.app.mongodb, assignment, user_id)


@router.get("/", response_model=List[AssignmentSummary])
async def list_assignments(
    request: Request,
    current_user=Depends(get_current_user)
):
    """
    List all assignments
    For teachers: shows their created assignments
    For students: shows assignments assigned to them
    """
    user, user_id = current_user
    
    try:
        if user.get("role") == "teacher":
            # Teachers see their created assignments
            return await get_all_assignments(request.app.mongodb, user_id)
        else:
            # Students see assignments assigned to them
            assignments = await get_assignments_for_student(
                db=request.app.mongodb,
                student_id=user_id,
                student_section=user.get("section")
            )
            
            # Format assignments as summaries
            summaries = []
            for assignment in assignments:
                # Count pending submissions for this assignment
                pending_count = await request.app.mongodb["assignment_submissions"].count_documents({
                    "assignment_id": assignment["id"],
                    "status": "pending"
                })
                
                summary = {
                    "id": assignment["id"],
                    "title": assignment["title"],
                    "chapter": assignment["chapter"],
                    "dueDate": assignment["dueDate"],
                    "points": assignment["points"],
                    "pending": pending_count,
                    "created_at": assignment.get("created_at", datetime.now())
                }
                summaries.append(summary)
            
            return summaries
            
    except Exception as e:
        print(f"Error listing assignments: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list assignments: {str(e)}"
        )


@router.get("/{assignment_id}", response_model=Assignment)
async def get_assignment(
    request: Request,
    assignment_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get a specific assignment by ID
    """
    return await get_assignment_by_id(request.app.mongodb, assignment_id)


@router.put("/{assignment_id}", response_model=Assignment)
async def update_existing_assignment(
    request: Request,
    assignment_id: str,
    assignment_data: AssignmentUpdate,
    current_user=Depends(get_current_user)
):
    """
    Update an existing assignment (teachers only)
    """
    user, user_id = current_user
    
    # Check if user is a teacher
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update assignments")
    
    # Check if teacher owns this assignment
    assignment = await get_assignment_by_id(request.app.mongodb, assignment_id)
    if assignment["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="You can only update your own assignments")
    
    return await update_assignment(request.app.mongodb, assignment_id, assignment_data)


@router.delete("/{assignment_id}")
async def delete_existing_assignment(
    request: Request,
    assignment_id: str,
    current_user=Depends(get_current_user)
):
    """
    Delete an assignment (teachers only)
    """
    user, user_id = current_user
    
    # Check if user is a teacher
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete assignments")
    
    # Check if teacher owns this assignment
    assignment = await get_assignment_by_id(request.app.mongodb, assignment_id)
    if assignment["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own assignments")
    
    return await delete_assignment(request.app.mongodb, assignment_id)


@router.post("/{assignment_id}/submit")
async def submit_assignment_solution(
    request: Request,
    assignment_id: str,
    submission_data: dict,
    current_user=Depends(get_current_user)
):
    """
    Submit an assignment solution for grading.
    Students use this endpoint to submit their completed assignments.
    """
    try:
        user, user_id = current_user
        
        # Make sure the user is a student
        if user.get("role") == "teacher":
            raise HTTPException(status_code=403, detail="Teachers cannot submit assignments")
        
        # Process the submission
        result = await submit_assignment(
            db=request.app.mongodb,
            assignment_id=assignment_id,
            user_id=user_id,
            username=user.get("username", "unknown"),
            submission_data=submission_data
        )
        
        return result
    except Exception as e:
        print(f"Error in submit_assignment_solution: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit assignment: {str(e)}"
        )


@router.get("/{assignment_id}/submissions")
async def get_assignment_submissions(
    request: Request,
    assignment_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get all submissions for a specific assignment (teachers only)
    """
    try:
        user, user_id = current_user
        
        # Check if user is a teacher
        if user.get("role") != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can view all submissions")
        
        # Check if teacher owns this assignment
        assignment = await get_assignment_by_id(request.app.mongodb, assignment_id)
        if assignment["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="You can only view submissions for your own assignments")
        
        # Get all submissions
        cursor = request.app.mongodb["assignment_submissions"].find({"assignment_id": assignment_id})
        submissions = await cursor.to_list(length=100)
        
        # Convert ObjectId to string
        for submission in submissions:
            if "_id" in submission:
                submission["_id"] = str(submission["_id"])
        
        return submissions
    except Exception as e:
        print(f"Error getting submissions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get submissions: {str(e)}"
        )


@router.get("/{assignment_id}/submission/{student_id}")
async def get_student_submission(
    request: Request,
    assignment_id: str,
    student_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get a specific student's submission for an assignment
    Teachers can view any submission, students can only view their own
    """
    try:
        user, user_id = current_user
        
        # If student, check if they are viewing their own submission
        if user.get("role") != "teacher" and user_id != student_id:
            raise HTTPException(status_code=403, detail="You can only view your own submissions")
        
        # Get the submission
        submission = await request.app.mongodb["assignment_submissions"].find_one({
            "assignment_id": assignment_id,
            "user_id": student_id
        })
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Convert ObjectId to string
        if "_id" in submission:
            submission["_id"] = str(submission["_id"])
        
        return submission
    except Exception as e:
        print(f"Error getting student submission: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get submission: {str(e)}"
        )


@router.post("/{assignment_id}/grade/{submission_id}")
async def grade_submission(
    request: Request,
    assignment_id: str,
    submission_id: str,
    grading_data: SubmissionGrading,
    current_user=Depends(get_current_user)
):
    """
    Grade a student's submission (teachers only)
    """
    try:
        user, user_id = current_user
        
        # Check if user is a teacher
        if user.get("role") != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can grade submissions")
        
        # Check if teacher owns this assignment
        assignment = await get_assignment_by_id(request.app.mongodb, assignment_id)
        if assignment["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="You can only grade submissions for your own assignments")
        
        # Find the submission
        submission = await request.app.mongodb["assignment_submissions"].find_one({
            "id": submission_id,
            "assignment_id": assignment_id
        })
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # Update the submission with grade and feedback
        update_data = {
            "score": grading_data.score,
            "status": "graded",
            "graded_at": datetime.now(),
            "feedback": grading_data.feedback
        }
        
        # Add comments if provided
        if grading_data.comments:
            # Process each comment
            comments = []
            for comment_data in grading_data.comments:
                comment = {
                    "id": str(datetime.now().timestamp()),
                    "user_id": user_id,
                    "username": user.get("username", "Unknown User"),
                    "role": user.get("role", "teacher"),
                    "text": comment_data.get("text", ""),
                    "timestamp": datetime.now()
                }
                comments.append(comment)
            
            update_data["comments"] = comments
        
        # Update in database
        result = await request.app.mongodb["assignment_submissions"].update_one(
            {"id": submission_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to update submission")
        
        # Update assignment stats
        await request.app.mongodb["assignments"].update_one(
            {"_id": ObjectId(assignment_id)},
            {
                "$inc": {"stats.pending_review": -1},
                "$set": {"updated_at": datetime.now()}
            }
        )
        
        # Recalculate average score
        pipeline = [
            {"$match": {"assignment_id": assignment_id, "status": "graded"}},
            {"$group": {"_id": None, "avg_score": {"$avg": "$score"}}}
        ]
        avg_result = await request.app.mongodb["assignment_submissions"].aggregate(pipeline).to_list(length=1)
        
        if avg_result:
            await request.app.mongodb["assignments"].update_one(
                {"_id": ObjectId(assignment_id)},
                {"$set": {"stats.average_score": avg_result[0]["avg_score"]}}
            )
        
        return {
            "success": True,
            "message": "Submission graded successfully"
        }
    except Exception as e:
        print(f"Error grading submission: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to grade submission: {str(e)}"
        )


@router.post("/{assignment_id}/comment/{submission_id}")
async def add_comment(
    request: Request,
    assignment_id: str,
    submission_id: str,
    comment_data: Comment,
    current_user=Depends(get_current_user)
):
    """
    Add a comment to a submission
    Teachers can comment on any submission, students can only comment on their own
    """
    try:
        user, user_id = current_user
        
        # Find the submission
        submission = await request.app.mongodb["assignment_submissions"].find_one({
            "id": submission_id,
            "assignment_id": assignment_id
        })
        
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        
        # If student, check if they are commenting on their own submission
        if user.get("role") != "teacher" and submission["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only comment on your own submissions")
        
        # Create comment object
        comment = {
            "id": str(datetime.now().timestamp()),
            "user_id": user_id,
            "username": user.get("username", "Unknown User"),
            "role": user.get("role", "student"),
            "text": comment_data.text,
            "timestamp": datetime.now()
        }
        
        # Add to exercise comments if specified
        if comment_data.exercise_id is not None:
            # Structure: feedback.exercise_id.comments = [array of comments]
            exercise_id = str(comment_data.exercise_id)
            update_path = f"feedback.{exercise_id}.comments"
            
            # Initialize the exercise feedback if it doesn't exist
            await request.app.mongodb["assignment_submissions"].update_one(
                {"id": submission_id},
                {"$set": {f"feedback.{exercise_id}": {"comments": []}}}
            )
            
            # Add the comment
            result = await request.app.mongodb["assignment_submissions"].update_one(
                {"id": submission_id},
                {"$push": {update_path: comment}}
            )
        else:
            # Add to general comments
            result = await request.app.mongodb["assignment_submissions"].update_one(
                {"id": submission_id},
                {"$push": {"comments": comment}}
            )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="Failed to add comment")
        
        return {
            "success": True,
            "message": "Comment added successfully",
            "comment": comment
        }
    except Exception as e:
        print(f"Error adding comment: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add comment: {str(e)}"
        )


@router.get("/pending-submissions")
async def get_pending_submissions(
    request: Request,
    current_user=Depends(get_current_user)
):
    """
    Get all pending submissions for assignments created by this teacher
    """
    try:
        user, user_id = current_user
        
        # Check if user is a teacher
        if user.get("role") != "teacher":
            raise HTTPException(status_code=403, detail="Only teachers can view pending submissions")
        
        # First get all assignments created by this teacher
        assignments = await get_all_assignments(request.app.mongodb, user_id)
        
        # Extract assignment IDs
        assignment_ids = [assignment["id"] for assignment in assignments]
        
        if not assignment_ids:
            return []
        
        # Get all pending submissions for these assignments
        cursor = request.app.mongodb["assignment_submissions"].find({
            "assignment_id": {"$in": assignment_ids},
            "status": "pending"
        }).sort("submitted_at", -1)
        
        submissions = await cursor.to_list(length=100)
        
        # Convert ObjectId to string
        for submission in submissions:
            if "_id" in submission:
                submission["_id"] = str(submission["_id"])
        
        # Enhance submissions with assignment details
        assignment_map = {assignment["id"]: assignment for assignment in assignments}
        
        enhanced_submissions = []
        for submission in submissions:
            assignment_id = submission["assignment_id"]
            if assignment_id in assignment_map:
                submission["assignment_title"] = assignment_map[assignment_id]["title"]
                submission["assignment_chapter"] = assignment_map[assignment_id]["chapter"]
                submission["assignment_points"] = assignment_map[assignment_id]["points"]
                enhanced_submissions.append(submission)
        
        return enhanced_submissions
    except Exception as e:
        print(f"Error getting pending submissions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get pending submissions: {str(e)}"
        )


@router.get("/{assignment_id}/feedback")
async def get_assignment_feedback(
    request: Request,
    assignment_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get feedback for a specific assignment for the current student
    """
    try:
        user, user_id = current_user
        
        # Get the submission for this student
        submission = await request.app.mongodb["assignment_submissions"].find_one({
            "assignment_id": assignment_id,
            "user_id": user_id
        })
        
        if not submission:
            return {
                "submitted": False,
                "message": "You haven't submitted this assignment yet"
            }
        
        # Get assignment details
        assignment = await get_assignment_by_id(request.app.mongodb, assignment_id)
        
        # Format the response
        feedback_response = {
            "submitted": True,
            "assignment_id": assignment_id,
            "assignment_title": assignment["title"],
            "status": submission["status"],
            "submitted_at": submission["submitted_at"],
            "score": submission.get("score"),
            "feedback": submission.get("feedback", {}),
            "comments": submission.get("comments", [])
        }
        
        # Add graded info if available
        if submission["status"] == "graded":
            feedback_response["graded_at"] = submission["graded_at"]
        
        return feedback_response
    except Exception as e:
        print(f"Error getting feedback: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get feedback: {str(e)}"
        ) 