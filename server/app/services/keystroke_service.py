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
        
        # Debug info
        print(f"DEBUG GET_KEYSTROKES: Querying keystrokes for user_id={user_id}")
        
        # Only filter by assignment_id if it exists in the data
        if assignment_id:
            # Check if any records have assignment_id field for this user
            has_assignment = await db["code_keystrokes"].count_documents({"user_id": user_id, "assignment_id": assignment_id})
            if has_assignment > 0:
                query["assignment_id"] = assignment_id
                print(f"DEBUG GET_KEYSTROKES: Filtering by assignment_id={assignment_id}")
            else:
                print(f"DEBUG GET_KEYSTROKES: No records found with assignment_id={assignment_id}, querying without assignment filter")
        
        if exercise_id:
            # Check if any records have exercise_id field for this user
            has_exercise = await db["code_keystrokes"].count_documents({"user_id": user_id, "exercise_id": exercise_id})
            if has_exercise > 0:
                query["exercise_id"] = exercise_id
                print(f"DEBUG GET_KEYSTROKES: Filtering by exercise_id={exercise_id}")
            else:
                print(f"DEBUG GET_KEYSTROKES: No records found with exercise_id={exercise_id}, querying without exercise filter")
            
        if problem_index is not None:
            query["problem_index"] = problem_index
            print(f"DEBUG GET_KEYSTROKES: Filtering by problem_index={problem_index}")
            
        # Get keystrokes from MongoDB with sorting
        print(f"DEBUG GET_KEYSTROKES: Final query = {query}")
        cursor = db["code_keystrokes"].find(query).sort("timestamp", 1).skip(skip).limit(limit)
        keystrokes = await cursor.to_list(length=limit)
        print(f"DEBUG GET_KEYSTROKES: Found {len(keystrokes)} keystrokes")
        
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
        
        # Check if assignment_id exists in any records before filtering by it
        if assignment_id:
            has_assignment = await db["code_keystrokes"].count_documents({"user_id": user_id, "assignment_id": assignment_id})
            if has_assignment > 0:
                query["assignment_id"] = assignment_id
                print(f"DEBUG TIMELINE: Filtering by assignment_id={assignment_id}")
            else:
                print(f"DEBUG TIMELINE: No records found with assignment_id={assignment_id}, querying without assignment filter")
        
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
            
            # We'll save all keystrokes first then filter, to ensure we can check data
            if len(keystrokes) > 0:
                # Debug first few keystrokes to see actual values
                sample = keystrokes[:3]
                for i, k in enumerate(sample):
                    print(f"DEBUG TIMELINE: Sample keystroke {i+1}:")
                    print(f"  problem_index: {k.get('problem_index')} (type: {type(k.get('problem_index')).__name__})")
                    print(f"  exercise_id: {k.get('exercise_id')} (type: {type(k.get('exercise_id')).__name__})")
            
            # Filter by exercise_id or problem_index after fetching
            if exercise_id:
                print(f"DEBUG TIMELINE: Filtering by exercise_id={exercise_id}")
                # Convert exercise_id to string for comparison
                str_exercise_id = str(exercise_id)
                num_exercise_id = None
                try:
                    num_exercise_id = int(exercise_id)
                except (ValueError, TypeError):
                    pass
                
                # Prepare both direct and zero-based indices for comparison
                zero_based_index = None
                if num_exercise_id is not None and num_exercise_id > 0:
                    zero_based_index = num_exercise_id - 1
                
                filtered_keystrokes = []
                for k in keystrokes:
                    # Get values for comparison
                    k_exercise_id = k.get("exercise_id")
                    k_problem_index = k.get("problem_index")
                    
                    # Try all possible matching combinations
                    matches = False
                    
                    # Direct matches
                    if k_exercise_id is not None:
                        if k_exercise_id == exercise_id or str(k_exercise_id) == str_exercise_id:
                            matches = True
                    
                    # Check if problem_index matches directly
                    if not matches and k_problem_index is not None:
                        if k_problem_index == exercise_id or str(k_problem_index) == str_exercise_id:
                            matches = True
                    
                    # Check if problem_index matches zero-based index
                    if not matches and k_problem_index is not None and zero_based_index is not None:
                        if k_problem_index == zero_based_index or str(k_problem_index) == str(zero_based_index):
                            matches = True
                    
                    if matches:
                        filtered_keystrokes.append(k)
                
                keystrokes = filtered_keystrokes
                print(f"DEBUG TIMELINE: After exercise_id filtering: {len(keystrokes)} keystrokes")
            
            if problem_index is not None:
                print(f"DEBUG TIMELINE: Filtering by problem_index={problem_index}")
                # Handle both string and int for problem_index
                str_problem_index = str(problem_index)
                
                # Prepare zero-based index for comparison
                zero_based_index = None
                if isinstance(problem_index, int) and problem_index > 0:
                    zero_based_index = problem_index - 1
                
                filtered_keystrokes = []
                for k in keystrokes:
                    # Get values for comparison
                    k_exercise_id = k.get("exercise_id") 
                    k_problem_index = k.get("problem_index")
                    
                    # Try all possible matching combinations
                    matches = False
                    
                    # Direct matches on problem_index
                    if k_problem_index is not None:
                        if k_problem_index == problem_index or str(k_problem_index) == str_problem_index:
                            matches = True
                    
                    # Check if exercise_id matches problem_index directly
                    if not matches and k_exercise_id is not None:
                        if k_exercise_id == problem_index or str(k_exercise_id) == str_problem_index:
                            matches = True
                    
                    # Check if problem_index matches zero-based index
                    if not matches and k_problem_index is not None and zero_based_index is not None:
                        if k_problem_index == zero_based_index or str(k_problem_index) == str(zero_based_index):
                            matches = True
                    
                    if matches:
                        filtered_keystrokes.append(k)
                
                keystrokes = filtered_keystrokes
                print(f"DEBUG TIMELINE: After problem_index filtering: {len(keystrokes)} keystrokes")
            
            if keystrokes:
                # Show some sample data for debugging after filtering
                if len(keystrokes) > 0:
                    sample = keystrokes[0]
                    print(f"DEBUG TIMELINE: Sample filtered keystroke:")
                    print(f"  problem_index: {sample.get('problem_index')}")
                    print(f"  exercise_id: {sample.get('exercise_id')}")
                    print(f"  timestamp: {sample.get('timestamp')}")
                    print(f"  code: {sample.get('code')[:30] if sample.get('code') else None}...")
                
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
            
            # Check if assignment_id exists in any records before filtering by it
            if assignment_id:
                has_assignment = await db["code_history"].count_documents({"user_id": user_id, "assignment_id": assignment_id})
                if has_assignment > 0:
                    history_query["assignment_id"] = assignment_id
                    print(f"DEBUG TIMELINE: Filtering code_history by assignment_id={assignment_id}")
                else:
                    print(f"DEBUG TIMELINE: No code_history records found with assignment_id={assignment_id}, querying without assignment filter")
                
            # Get code history entries
            history_cursor = db["code_history"].find(history_query).sort("created_at", 1)
            history_entries = await history_cursor.to_list(length=1000)
            
            print(f"DEBUG TIMELINE: Found {len(history_entries)} entries in code_history")
            
            # Filter by exercise_id or problem_index
            if exercise_id:
                str_exercise_id = str(exercise_id)
                num_exercise_id = None
                try:
                    num_exercise_id = int(exercise_id)
                except (ValueError, TypeError):
                    pass
                
                zero_based_index = None
                if num_exercise_id is not None and num_exercise_id > 0:
                    zero_based_index = num_exercise_id - 1
                
                filtered_entries = []
                for h in history_entries:
                    h_exercise_id = h.get("exercise_id")
                    h_problem_index = h.get("problem_index")
                    
                    matches = False
                    
                    # Direct matches
                    if h_exercise_id is not None:
                        if h_exercise_id == exercise_id or str(h_exercise_id) == str_exercise_id:
                            matches = True
                    
                    # Problem index direct match
                    if not matches and h_problem_index is not None:
                        if h_problem_index == exercise_id or str(h_problem_index) == str_exercise_id:
                            matches = True
                    
                    # Zero-based index match
                    if not matches and h_problem_index is not None and zero_based_index is not None:
                        if h_problem_index == zero_based_index or str(h_problem_index) == str(zero_based_index):
                            matches = True
                    
                    if matches:
                        filtered_entries.append(h)
                
                history_entries = filtered_entries
            
            if problem_index is not None:
                str_problem_index = str(problem_index)
                
                zero_based_index = None
                if isinstance(problem_index, int) and problem_index > 0:
                    zero_based_index = problem_index - 1
                
                filtered_entries = []
                for h in history_entries:
                    h_exercise_id = h.get("exercise_id")
                    h_problem_index = h.get("problem_index")
                    
                    matches = False
                    
                    # Direct problem_index match
                    if h_problem_index is not None:
                        if h_problem_index == problem_index or str(h_problem_index) == str_problem_index:
                            matches = True
                    
                    # Exercise ID match
                    if not matches and h_exercise_id is not None:
                        if h_exercise_id == problem_index or str(h_exercise_id) == str_problem_index:
                            matches = True
                    
                    # Zero-based index match
                    if not matches and h_problem_index is not None and zero_based_index is not None:
                        if h_problem_index == zero_based_index or str(h_problem_index) == str(zero_based_index):
                            matches = True
                    
                    if matches:
                        filtered_entries.append(h)
                
                history_entries = filtered_entries
            
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
        
        # Check if assignment_id exists in any records before filtering by it
        if assignment_id:
            has_assignment = await db["code_keystrokes"].count_documents({"user_id": user_id, "assignment_id": assignment_id})
            if has_assignment > 0:
                query["assignment_id"] = assignment_id
                print(f"DEBUG AGGREGATES: Filtering by assignment_id={assignment_id}")
            else:
                print(f"DEBUG AGGREGATES: No records found with assignment_id={assignment_id}, querying without assignment filter")
            
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
        
        print(f"DEBUG AGGREGATES: Executing aggregation with query: {query}")
        result = await db["code_keystrokes"].aggregate(pipeline).to_list(length=1000)
        print(f"DEBUG AGGREGATES: Found {len(result)} aggregated results")
        
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