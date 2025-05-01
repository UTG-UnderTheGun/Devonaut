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
        print(f"DEBUG TIMELINE: Getting timeline for user={user_id}, assignment={assignment_id}, exercise={exercise_id}, problem_index={problem_index}")
        
        # Build a more flexible query
        query = {"user_id": user_id}
        
        if assignment_id:
            query["assignment_id"] = assignment_id
            print(f"DEBUG TIMELINE: Filtering by assignment_id={assignment_id}")
        
        # First check if the code_keystrokes collection exists and has data
        keystrokes_count = await db["code_keystrokes"].count_documents(query)
        print(f"DEBUG TIMELINE: Found {keystrokes_count} keystrokes in code_keystrokes collection")
        
        # Initialize empty timeline
        timeline = []
        
        # Get all keystrokes for this user and assignment
        if keystrokes_count > 0:
            cursor = db["code_keystrokes"].find(query).sort("timestamp", 1)
            keystrokes = await cursor.to_list(length=1000)  # Set a reasonable limit
            
            print(f"DEBUG TIMELINE: Found {len(keystrokes)} total keystrokes for this user/assignment")
            
            # Filter by exercise_id or problem_index after fetching
            if exercise_id:
                print(f"DEBUG TIMELINE: Filtering by exercise_id={exercise_id}")
                # Convert exercise_id to string for comparison
                str_exercise_id = str(exercise_id)
                keystrokes = [k for k in keystrokes if 
                             (k.get("exercise_id") and str(k.get("exercise_id")) == str_exercise_id)]
                print(f"DEBUG TIMELINE: After exercise_id filtering: {len(keystrokes)} keystrokes")
            
            if problem_index is not None:
                print(f"DEBUG TIMELINE: Filtering by problem_index={problem_index}")
                # Handle both string and int for problem_index
                keystrokes = [k for k in keystrokes if 
                             (k.get("problem_index") == problem_index or 
                              str(k.get("problem_index")) == str(problem_index))]
                print(f"DEBUG TIMELINE: After problem_index filtering: {len(keystrokes)} keystrokes")
            
            if keystrokes:
                # Show the first few keystrokes for debugging
                sample_keystrokes = keystrokes[:3]
                print(f"DEBUG TIMELINE: Sample keystroke data: {str([{k.get('_id'): {'problem_index': k.get('problem_index'), 'exercise_id': k.get('exercise_id')}} for k in sample_keystrokes])}")
                
                # Process keystrokes into timeline
                previous_code = None
                
                for i, keystroke in enumerate(keystrokes):
                    # Skip entries without code
                    if "code" not in keystroke:
                        continue
                        
                    current_code = keystroke["code"]
                    
                    # For the first entry, just add it directly
                    if i == 0 or previous_code is None:
                        timeline_entry = {
                            "code": current_code,
                            "timestamp": keystroke.get("timestamp", datetime.utcnow()),
                            "action_type": keystroke.get("action_type", "keystroke"),
                            "problem_index": keystroke.get("problem_index"),
                            "exercise_id": keystroke.get("exercise_id"),
                            "changes": None  # No changes for first entry
                        }
                        timeline.append(timeline_entry)
                    else:
                        # Calculate diff between previous and current code
                        diff = list(difflib.ndiff(previous_code.splitlines(keepends=True), 
                                                 current_code.splitlines(keepends=True)))
                        
                        # Only add to timeline if code actually changed
                        if any(line.startswith('+ ') or line.startswith('- ') for line in diff):
                            timeline_entry = {
                                "code": current_code,
                                "timestamp": keystroke.get("timestamp", datetime.utcnow()),
                                "action_type": keystroke.get("action_type", "keystroke"),
                                "problem_index": keystroke.get("problem_index"),
                                "exercise_id": keystroke.get("exercise_id"),
                                "changes": diff
                            }
                            timeline.append(timeline_entry)
                    
                    previous_code = current_code
        
        # If no results from keystrokes, try code_history as fallback
        if not timeline:
            print("DEBUG TIMELINE: No keystroke data found, trying code_history as fallback")
            
            # Query the code_history collection
            history_query = {"user_id": user_id}
            
            if assignment_id:
                history_query["assignment_id"] = assignment_id
                
            # Get code history entries
            history_cursor = db["code_history"].find(history_query).sort("created_at", 1)
            history_entries = await history_cursor.to_list(length=1000)
            
            print(f"DEBUG TIMELINE: Found {len(history_entries)} entries in code_history")
            
            # Filter by exercise_id or problem_index
            if exercise_id:
                str_exercise_id = str(exercise_id)
                history_entries = [h for h in history_entries if 
                                  (h.get("exercise_id") and str(h.get("exercise_id")) == str_exercise_id)]
                
            if problem_index is not None:
                history_entries = [h for h in history_entries if 
                                  (h.get("problem_index") == problem_index or 
                                   str(h.get("problem_index")) == str(problem_index))]
            
            # Convert code history to timeline format
            for entry in history_entries:
                if "code" in entry:
                    timeline_entry = {
                        "code": entry["code"],
                        "timestamp": entry.get("created_at", datetime.utcnow()),
                        "action_type": entry.get("action_type", "access"),
                        "problem_index": entry.get("problem_index"),
                        "exercise_id": entry.get("exercise_id"),
                        "changes": None
                    }
                    timeline.append(timeline_entry)
        
        # If still no timeline, add a placeholder entry to avoid empty response
        if not timeline and (exercise_id or problem_index is not None):
            print("DEBUG TIMELINE: No data found in any collection, adding placeholder")
            
            # Create a placeholder entry so the frontend knows we tried
            placeholder = {
                "code": "",
                "timestamp": datetime.utcnow(),
                "action_type": "placeholder",
                "problem_index": problem_index,
                "exercise_id": exercise_id,
                "changes": None,
                "message": "No code history found for this exercise"
            }
            timeline.append(placeholder)
        
        # Convert ObjectId to string and format timestamps
        for entry in timeline:
            # Convert datetime objects to ISO strings
            if "timestamp" in entry and isinstance(entry["timestamp"], datetime):
                entry["timestamp"] = entry["timestamp"].isoformat()
                
        print(f"DEBUG TIMELINE: Processed timeline with {len(timeline)} entries")
        
        return timeline
    except Exception as e:
        print(f"ERROR getting keystroke timeline: {str(e)}")
        print(f"Full exception details: {repr(e)}")
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