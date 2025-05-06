from fastapi import APIRouter, Depends, HTTPException, Request, Body
from fastapi.responses import JSONResponse
from fastapi_limiter.depends import RateLimiter
from app.db.schemas import Code, CodeHistory, KeystrokeData, InputData
from app.services.run_code_service import run_code as run_code_service, send_input
from app.services.export_code import export_code
from app.services.keystroke_service import save_keystroke, get_keystrokes, get_keystroke_timeline, get_keystroke_aggregates
from typing import Dict, Any, Tuple, List
from app.core.security import get_current_user
import time
from datetime import datetime
router = APIRouter()


async def get_identifier(request: Request):
    """
    Async identifier function for rate limiting that also checks authentication
    """
    try:
        user, user_id = await get_current_user(request)
        return f"run_code:{user_id}"
    except HTTPException:
        raise HTTPException(status_code=401, detail="Not authenticated")


@router.post("/run-code", response_model=Dict[str, Any])
async def run_code(
    request: Request,  # Add request parameter
    code: Code,
    current_user=Depends(get_current_user),
    _: bool = Depends(RateLimiter(times=20, seconds=60, identifier=get_identifier)),
):
    """
    Run Python code and return the output
    """
    try:
        # Get user info
        user, user_id = current_user
        
        # Ensure code is not None
        safe_code = Code(code=code.code or "")
            
        # Run the code
        start_time = time.time()
        result = await run_code_service(safe_code, user_id)
        execution_time = time.time() - start_time
        
        # We're removing the history saving code from here
        # as it's now being handled explicitly by the frontend
        # This prevents duplicate entries in the database
        
        return result
    except Exception as e:
        return {"error": str(e)}


@router.post("/send-input", response_model=Dict[str, Any])
async def handle_input(
    request: Request,
    input_data: InputData,
    current_user=Depends(get_current_user),
):
    """
    Handle user input for interactive code execution
    """
    try:
        # Get user info
        user, user_id = current_user
        
        # Get the input value from the request body
        user_input = input_data.input
        
        # Send the input to the running process
        result = await send_input(user_input, user_id)
        
        return result
    except Exception as e:
        return {"error": str(e)}


@router.post("/save-code-history")
async def save_code_history(
    request: Request,
    history: CodeHistory,
    current_user=Depends(get_current_user),
):
    """
    Save code execution history with problem context
    """
    try:
        # Get user info
        user, user_id = current_user
        
        # Create a new dict with only the data we need
        history_data = {
            "user_id": user_id,
            "username": user.get("username", ""),  # Add username to history
            "code": history.code or "",
            "created_at": datetime.utcnow()
        }
        
        # Add optional fields only if they exist and are not None
        if history.problem_index is not None:
            history_data["problem_index"] = history.problem_index
            
        if history.test_type:
            history_data["test_type"] = history.test_type
            
        if history.output is not None:
            history_data["output"] = history.output
            
        if history.error is not None:
            history_data["error"] = history.error
            
        if history.execution_time is not None:
            history_data["execution_time"] = history.execution_time
            
        if history.is_submission is not None:
            history_data["is_submission"] = history.is_submission
            
        if history.action_type:
            history_data["action_type"] = history.action_type
        else:
            history_data["action_type"] = "run"  # Default
        
        # Insert into MongoDB
        result = await request.app.mongodb["code_history"].insert_one(history_data)
        
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        # Return error as 200 response to avoid breaking client
        return {"success": False, "error": str(e)}


@router.get("/code-history", response_model=List[CodeHistory])
async def get_code_history(
    request: Request,
    current_user=Depends(get_current_user),
    problem_index: int = None,
    limit: int = 50,
    skip: int = 0,
):
    """
    Get code execution history for the current user
    """
    try:
        user, user_id = current_user
        
        # Build query
        query = {"user_id": user_id}
        if problem_index is not None:
            query["problem_index"] = problem_index
            
        # Get history from MongoDB
        cursor = request.app.mongodb["code_history"].find(query).sort("created_at", -1).skip(skip).limit(limit)
        
        # Convert to list
        history = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for item in history:
            item["_id"] = str(item["_id"])
            
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/code-history/{history_id}")
async def get_code_history_by_id(
    request: Request,
    history_id: str,
    current_user=Depends(get_current_user),
):
    """
    Get specific code execution history by ID
    """
    try:
        from bson import ObjectId
        
        user, user_id = current_user
        
        # Get history from MongoDB
        history = await request.app.mongodb["code_history"].find_one({"_id": ObjectId(history_id), "user_id": user_id})
        
        if not history:
            raise HTTPException(status_code=404, detail="History not found")
            
        # Convert ObjectId to string
        history["_id"] = str(history["_id"])
            
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_as_json():
    return await export_code()

@router.get("/code-analytics/user/{user_id}")
async def get_user_code_analytics(
    request: Request,
    user_id: str,
    current_user=Depends(get_current_user),
):
    """
    Get analytics for a specific user (admin only)
    """
    try:
        # Check if current user is admin (implement your admin check)
        admin_user, admin_id = current_user
        
        # Get statistics from MongoDB
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$group": {
                "_id": "$problem_index",
                "attempts": {"$sum": 1},
                "submissions": {"$sum": {"$cond": ["$is_submission", 1, 0]}},
                "avg_execution_time": {"$avg": "$execution_time"},
                "last_attempt": {"$max": "$created_at"}
            }},
            {"$sort": {"_id": 1}}
        ]
        
        result = await request.app.mongodb["code_history"].aggregate(pipeline).to_list(length=100)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/code-analytics/problem/{problem_index}")
async def get_problem_analytics(
    request: Request,
    problem_index: int,
    current_user=Depends(get_current_user),
):
    """
    Get analytics for a specific problem (admin only)
    """
    try:
        # Check if current user is admin (implement your admin check)
        admin_user, admin_id = current_user
        
        # Get statistics from MongoDB
        pipeline = [
            {"$match": {"problem_index": problem_index}},
            {"$group": {
                "_id": "$user_id",
                "attempts": {"$sum": 1},
                "submissions": {"$sum": {"$cond": ["$is_submission", 1, 0]}},
                "avg_execution_time": {"$avg": "$execution_time"},
                "last_attempt": {"$max": "$created_at"}
            }},
            {"$sort": {"attempts": -1}}
        ]
        
        result = await request.app.mongodb["code_history"].aggregate(pipeline).to_list(length=100)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/code-analytics/summary")
async def get_analytics_summary(
    request: Request,
    current_user=Depends(get_current_user),
):
    """
    Get overall analytics summary (admin only)
    """
    try:
        # Check if current user is admin (implement your admin check)
        admin_user, admin_id = current_user
        
        # Get statistics from MongoDB
        pipeline = [
            {"$group": {
                "_id": None,
                "total_runs": {"$sum": 1},
                "total_submissions": {"$sum": {"$cond": ["$is_submission", 1, 0]}},
                "avg_execution_time": {"$avg": "$execution_time"},
                "unique_users": {"$addToSet": "$user_id"},
                "unique_problems": {"$addToSet": "$problem_index"}
            }}
        ]
        
        result = await request.app.mongodb["code_history"].aggregate(pipeline).to_list(length=1)
        
        if result:
            result[0]["unique_users"] = len(result[0]["unique_users"])
            result[0]["unique_problems"] = len(result[0]["unique_problems"])
            
        return result[0] if result else {}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track-code-access")
async def track_code_access(
    request: Request,
    history: CodeHistory,
    current_user=Depends(get_current_user),
):
    """
    Track when a user accesses a problem's code
    """
    try:
        # Get user info
        user, user_id = current_user
        
        # Print received data for debugging
        print(f"Received access tracking data: {history.dict()}")
        
        # Create a new dict with only the data we need
        history_data = {
            "user_id": user_id,
            "username": user.get("username", ""),  # Add username to history
            "code": history.code or "",
            "created_at": datetime.utcnow(),
            "action_type": "access"  # Override to ensure correct action type
        }
        
        # Add optional fields only if they exist and are not None
        if history.problem_index is not None:
            history_data["problem_index"] = history.problem_index
            
        if history.test_type:
            history_data["test_type"] = history.test_type
            
        # Don't store output/error for access events to save space
        history_data["output"] = ""
        history_data["error"] = ""
        history_data["execution_time"] = 0.0
            
        print(f"Processed access tracking data: {history_data}")
        
        # Insert into MongoDB
        result = await request.app.mongodb["code_history"].insert_one(history_data)
        
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        print(f"Error tracking code access: {str(e)}")
        # Return error as 200 response to avoid breaking client
        return {"success": False, "error": str(e)}


@router.get("/code-analytics/access-patterns")
async def get_access_patterns(
    request: Request,
    current_user=Depends(get_current_user),
    problem_index: int = None,
    user_id: str = None,
    days: int = 7
):
    """
    Get analytics about how users access code problems
    """
    try:
        # Check if current user is admin or requesting their own data
        admin_user, admin_id = current_user
        
        # If user_id is not provided, use the current user's ID
        if not user_id:
            user_id = admin_id
        
        # Only allow admins to view other users' data
        # TODO: Implement proper admin check
        if user_id != admin_id:
            # This is a placeholder for admin check
            pass
            
        # Calculate date range
        from datetime import datetime, timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Build query
        query = {"created_at": {"$gte": start_date}}
        if user_id:
            query["user_id"] = user_id
        if problem_index is not None:
            query["problem_index"] = problem_index
            
        # Get access patterns from MongoDB
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": {
                    "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                    "action_type": "$action_type",
                    "problem_index": "$problem_index"
                },
                "count": {"$sum": 1},
                "users": {"$addToSet": "$user_id"}
            }},
            {"$sort": {"_id.day": 1, "_id.problem_index": 1}}
        ]
        
        result = await request.app.mongodb["code_history"].aggregate(pipeline).to_list(length=1000)
        
        # Process results
        for item in result:
            item["day"] = item["_id"]["day"]
            item["action_type"] = item["_id"]["action_type"]
            item["problem_index"] = item["_id"]["problem_index"]
            item["unique_users"] = len(item["users"])
            del item["_id"]
            del item["users"]
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/code-analytics/user-journey/{user_id}")
async def get_user_journey(
    request: Request,
    user_id: str,
    current_user=Depends(get_current_user),
    problem_index: int = None
):
    """
    Get a chronological journey of a user's interactions with code problems
    """
    try:
        # Check if current user is admin or requesting their own data
        admin_user, admin_id = current_user
        
        # Only allow users to view their own data or admins to view any data
        if user_id != admin_id:
            # This is a placeholder for admin check
            pass
            
        # Build query
        query = {"user_id": user_id}
        if problem_index is not None:
            query["problem_index"] = problem_index
            
        # Get journey from MongoDB
        cursor = request.app.mongodb["code_history"].find(query).sort("created_at", 1)
        
        # Convert to list
        journey = await cursor.to_list(length=1000)
        
        # Process results
        for item in journey:
            item["_id"] = str(item["_id"])
            
        return journey
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/track-keystrokes")
async def track_keystrokes(
    request: Request,
    keystroke_data: KeystrokeData,
    current_user=Depends(get_current_user),
):
    """
    Track user keystrokes in the code editor
    """
    try:
        # Get user info
        user, user_id = current_user
        
        # Print detailed logs for debugging
        print(f"DEBUG KEYSTROKE: Received data: {keystroke_data.dict(exclude={'code'})}")
        
        # Prepare data for MongoDB
        data = {
            "user_id": user_id,
            "username": user.get("username", ""),
            "code": keystroke_data.code,
            "problem_index": keystroke_data.problem_index,
            "timestamp": datetime.utcnow(),
            "action_type": "keystroke"
        }
        
        # Add optional fields only if they exist and are not None or empty strings
        if keystroke_data.exercise_id and str(keystroke_data.exercise_id).strip():
            data["exercise_id"] = str(keystroke_data.exercise_id)
            
        if keystroke_data.assignment_id and str(keystroke_data.assignment_id).strip():
            data["assignment_id"] = str(keystroke_data.assignment_id)
            
        if keystroke_data.test_type:
            data["test_type"] = keystroke_data.test_type
            
        if keystroke_data.cursor_position:
            data["cursor_position"] = keystroke_data.cursor_position
            
        if keystroke_data.changes:
            data["changes"] = keystroke_data.changes
            
        # Print detailed logs about what we're about to save
        print(f"DEBUG KEYSTROKE: Preparing to save keystroke data for user {user_id}:")
        print(f"DEBUG KEYSTROKE: Collection target: code_keystrokes")
        print(f"DEBUG KEYSTROKE: Data: {data}")
        
        # Check if the collection exists, create it if not
        collections = await request.app.mongodb.list_collection_names()
        if "code_keystrokes" not in collections:
            print(f"DEBUG KEYSTROKE: Collection 'code_keystrokes' does not exist, creating it now")
            await request.app.mongodb.create_collection("code_keystrokes")
        
        # Store in MongoDB collection named 'code_keystrokes'
        result = await request.app.mongodb["code_keystrokes"].insert_one(data)
        print(f"DEBUG KEYSTROKE: Data saved successfully with ID: {result.inserted_id}")
        
        # Also add a record to code_history for backward compatibility
        try:
            history_data = {
                "user_id": user_id,
                "username": user.get("username", ""),
                "code": keystroke_data.code,
                "problem_index": keystroke_data.problem_index,
                "created_at": datetime.utcnow(),
                "action_type": "keystroke"  # Override to ensure correct action type
            }
            
            # Add optional fields only if they exist in the keystroke data
            if keystroke_data.exercise_id and str(keystroke_data.exercise_id).strip():
                history_data["exercise_id"] = str(keystroke_data.exercise_id)
                
            if keystroke_data.assignment_id and str(keystroke_data.assignment_id).strip():
                history_data["assignment_id"] = str(keystroke_data.assignment_id)
                
            if keystroke_data.test_type:
                history_data["test_type"] = keystroke_data.test_type
                
            # Insert into MongoDB
            await request.app.mongodb["code_history"].insert_one(history_data)
            print(f"DEBUG KEYSTROKE: Also saved to code_history for backward compatibility")
        except Exception as historyErr:
            print(f"Warning: Failed to save to code_history: {str(historyErr)}")
            # Continue even if this fails - we don't want to fail the main operation
        
        return {"success": True}
    except Exception as e:
        print(f"ERROR KEYSTROKE: Error tracking keystrokes: {str(e)}")
        print(f"ERROR KEYSTROKE: Full exception details: {repr(e)}")
        return {"success": False, "error": str(e)}

@router.get("/keystrokes/{user_id}/{assignment_id}")
async def get_user_keystrokes(
    request: Request,
    user_id: str,
    assignment_id: str,
    exercise_id: str = None,
    problem_index: int = None,
    limit: int = 100,
    skip: int = 0,
    current_user=Depends(get_current_user),
):
    """
    Get keystroke data for a user on a specific assignment
    """
    try:
        # Check if current user is either admin or requesting their own data
        admin_user, admin_id = current_user
        
        # Only allow users to view their own data or admins to view any data
        is_admin = admin_user.get("role") == "admin" or admin_user.get("role") == "teacher"
        if user_id != admin_id and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to view this data")
        
        # Get keystrokes using the service
        keystrokes = await get_keystrokes(
            db=request.app.mongodb,
            user_id=user_id,
            assignment_id=assignment_id,
            exercise_id=exercise_id,
            problem_index=problem_index,
            limit=limit,
            skip=skip
        )
        
        return keystrokes
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting keystrokes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving keystroke data: {str(e)}")

@router.get("/keystrokes/{user_id}/{assignment_id}/timeline")
async def get_user_keystroke_timeline(
    request: Request,
    user_id: str,
    assignment_id: str,
    exercise_id: str = None,
    problem_index: int = None,
    current_user=Depends(get_current_user),
):
    """
    Get a processed timeline of code changes for visualization
    """
    try:
        # Check if current user is either admin or requesting their own data
        admin_user, admin_id = current_user
        
        # Only allow users to view their own data or admins to view any data
        is_admin = admin_user.get("role") == "admin" or admin_user.get("role") == "teacher"
        if user_id != admin_id and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to view this data")
        
        # Get keystroke timeline using the service
        timeline = await get_keystroke_timeline(
            db=request.app.mongodb,
            user_id=user_id,
            assignment_id=assignment_id,
            exercise_id=exercise_id,
            problem_index=problem_index
        )
        
        return timeline
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting keystroke timeline: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving keystroke timeline: {str(e)}")

@router.get("/keystrokes/{user_id}/aggregate")
async def get_user_keystroke_aggregates(
    request: Request,
    user_id: str,
    assignment_id: str = None,
    days: int = 7,
    current_user=Depends(get_current_user),
):
    """
    Get aggregated keystroke statistics by day and problem
    """
    try:
        # Check if current user is either admin or requesting their own data
        admin_user, admin_id = current_user
        
        # Only allow users to view their own data or admins to view any data
        is_admin = admin_user.get("role") == "admin" or admin_user.get("role") == "teacher"
        if user_id != admin_id and not is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to view this data")
        
        # Get keystroke aggregates using the service
        aggregates = await get_keystroke_aggregates(
            db=request.app.mongodb,
            user_id=user_id,
            assignment_id=assignment_id,
            days=days
        )
        
        return aggregates
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting keystroke aggregates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving keystroke aggregates: {str(e)}")

@router.get("/keystrokes/assignment/{assignment_id}/exercise/{exercise_id}")
async def get_exercise_keystrokes(
    request: Request,
    assignment_id: str,
    exercise_id: str,
    current_user=Depends(get_current_user),
):
    """
    Get all keystrokes for a specific exercise in an assignment
    """
    try:
        # Verify authentication
        user, _ = current_user
        
        # Check if user is authenticated and has teacher role
        if not user.get("is_teacher", False):
            raise HTTPException(status_code=403, detail="Not authorized to view this data")
        
        # Build a more flexible query for the aggregation pipeline
        match_query = {}
        
        # Check if there are any records with the specified fields before filtering
        has_exercise = await request.app.mongodb["code_keystrokes"].count_documents({"exercise_id": exercise_id})
        has_assignment = await request.app.mongodb["code_keystrokes"].count_documents({"assignment_id": assignment_id})
        
        # Only include fields in the query if they exist in the data
        if has_assignment > 0:
            match_query["assignment_id"] = assignment_id
            print(f"DEBUG EXERCISE KEYSTROKES: Filtering by assignment_id={assignment_id}")
        else:
            print(f"DEBUG EXERCISE KEYSTROKES: No records found with assignment_id={assignment_id}")
            
        if has_exercise > 0:
            match_query["exercise_id"] = exercise_id
            print(f"DEBUG EXERCISE KEYSTROKES: Filtering by exercise_id={exercise_id}")
        else:
            # As a fallback, check if exercise_id matches problem_index
            has_problem = await request.app.mongodb["code_keystrokes"].count_documents({"problem_index": int(exercise_id) if exercise_id.isdigit() else -1})
            if has_problem > 0 and exercise_id.isdigit():
                match_query["problem_index"] = int(exercise_id)
                print(f"DEBUG EXERCISE KEYSTROKES: Filtering by problem_index={exercise_id} as fallback")
            else:
                print(f"DEBUG EXERCISE KEYSTROKES: No records found with exercise_id={exercise_id} or matching problem_index")
        
        # If we couldn't find any matching fields, return empty result
        if not match_query:
            print("DEBUG EXERCISE KEYSTROKES: No matching criteria found in any records")
            return []
            
        # Get all users who have submitted keystrokes for this exercise
        pipeline = [
            {"$match": match_query},
            {"$group": {
                "_id": "$user_id",
                "username": {"$first": "$username"},
                "keystrokes": {"$sum": 1},
                "last_activity": {"$max": "$timestamp"}
            }},
            {"$sort": {"last_activity": -1}}
        ]
        
        print(f"DEBUG EXERCISE KEYSTROKES: Executing aggregation with query: {match_query}")
        result = await request.app.mongodb["code_keystrokes"].aggregate(pipeline).to_list(length=100)
        print(f"DEBUG EXERCISE KEYSTROKES: Found {len(result)} users with keystroke data")
        
        # Convert ObjectId to string in results
        for keystroke in keystrokes:
            if "_id" in keystroke:
                keystroke["_id"] = str(keystroke["_id"])
        
        return keystrokes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-latest-code")
async def get_latest_code(
    request: Request,
    assignment_id: str,
    problem_index: int,
    exercise_id: str = None,
    current_user=Depends(get_current_user),
):
    """
    Get the latest code for a specific problem in an assignment
    
    This endpoint retrieves the most recent code that a student has written for a specific
    problem in an assignment. It first tries to find the code in the code_keystrokes collection,
    and if not found, falls back to the code_history collection.
    """
    try:
        # Get authenticated user
        user, user_id = current_user
        
        # Try to find the latest keystroke for this problem
        keystroke_query = {
            "user_id": user_id,
            "problem_index": problem_index
        }
        
        # Add assignment_id to query if provided
        if assignment_id:
            keystroke_query["assignment_id"] = assignment_id
        
        # Add exercise_id to query if provided
        if exercise_id:
            keystroke_query["exercise_id"] = exercise_id
        
        # Get the latest keystroke
        latest_keystroke = await request.app.mongodb["code_keystrokes"].find_one(
            keystroke_query,
            sort=[("timestamp", -1)]
        )
        
        if latest_keystroke and "code" in latest_keystroke:
            # Return the code from the keystroke
            return {
                "code": latest_keystroke["code"],
                "source": "code_keystrokes",
                "timestamp": latest_keystroke.get("timestamp", datetime.utcnow())
            }
        
        # If no keystroke found, try to find the latest code history entry
        history_query = {
            "user_id": user_id,
            "problem_index": problem_index
        }
        
        # Add assignment_id to query if available in history schema
        history_entry = await request.app.mongodb["code_history"].find_one(
            history_query,
            sort=[("created_at", -1)]
        )
        
        if history_entry and "code" in history_entry:
            # Return the code from history
            return {
                "code": history_entry["code"],
                "source": "code_history",
                "timestamp": history_entry.get("created_at", datetime.utcnow())
            }
        
        # If no data found, return empty response
        return {
            "code": "",
            "source": "none",
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        print(f"Error getting exercise keystrokes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving exercise keystroke data: {str(e)}")

@router.get("/keystrokes/debug")
async def debug_keystrokes(
    request: Request,
    user_id: str = None,
    current_user=Depends(get_current_user),
):
    """
    For debugging: Get information about keystroke collection data structure
    """
    try:
        # Check if current user is admin or teacher
        admin_user, admin_id = current_user
        is_admin = admin_user.get("role") == "admin" or admin_user.get("role") == "teacher"
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can access debug endpoints")
        
        # Query to use
        query = {}
        if user_id:
            query["user_id"] = user_id
            
        # Check if collection exists
        collections = await request.app.mongodb.list_collection_names()
        has_collection = "code_keystrokes" in collections
        
        # Get count of total documents
        count = 0
        if has_collection:
            count = await request.app.mongodb["code_keystrokes"].count_documents(query)
            
        # Get a sample document
        sample_doc = None
        if count > 0:
            sample_cursor = request.app.mongodb["code_keystrokes"].find(query).limit(1)
            sample_docs = await sample_cursor.to_list(length=1)
            if sample_docs:
                # Convert ObjectId to string
                sample_doc = sample_docs[0]
                if "_id" in sample_doc:
                    sample_doc["_id"] = str(sample_doc["_id"])
                # Convert datetime objects
                for key, value in sample_doc.items():
                    if isinstance(value, datetime):
                        sample_doc[key] = value.isoformat()
        
        # Get distinct values for some important fields to help debug
        available_fields = []
        user_ids = []
        assignment_ids = []
        exercise_ids = []
        problem_indices = []
        
        if has_collection:
            available_fields = await request.app.mongodb["code_keystrokes"].find_one(query)
            if available_fields:
                available_fields = list(available_fields.keys())
                
            user_ids = await request.app.mongodb["code_keystrokes"].distinct("user_id", query)
            assignment_ids = await request.app.mongodb["code_keystrokes"].distinct("assignment_id", query)
            exercise_ids = await request.app.mongodb["code_keystrokes"].distinct("exercise_id", query)
            problem_indices = await request.app.mongodb["code_keystrokes"].distinct("problem_index", query)
        
        # Compile the debug information
        debug_info = {
            "collection_exists": has_collection,
            "total_documents": count,
            "available_fields": available_fields,
            "unique_user_ids": user_ids,
            "unique_assignment_ids": assignment_ids,
            "unique_exercise_ids": exercise_ids,
            "unique_problem_indices": problem_indices,
            "sample_document": sample_doc
        }
            
        return debug_info
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting keystroke debug info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving keystroke debug info: {str(e)}")

@router.get("/keystrokes-by-user/{user_id}")
async def get_keystrokes_by_user(
    request: Request,
    user_id: str,
    problem_index: int = None
):
    """
    Direct access endpoint to get keystrokes for a specific user, for testing purposes
    """
    try:
        print(f"DEBUG TEST: Getting keystrokes for user_id={user_id}, problem_index={problem_index}")
        
        # Build query for MongoDB
        query = {"user_id": user_id}
        
        if problem_index is not None:
            query["problem_index"] = problem_index
            
        # Get keystrokes from the database
        cursor = request.app.mongodb["code_keystrokes"].find(query).sort("timestamp", 1).limit(100)
        keystrokes = await cursor.to_list(length=100)
        
        print(f"DEBUG TEST: Found {len(keystrokes)} keystrokes with query: {query}")
        
        # Process the results
        result = []
        for keystroke in keystrokes:
            # Convert ObjectId to string
            if "_id" in keystroke:
                keystroke["id"] = str(keystroke["_id"])
                del keystroke["_id"]
            
            # Convert datetime objects to ISO strings
            if "timestamp" in keystroke and isinstance(keystroke["timestamp"], datetime):
                keystroke["timestamp"] = keystroke["timestamp"].isoformat()
                
            result.append(keystroke)
            
        return result
    except Exception as e:
        print(f"Error in test endpoint: {str(e)}")
        return {"error": str(e)}

@router.post("/seed-keystrokes")
async def seed_keystrokes(
    request: Request,
    current_user=Depends(get_current_user),
):
    """
    Seed the keystroke data from a sample data file for testing purposes
    """
    try:
        # Check if current user is admin
        admin_user, admin_id = current_user
        is_admin = admin_user.get("role") == "admin" 
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can seed data")
        
        # First check if collection exists, create it if not
        collections = await request.app.mongodb.list_collection_names()
        if "code_keystrokes" not in collections:
            await request.app.mongodb.create_collection("code_keystrokes")
            print("DEBUG SEED: Created code_keystrokes collection")
        
        # Check if we already have data
        existing_count = await request.app.mongodb["code_keystrokes"].count_documents({})
        
        # If we have data, don't seed again unless forced
        if existing_count > 0:
            return {"success": False, "message": f"Collection already has {existing_count} documents. Seeding skipped."}
        
        # Sample data for testing (from the screenshot)
        sample_data = [
            {
                "_id": {"$oid": "681402e6bbc57c2d3d29f101"},
                "user_id": "6809e7a0ae6bed9c1447fe24",
                "username": "b@b.com",
                "code": "กหฟสวทกสวหฟกสวหฟก่\nฏ์ษศฆฤ่กสวห่ฟงกฆ\nฏหาวกาฟศ๋ฏษซฤฆ",
                "problem_index": 0,
                "timestamp": datetime.utcnow(),
                "action_type": "keystroke",
                "exercise_id": "1",
                "test_type": "code"
            },
            {
                "_id": {"$oid": "681404e6bbc57c2d3d29f12b"},
                "user_id": "6809e7a0ae6bed9c1447fe24",
                "username": "b@b.com",
                "code": "wvaeeeadwads",
                "problem_index": 1,
                "timestamp": datetime.utcnow(),
                "action_type": "keystroke",
                "exercise_id": "2",
                "test_type": "code"
            }
        ]
        
        # Insert sample data
        await request.app.mongodb["code_keystrokes"].insert_many(sample_data)
        
        return {"success": True, "message": f"Inserted {len(sample_data)} documents into code_keystrokes collection"}
    except Exception as e:
        print(f"Error seeding keystroke data: {str(e)}")
        return {"success": False, "error": str(e)}

@router.post("/import-keystrokes")
async def import_keystrokes(
    request: Request,
    file_path: str,
    current_user=Depends(get_current_user),
):
    """
    Import keystroke data from a JSON file
    """
    try:
        # Check if current user is admin
        admin_user, admin_id = current_user
        is_admin = admin_user.get("role") == "admin" 
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can import data")
        
        # Check if the file exists
        import os
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File not found: {file_path}"}
        
        # Read the JSON file
        import json
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        # Ensure it's a list of objects
        if not isinstance(data, list):
            return {"success": False, "error": "JSON file should contain a list of objects"}
        
        # Process each entry to convert date strings to datetime objects
        for entry in data:
            if "timestamp" in entry and isinstance(entry["timestamp"], dict) and "$date" in entry["timestamp"]:
                date_str = entry["timestamp"]["$date"]
                entry["timestamp"] = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            
            # Handle ObjectId for MongoDB
            if "_id" in entry and isinstance(entry["_id"], dict) and "$oid" in entry["_id"]:
                from bson import ObjectId
                entry["_id"] = ObjectId(entry["_id"]["$oid"])
        
        # First check if collection exists, create it if not
        collections = await request.app.mongodb.list_collection_names()
        if "code_keystrokes" not in collections:
            await request.app.mongodb.create_collection("code_keystrokes")
            print(f"DEBUG IMPORT: Created code_keystrokes collection")
        
        # Check if we already have data
        existing_count = await request.app.mongodb["code_keystrokes"].count_documents({})
        print(f"DEBUG IMPORT: Collection already has {existing_count} documents")
        
        # Insert the data
        result = await request.app.mongodb["code_keystrokes"].insert_many(data)
        inserted_count = len(result.inserted_ids)
        
        return {
            "success": True, 
            "message": f"Imported {inserted_count} keystroke records from {file_path}",
            "previous_count": existing_count,
            "new_count": existing_count + inserted_count
        }
    except Exception as e:
        print(f"Error importing keystroke data: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/code-history/by-user/{user_id}")
async def get_code_history_by_user(
    request: Request,
    user_id: str,
    problem_index: int = None,
    exercise_id: str = None,
    assignment_id: str = None,
    limit: int = 1000,
    skip: int = 0,
    current_user=Depends(get_current_user),
):
    """
    Get code execution history for a specific user (admin/teacher only)
    """
    try:
        admin_user, admin_id = current_user
        
        # Only allow admins or teachers to view other users' data
        is_admin = admin_user.get("role") == "admin"
        is_teacher = admin_user.get("role") == "teacher"
        
        if not (is_admin or is_teacher) and user_id != admin_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this data")
            
        # Build query
        query = {"user_id": user_id}
        if problem_index is not None:
            query["problem_index"] = problem_index
        if exercise_id is not None:
            query["exercise_id"] = exercise_id
        if assignment_id is not None:
            query["assignment_id"] = assignment_id
            
        # Get history from MongoDB - sort by created_at in ascending order to get chronological history
        cursor = request.app.mongodb["code_history"].find(query).sort("created_at", 1).skip(skip).limit(limit)
        
        # Convert to list
        history = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and format timestamps
        for item in history:
            item["_id"] = str(item["_id"])
            # Handle created_at in consistent format
            if "created_at" in item and item["created_at"]:
                try:
                    if isinstance(item["created_at"], datetime):
                        item["created_at"] = item["created_at"].isoformat()
                except Exception as e:
                    print(f"Error formatting timestamp: {e}")
            
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

