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
from fastapi.responses import JSONResponse

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


@router.get("/{assignment_id}", response_model=None)
async def get_assignment(
    request: Request,
    assignment_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get a specific assignment by ID
    """
    try:
        print(f"Fetching assignment with ID: {assignment_id}")
        assignment = await get_assignment_by_id(request.app.mongodb, assignment_id)
        
        # Add user-specific data if student
        user, user_id = current_user
        if user.get("role") != "teacher":
            # Get student's submission if exists
            submission = await request.app.mongodb["assignment_submissions"].find_one({
                "assignment_id": assignment_id,
                "user_id": user_id
            })
            if submission:
                assignment["user_submission"] = {
                    "status": submission["status"],
                    "submitted_at": submission["submitted_at"],
                    "score": submission.get("score"),
                    "feedback": submission.get("feedback")
                }
        
        return assignment
    except HTTPException as e:
        # Re-raise HTTP exceptions
        print(f"HTTP Exception in get_assignment: {e.detail}")
        raise
    except Exception as e:
        error_msg = f"Failed to get assignment: {str(e)}"
        print(f"Error getting assignment: {error_msg}")
        print(f"Assignment ID: {assignment_id}, User: {current_user[0].get('username', 'unknown')}")
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )


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
        
        # Process the answers to ensure proper formatting for coding exercises
        if "answers" in submission_data:
            answers = submission_data["answers"]
            processed_answers = {}
            
            # Process each answer entry
            for exercise_id, answer in answers.items():
                # Handle coding exercises specifically
                if isinstance(answer, str) and len(answer) > 0:
                    # This is likely a coding answer (string of code)
                    processed_answers[exercise_id] = answer
                elif isinstance(answer, dict):
                    # This could be a fill-in-the-blank or other structured answer
                    processed_answers[exercise_id] = answer
                else:
                    # Handle other answer types
                    processed_answers[exercise_id] = answer
            
            # Replace the original answers with processed ones
            submission_data["answers"] = processed_answers
            
            print(f"Processed answers for submission: {processed_answers}")
        
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
        
        print(f"Looking for submission with assignment_id={assignment_id}, student_id={student_id}")
        
        # Try to find submission by user_id
        query = {
            "assignment_id": assignment_id,
            "user_id": student_id
        }
        
        # Get the submission
        submission = await request.app.mongodb["assignment_submissions"].find_one(query)
        
        if not submission:
            print(f"No submission found with query: {query}")
            # Try alternative query with student_id in different field
            alt_query = {
                "assignment_id": assignment_id,
                "student_id": student_id  # Some might store student_id directly
            }
            print(f"Trying alternative query: {alt_query}")
            submission = await request.app.mongodb["assignment_submissions"].find_one(alt_query)
            
            if not submission:
                return JSONResponse(
                    status_code=404,
                    content={"detail": "Submission not found"}
                )
        
        # Ensure submission has an ID field for the frontend
        if submission:
            # Convert ObjectId to string
            if "_id" in submission:
                submission["_id"] = str(submission["_id"])
                
                # Make sure submission has an ID field
                if "id" not in submission:
                    submission["id"] = submission["_id"]  # Use _id as id if missing
            
            print(f"Found submission: ID={submission.get('id')}, _id={submission.get('_id')}")
        
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
        
        # Log debugging info
        print(f"Grading submission with ID: {submission_id}, assignment: {assignment_id}")
        
        # Try multiple ways to find the submission
        submission = None
        
        # First try with id field
        submission = await request.app.mongodb["assignment_submissions"].find_one({
            "id": submission_id,
            "assignment_id": assignment_id
        })
        
        # If not found, try with _id field (could be string or ObjectId)
        if not submission:
            try:
                from bson.objectid import ObjectId
                # Try with _id as ObjectId
                if ObjectId.is_valid(submission_id):
                    submission = await request.app.mongodb["assignment_submissions"].find_one({
                        "_id": ObjectId(submission_id),
                        "assignment_id": assignment_id
                    })
            except Exception as e:
                print(f"Error converting to ObjectId: {str(e)}")
        
        # Last resort: try direct string match on _id
        if not submission:
            submission = await request.app.mongodb["assignment_submissions"].find_one({
                "_id": submission_id,
                "assignment_id": assignment_id
            })
            
        # If still not found, try without assignment_id constraint
        if not submission:
            any_submission = await request.app.mongodb["assignment_submissions"].find_one({
                "$or": [
                    {"id": submission_id},
                    {"_id": submission_id}
                ]
            })
            if any_submission:
                print(f"Found submission with ID but wrong assignment_id: {any_submission.get('assignment_id', 'unknown')}")
                # Use this submission anyway if it's the only one we found
                submission = any_submission
            else:
                print(f"No submission found with ID: {submission_id} in any assignment")
                raise HTTPException(status_code=404, detail=f"Submission not found with ID: {submission_id}")
        
        print(f"Found submission: {submission}")
        
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
            
            # If comments already exist, append to them
            if "comments" in submission and isinstance(submission["comments"], list):
                update_data["comments"] = submission["comments"] + comments
            else:
                update_data["comments"] = comments
        
        # Determine the right ID field to use for the update
        from bson.objectid import ObjectId
        
        filter_query = {}
        if "_id" in submission:
            if isinstance(submission["_id"], ObjectId):
                filter_query = {"_id": submission["_id"]}
            else:
                # Try to convert to ObjectId if it's a string
                try:
                    if ObjectId.is_valid(submission["_id"]):
                        filter_query = {"_id": ObjectId(submission["_id"])}
                    else:
                        filter_query = {"_id": submission["_id"]}
                except:
                    filter_query = {"_id": submission["_id"]}
        elif "id" in submission:
            filter_query = {"id": submission["id"]}
        else:
            # Last resort, try both
            filter_query = {"$or": [{"_id": submission_id}, {"id": submission_id}]}
        
        print(f"Update filter query: {filter_query}")
        
        # Update in database
        result = await request.app.mongodb["assignment_submissions"].update_one(
            filter_query,
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            print(f"Failed to update submission. Match count: {result.matched_count}, Modified count: {result.modified_count}")
            
            # Try one more time with a broader query
            if result.matched_count == 0:
                print("Trying broader query as last resort")
                result = await request.app.mongodb["assignment_submissions"].update_one(
                    {"$or": [
                        {"_id": submission_id},
                        {"id": submission_id},
                        {"_id": ObjectId(submission_id) if ObjectId.is_valid(submission_id) else None}
                    ]},
                    {"$set": update_data}
                )
                
            if result.modified_count == 0:
                raise HTTPException(status_code=500, detail="Failed to update submission")
        
        # Update assignment stats
        try:
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
        except Exception as statsErr:
            # Don't fail the whole operation if stats update fails
            print(f"Warning: Failed to update assignment stats: {str(statsErr)}")
        
        return {
            "success": True,
            "message": "Submission graded successfully"
        }
    except HTTPException:
        raise
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


@router.get("/student/{student_id}/stats")
async def get_student_stats(
    request: Request,
    student_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get statistics for a specific student including completed, pending assignments and total score
    """
    try:
        user, user_id = current_user
        
        # Verify the user is a teacher
        if user.get("role") != "teacher":
            raise HTTPException(
                status_code=403,
                detail="Only teachers can access this endpoint"
            )

        # Get all assignments for the student
        student = await request.app.mongodb["users"].find_one({"student_id": student_id})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Get all submissions for this student
        submissions = await request.app.mongodb["assignment_submissions"].find({
            "user_id": str(student["_id"])
        }).to_list(length=100)

        # Calculate statistics
        completed = 0
        pending = 0
        total_score = 0

        for submission in submissions:
            if submission["status"] == "graded":
                completed += 1
                total_score += submission.get("score", 0)
            elif submission["status"] == "pending":
                pending += 1

        return {
            "completed": completed,
            "pending": pending,
            "totalScore": total_score
        }

    except Exception as e:
        print(f"Error getting student stats: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get student stats: {str(e)}"
        ) 