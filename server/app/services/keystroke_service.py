from datetime import datetime, timedelta
from fastapi import HTTPException
from typing import List, Dict, Any, Optional
from bson import ObjectId
import difflib
import json


async def save_keystroke(db, keystroke_data: Dict) -> Dict:
    """
    Save a keystroke event to the database
    """
    try:
        # Ensure required fields are present
        if not keystroke_data.get("code") or keystroke_data.get("user_id") is None:
            raise ValueError("Missing required fields in keystroke data")
        
        # Add timestamp if not provided
        if "timestamp" not in keystroke_data:
            keystroke_data["timestamp"] = datetime.now()
            
        # Insert into MongoDB
        result = await db["code_keystrokes"].insert_one(keystroke_data)
        
        if not result.inserted_id:
            raise HTTPException(status_code=500, detail="Failed to save keystroke data")
            
        return {"success": True, "id": str(result.inserted_id)}
    except Exception as e:
        print(f"Error saving keystroke: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


async def get_keystrokes(
    db, 
    user_id: str, 
    assignment_id: Optional[str] = None,
    exercise_id: Optional[str] = None,
    problem_index: Optional[int] = None,
    limit: int = 100,
    skip: int = 0
) -> List[Dict]:
    """
    Get keystroke events for a specific user, optionally filtered by assignment and exercise
    """
    try:
        # Build query
        query = {"user_id": user_id}
        
        if assignment_id:
            query["assignment_id"] = assignment_id
            
        if exercise_id:
            query["exercise_id"] = exercise_id
            
        if problem_index is not None:
            query["problem_index"] = problem_index
            
        # Get keystrokes from MongoDB with sorting
        cursor = db["code_keystrokes"].find(query).sort("timestamp", 1).skip(skip).limit(limit)
        keystrokes = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and format timestamps
        for keystroke in keystrokes:
            if "_id" in keystroke:
                keystroke["id"] = str(keystroke["_id"])
                del keystroke["_id"]
            
            # Convert datetime objects to ISO strings
            if "timestamp" in keystroke and isinstance(keystroke["timestamp"], datetime):
                keystroke["timestamp"] = keystroke["timestamp"].isoformat()
                
        return keystrokes
    except Exception as e:
        print(f"Error getting keystrokes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


async def get_keystroke_timeline(
    db, 
    user_id: str, 
    assignment_id: str,
    exercise_id: Optional[str] = None,
    problem_index: Optional[int] = None
) -> List[Dict]:
    """
    Get a timeline of code changes for visualization
    """
    try:
        # Get all keystrokes for the specified criteria
        keystrokes = await get_keystrokes(
            db=db,
            user_id=user_id,
            assignment_id=assignment_id,
            exercise_id=exercise_id,
            problem_index=problem_index,
            limit=1000  # Set a reasonable limit
        )
        
        if not keystrokes:
            return []
            
        # Process keystrokes into timeline
        timeline = []
        previous_code = None
        
        for i, keystroke in enumerate(keystrokes):
            # Skip entries without code
            if "code" not in keystroke:
                continue
                
            current_code = keystroke["code"]
            
            # For the first entry, just add it directly
            if i == 0 or previous_code is None:
                timeline.append({
                    "code": current_code,
                    "timestamp": keystroke["timestamp"],
                    "action_type": keystroke.get("action_type", "keystroke"),
                    "cursor_position": keystroke.get("cursor_position"),
                    "problem_index": keystroke.get("problem_index"),
                    "exercise_id": keystroke.get("exercise_id"),
                    "changes": None  # No changes for first entry
                })
            else:
                # Calculate diff between previous and current code
                diff = list(difflib.ndiff(previous_code.splitlines(keepends=True), 
                                         current_code.splitlines(keepends=True)))
                
                # Only add to timeline if code actually changed
                if any(line.startswith('+ ') or line.startswith('- ') for line in diff):
                    timeline.append({
                        "code": current_code,
                        "timestamp": keystroke["timestamp"],
                        "action_type": keystroke.get("action_type", "keystroke"),
                        "cursor_position": keystroke.get("cursor_position"),
                        "problem_index": keystroke.get("problem_index"),
                        "exercise_id": keystroke.get("exercise_id"),
                        "changes": diff
                    })
            
            previous_code = current_code
            
        return timeline
    except Exception as e:
        print(f"Error getting keystroke timeline: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


async def get_keystroke_aggregates(
    db, 
    user_id: str, 
    assignment_id: Optional[str] = None,
    days: int = 7
) -> List[Dict]:
    """
    Get aggregated keystroke statistics by day, action type, and problem
    """
    try:
        # Calculate date range
        start_date = datetime.now() - timedelta(days=days)
        
        # Build query
        query = {
            "user_id": user_id,
            "timestamp": {"$gte": start_date}
        }
        
        if assignment_id:
            query["assignment_id"] = assignment_id
            
        # Aggregate keystroke data
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": {
                    "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                    "action_type": "$action_type",
                    "problem_index": "$problem_index",
                    "exercise_id": "$exercise_id"
                },
                "count": {"$sum": 1},
                "last_timestamp": {"$max": "$timestamp"}
            }},
            {"$sort": {"_id.day": 1, "_id.problem_index": 1}}
        ]
        
        result = await db["code_keystrokes"].aggregate(pipeline).to_list(length=1000)
        
        # Process results into a friendlier format
        processed_results = []
        for item in result:
            processed_results.append({
                "day": item["_id"]["day"],
                "action_type": item["_id"]["action_type"] or "keystroke",
                "problem_index": item["_id"]["problem_index"],
                "exercise_id": item["_id"]["exercise_id"],
                "count": item["count"],
                "last_activity": item["last_timestamp"].isoformat() if isinstance(item["last_timestamp"], datetime) else item["last_timestamp"]
            })
            
        return processed_results
    except Exception as e:
        print(f"Error getting keystroke aggregates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 