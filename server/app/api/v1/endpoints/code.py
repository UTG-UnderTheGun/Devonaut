from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi_limiter.depends import RateLimiter
from app.db.schemas import Code, CodeHistory
from app.services.run_code_service import run_code as run_code_service
from app.services.export_code import export_code
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
        
        # Print received data for debugging
        print(f"Received history data: {history.dict()}")
        
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
            
        print(f"Processed history data: {history_data}")
        
        # Insert into MongoDB
        result = await request.app.mongodb["code_history"].insert_one(history_data)
        
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        print(f"Error saving code history: {str(e)}")
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
