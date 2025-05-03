from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from app.services.chat_service import chat
import asyncio
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import ObjectId
import os
from dotenv import load_dotenv
import time
from datetime import datetime, timedelta
import logging
import json
from app.db.schemas import ChatMessage, ChatHistory

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
DEFAULT_MAX_QUESTIONS = int(
    os.getenv("DEFAULT_MAX_QUESTIONS", "10")
)  # Default to 10 questions per exercise
RESET_INTERVAL = int(os.getenv("RESET_INTERVAL", "8"))  # Reset period in hours
MAX_CONVERSATION_LENGTH = int(
    os.getenv("MAX_CONVERSATION_LENGTH", "20")
)  # Max messages to keep
MONGODB_MAX_POOL_SIZE = int(
    os.getenv("MONGODB_MAX_POOL_SIZE", "50")
)  # Connection pool size

# MongoDB connection with proper connection pooling
client = MongoClient(
    MONGO_URI,
    maxPoolSize=MONGODB_MAX_POOL_SIZE,
    serverSelectionTimeoutMS=5000,  # 5 seconds timeout
    connectTimeoutMS=5000,
)
db = client["mydatabase"]
users_collection = db["users"]
reset_collection = db["question_resets"]
conversation_collection = db["conversations"]
exercises_collection = db[
    "exercises"
]  # Collection for tracking exercise-specific quotas
chat_history_collection = db["chat_histories"]  # New collection for storing chat histories

# Create router
router = APIRouter()


class ChatRequest(BaseModel):
    user_id: str
    prompt: str
    exercise_id: str = None  # Exercise ID to track quotas per exercise
    assignment_id: str = None  # Assignment ID to separate conversations


class QuestionsRequest(BaseModel):
    user_id: str
    exercise_id: str = None  # Optional exercise ID to reset questions for a specific exercise
    assignment_id: str = None  # Optional assignment ID


class SkillLevelRequest(BaseModel):
    user_id: str
    skill_level: str


class ExerciseUploadRequest(BaseModel):
    user_id: str
    exercises_data: str  # JSON string of exercises


async def check_reset_questions():
    """Check if it's time to reset questions and do so if needed"""
    try:
        # Get the last reset time from database
        reset_record = reset_collection.find_one({"_id": "last_reset"})

        current_time = datetime.utcnow()
        should_reset = False

        if not reset_record:
            # First time, create the record
            reset_collection.insert_one(
                {"_id": "last_reset", "timestamp": current_time}
            )
            logger.info(f"Initialized question reset timer at {current_time}")
        else:
            last_reset_time = reset_record["timestamp"]
            # Check if reset interval has passed since last reset
            if current_time - last_reset_time >= timedelta(hours=RESET_INTERVAL):
                should_reset = True

        if should_reset:
            # Reset all users' question counters
            users_collection.update_many({}, {"$set": {"questions_used": 0}})

            # Reset all exercise-specific question counters
            exercises_collection.update_many({}, {"$set": {"questions_used": 0}})

            # Update the last reset time
            reset_collection.update_one(
                {"_id": "last_reset"}, {"$set": {"timestamp": current_time}}
            )
            logger.info(f"Questions reset for all users at {current_time}")
    except PyMongoError as e:
        logger.error(f"Database error in reset check: {str(e)}")
        # Continue operation even if reset check fails
        pass


async def get_reset_dependency():
    """Dependency to check for question reset before processing requests"""
    await check_reset_questions()
    return True


async def get_conversation_history(user_id, exercise_id=None, assignment_id=None):
    """Retrieve conversation history for a user and specific exercise/assignment from database"""
    try:
        query = {"user_id": user_id}
        if exercise_id:
            query["exercise_id"] = exercise_id
        if assignment_id:
            query["assignment_id"] = assignment_id

        conversation = conversation_collection.find_one(query)
        if conversation:
            return conversation.get("messages", [])
        else:
            # Initialize empty conversation history
            new_record = {
                "user_id": user_id,
                "messages": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            if exercise_id:
                new_record["exercise_id"] = exercise_id
            if assignment_id:
                new_record["assignment_id"] = assignment_id

            conversation_collection.insert_one(new_record)
            return []
    except PyMongoError as e:
        logger.error(f"Error retrieving conversation history: {str(e)}")
        return []  # Return empty history on error


async def update_conversation_history(user_id, prompt, response, exercise_id=None, assignment_id=None):
    """Update conversation history in database and trim if needed"""
    try:
        # Build the query
        query = {"user_id": user_id}
        if exercise_id:
            query["exercise_id"] = exercise_id
        if assignment_id:
            query["assignment_id"] = assignment_id

        # Get user information for username
        user = users_collection.find_one({"_id": user_id})
        username = user.get("username", user_id) if user else user_id
        
        # Add new messages to history
        conversation_collection.update_one(
            query,
            {
                "$push": {
                    "messages": {
                        "$each": [
                            {"role": "user", "content": prompt},
                            {"role": "assistant", "content": response},
                        ]
                    }
                },
                "$set": {"updated_at": datetime.utcnow()},
            },
            upsert=True,
        )

        # Store in chat history collection if exercise and assignment IDs are provided
        if exercise_id and assignment_id:
            current_time = datetime.utcnow()
            # Check if a chat history record exists
            chat_history_query = {
                "user_id": user_id,
                "exercise_id": exercise_id,
                "assignment_id": assignment_id
            }
            
            # Create student message
            student_message = {
                "role": "student",
                "content": prompt,
                "timestamp": current_time
            }
            
            # Create assistant message
            assistant_message = {
                "role": "assistant",
                "content": response,
                "timestamp": current_time
            }
            
            # Update or create chat history
            chat_history_collection.update_one(
                chat_history_query,
                {
                    "$push": {
                        "messages": {
                            "$each": [student_message, assistant_message]
                        }
                    },
                    "$set": {
                        "updated_at": current_time,
                        "username": username
                    },
                    "$setOnInsert": {
                        "created_at": current_time,
                        "id": str(datetime.now().timestamp())
                    }
                },
                upsert=True
            )

        # Trim conversation if it exceeds maximum length
        conversation_collection.update_one(
            query,
            [
                {
                    "$set": {
                        "messages": {
                            "$slice": ["$messages", -MAX_CONVERSATION_LENGTH * 2]
                        }
                    }
                }
            ],
        )
    except PyMongoError as e:
        logger.error(f"Error updating conversation history: {str(e)}")


@router.post("/upload-exercises")
async def upload_exercises(request: ExerciseUploadRequest):
    """Upload exercises in JSON format and initialize exercise-specific quota tracking"""
    user_id = request.user_id

    try:
        # Parse the exercises JSON
        exercises_data = json.loads(request.exercises_data)

        # Count number of exercises
        exercise_count = len(exercises_data)

        # Store exercises for this user
        for exercise in exercises_data:
            # Check if this exercise is already tracked
            exercise_record = exercises_collection.find_one(
                {"user_id": user_id, "exercise_id": str(exercise["id"])}
            )

            if not exercise_record:
                # Create a new record with default quota
                exercises_collection.insert_one(
                    {
                        "user_id": user_id,
                        "exercise_id": str(exercise["id"]),
                        "questions_used": 0,
                        "max_questions": DEFAULT_MAX_QUESTIONS,
                        "title": exercise.get("title", f"Exercise {exercise['id']}"),
                        "created_at": datetime.utcnow(),
                    }
                )

        return {
            "success": True,
            "exercise_count": exercise_count,
            "message": f"Successfully uploaded {exercise_count} exercises with quotas initialized",
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON data for exercises")
    except PyMongoError as e:
        logger.error(f"Database error in upload exercises endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operation failed")
    except Exception as e:
        logger.error(f"Unexpected error in upload exercises endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def ai_chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    reset_checked: bool = Depends(get_reset_dependency),
):
    user_id = request.user_id
    prompt = request.prompt
    exercise_id = request.exercise_id
    assignment_id = request.assignment_id

    if not user_id or not prompt:
        raise HTTPException(status_code=400, detail="User ID and prompt are required.")

    # First check if user exists
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            logger.warning(f"User not found: {user_id}")
            raise HTTPException(status_code=404, detail="User not found.")

        # Define exercise tracking key - include assignment context if available
        exercise_key = f"{assignment_id}_{exercise_id}" if assignment_id and exercise_id else exercise_id

        # If exercise_id is provided, check if the user has questions left for this exercise
        if exercise_key:
            exercise_record = exercises_collection.find_one({
                "user_id": user_id, 
                "exercise_key": exercise_key
            })

            if not exercise_record:
                # Create a new exercise record with default quota
                exercise_record = {
                    "user_id": user_id,
                    "exercise_key": exercise_key,
                    "exercise_id": exercise_id,
                    "assignment_id": assignment_id,
                    "questions_used": 0,
                    "max_questions": DEFAULT_MAX_QUESTIONS,
                    "created_at": datetime.utcnow(),
                }
                exercises_collection.insert_one(exercise_record)

            questions_used = exercise_record.get("questions_used", 0)
            max_questions = exercise_record.get("max_questions", DEFAULT_MAX_QUESTIONS)

            if questions_used >= max_questions:
                logger.info(
                    f"Exercise question limit reached for user: {user_id}, exercise_key: {exercise_key}"
                )
                raise HTTPException(
                    status_code=403,
                    detail=f"Question limit reached for exercise {exercise_id}.",
                )

            # Increment the questions_used counter for this exercise
            exercises_collection.update_one(
                {"user_id": user_id, "exercise_key": exercise_key},
                {"$inc": {"questions_used": 1}},
            )

        # If no exercise_id, use the global question limit
        else:
            questions_used = user.get("questions_used", 0)
            max_questions = DEFAULT_MAX_QUESTIONS

            if questions_used >= max_questions:
                logger.info(f"Global question limit reached for user: {user_id}")
                raise HTTPException(status_code=403, detail="Question limit reached.")

            # Increment the global questions_used counter
            users_collection.update_one(
                {"_id": ObjectId(user_id)}, {"$inc": {"questions_used": 1}}
            )

        # Get conversation history from database (exercise-specific if provided)
        conversation_history = await get_conversation_history(user_id, exercise_id, assignment_id)

        # Capture response for storage
        response_content = []

        async def response_generator():
            async for chunk in chat(prompt, user_id, conversation_history):
                response_content.append(chunk)
                yield chunk

            # After generating the full response, store it in conversation history
            full_response = "".join(response_content)
            background_tasks.add_task(
                update_conversation_history, user_id, prompt, full_response, exercise_id, assignment_id
            )

        return StreamingResponse(response_generator(), media_type="text/plain")

    except PyMongoError as e:
        logger.error(f"Database error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operation failed")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Unexpected error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/questions/remaining")
async def get_remaining_questions(
    user_id: str,
    exercise_id: str = None,
    assignment_id: str = None,
    reset_checked: bool = Depends(get_reset_dependency),
):
    try:
        # Get the reset time info
        reset_record = reset_collection.find_one({"_id": "last_reset"})
        if reset_record:
            last_reset_time = reset_record["timestamp"]
            next_reset = last_reset_time + timedelta(hours=RESET_INTERVAL)
            now = datetime.utcnow()
            hours_until_reset = max(0, (next_reset - now).total_seconds() / 3600)
        else:
            hours_until_reset = RESET_INTERVAL

        # Define exercise tracking key based on both assignment and exercise
        exercise_key = f"{assignment_id}_{exercise_id}" if assignment_id and exercise_id else exercise_id

        # If exercise_key is available, get exercise-specific questions
        if exercise_key:
            exercise_record = exercises_collection.find_one({
                "user_id": user_id, 
                "exercise_key": exercise_key
            })

            if not exercise_record:
                # Create a new record with default quota
                exercise_record = {
                    "user_id": user_id,
                    "exercise_key": exercise_key,
                    "exercise_id": exercise_id,
                    "assignment_id": assignment_id,
                    "questions_used": 0,
                    "max_questions": DEFAULT_MAX_QUESTIONS,
                    "created_at": datetime.utcnow(),
                }
                exercises_collection.insert_one(exercise_record)

            questions_used = exercise_record.get("questions_used", 0)
            max_questions = exercise_record.get("max_questions", DEFAULT_MAX_QUESTIONS)

            return {
                "questions_remaining": max(0, max_questions - questions_used),
                "max_questions": max_questions,
                "hours_until_reset": round(hours_until_reset, 1),
                "exercise_id": exercise_id,
                "assignment_id": assignment_id,
            }

        # Otherwise get global questions remaining
        else:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if not user:
                raise HTTPException(status_code=404, detail="User not found.")

            questions_used = user.get("questions_used", 0)
            questions_remaining = max(0, DEFAULT_MAX_QUESTIONS - questions_used)

            return {
                "questions_remaining": questions_remaining,
                "max_questions": DEFAULT_MAX_QUESTIONS,
                "hours_until_reset": round(hours_until_reset, 1),
            }
    except PyMongoError as e:
        logger.error(f"Database error in remaining questions endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operation failed")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Unexpected error in remaining questions endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/questions/reset")
async def reset_questions(request: QuestionsRequest):
    user_id = request.user_id
    exercise_id = request.exercise_id
    assignment_id = request.assignment_id

    try:
        # If exercise_id is provided, reset only that exercise's counter
        if exercise_id:
            result = exercises_collection.update_one(
                {"user_id": user_id, "exercise_id": exercise_id},
                {"$set": {"questions_used": 0}},
            )

            if result.matched_count == 0:
                # Create a new record with zero questions used
                exercises_collection.insert_one(
                    {
                        "user_id": user_id,
                        "exercise_id": exercise_id,
                        "questions_used": 0,
                        "max_questions": DEFAULT_MAX_QUESTIONS,
                        "created_at": datetime.utcnow(),
                    }
                )

            logger.info(
                f"Questions manually reset for user: {user_id}, exercise: {exercise_id}"
            )
            return {
                "success": True,
                "message": f"Questions counter reset successfully for exercise {exercise_id}.",
            }

        # Otherwise reset the global counter
        else:
            result = users_collection.update_one(
                {"_id": ObjectId(user_id)}, {"$set": {"questions_used": 0}}
            )
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="User not found.")
            logger.info(f"Questions manually reset for user: {user_id}")
            return {"success": True, "message": "Questions counter reset successfully."}

    except PyMongoError as e:
        logger.error(f"Database error in reset questions endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operation failed")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Unexpected error in reset questions endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/skill-level/update")
async def update_skill_level(request: SkillLevelRequest):
    """Update a user's skill level"""
    user_id = request.user_id
    skill_level = request.skill_level

    # Validate skill level
    valid_levels = ["beginner", "intermediate", "advanced"]
    if skill_level not in valid_levels:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid skill level. Must be one of: {', '.join(valid_levels)}",
        )

    try:
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": {"skill_level": skill_level}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found.")

        logger.info(f"Skill level updated for user {user_id} to {skill_level}")
        return {
            "success": True,
            "message": f"Skill level updated to {skill_level} successfully.",
        }
    except PyMongoError as e:
        logger.error(f"Database error in update skill level endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operation failed")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Unexpected error in update skill level endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/reset-all-questions")
async def admin_reset_all_questions():
    try:
        users_collection.update_many({}, {"$set": {"questions_used": 0}})
        exercises_collection.update_many({}, {"$set": {"questions_used": 0}})
        reset_collection.update_one(
            {"_id": "last_reset"},
            {"$set": {"timestamp": datetime.utcnow()}},
            upsert=True,
        )
        logger.info("Admin manually reset all user question counters")
        return {
            "success": True,
            "message": "All user question counters reset successfully.",
        }
    except PyMongoError as e:
        logger.error(f"Database error in admin reset endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operation failed")
    except Exception as e:
        logger.error(f"Unexpected error in admin reset endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conversations/{user_id}")
async def clear_conversation_history(
    user_id: str, 
    exercise_id: str = None,
    assignment_id: str = None
):
    """Delete the conversation history for a specific user and optional exercise/assignment"""
    try:
        query = {"user_id": user_id}
        if exercise_id:
            query["exercise_id"] = exercise_id
        if assignment_id:
            query["assignment_id"] = assignment_id

        result = conversation_collection.delete_one(query)

        if result.deleted_count == 0:
            return {
                "success": False,
                "message": "No conversation history found to delete.",
            }

        logger.info(
            f"Conversation history deleted for user: {user_id}, exercise: {exercise_id}, assignment: {assignment_id}"
        )

        return {
            "success": True,
            "message": "Conversation history deleted successfully.",
        }
    except PyMongoError as e:
        logger.error(f"Database error in delete conversation endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Database operation failed")
    except Exception as e:
        logger.error(f"Unexpected error in delete conversation endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations")
async def get_conversations(
    user_id: str, 
    exercise_id: str = None,
    assignment_id: str = None
):
    """
    Retrieve conversation history for a user (and optionally for a specific exercise/assignment).
    """
    try:
        messages = await get_conversation_history(user_id, exercise_id, assignment_id)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint to verify the API and database are working"""
    try:
        # Check database connection
        db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")


@router.get("/chat-history")
async def get_chat_history(
    user_id: str = None,
    assignment_id: str = None,
    exercise_id: str = None
):
    """Retrieve chat history for a specific assignment exercise
    
    If user_id is provided, returns chat history for that specific user.
    If only assignment_id and exercise_id are provided, returns chat histories for all users for that assignment exercise.
    """
    try:
        # Print debugging info
        print(f"Fetching chat history with params: user_id={user_id}, assignment_id={assignment_id}, exercise_id={exercise_id}")
        
        # Build the query
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        
        if assignment_id:
            query["assignment_id"] = assignment_id
            
        if exercise_id:
            query["exercise_id"] = exercise_id
            
        # Print the final query
        print(f"MongoDB query: {query}")
            
        # Return empty list if no query parameters are provided
        if not query:
            print("No query parameters provided, returning empty result")
            return {"histories": []}
        
        # Log the collection we're using
        print(f"Using collection: {chat_history_collection.name}")
        print(f"Collection count: {await chat_history_collection.count_documents({})}")
            
        # Retrieve chat histories
        chat_histories = list(chat_history_collection.find(query))
        print(f"Found {len(chat_histories)} chat history records")
        
        # If no results with the exact query, try a more flexible approach
        if len(chat_histories) == 0:
            print("No results with exact query, trying more flexible approach")
            
            # Try with just assignment_id if both assignment_id and exercise_id were provided
            if assignment_id and exercise_id:
                flexible_query = {"assignment_id": assignment_id}
                print(f"Trying with just assignment_id: {flexible_query}")
                chat_histories = list(chat_history_collection.find(flexible_query))
                print(f"Found {len(chat_histories)} records with flexible query")
                
                # Filter in memory by exercise_id
                if len(chat_histories) > 0:
                    chat_histories = [h for h in chat_histories if str(h.get("exercise_id", "")) == str(exercise_id)]
                    print(f"After filtering by exercise_id, found {len(chat_histories)} records")
        
        # Print the first document if available for debugging
        if len(chat_histories) > 0:
            print(f"First document: {chat_histories[0].get('_id')} - User: {chat_histories[0].get('user_id')}")
            print(f"Messages count: {len(chat_histories[0].get('messages', []))}")
            
            # Check if messages array is populated
            first_messages = chat_histories[0].get('messages', [])
            if first_messages:
                print(f"First message: {first_messages[0] if len(first_messages) > 0 else 'No messages'}")
            else:
                print("First document has no messages")
        
        # Format for response
        formatted_histories = []
        for history in chat_histories:
            # Skip entries with no messages
            if 'messages' not in history or not history['messages']:
                print(f"Skipping document {history.get('_id')} - no messages found")
                continue
                
            # Create a formatted copy
            formatted_history = dict(history)
            
            # Convert ObjectId to string
            if "_id" in formatted_history:
                formatted_history["_id"] = str(formatted_history["_id"])
                
            # Convert datetime objects to strings
            if "created_at" in formatted_history and isinstance(formatted_history["created_at"], datetime):
                formatted_history["created_at"] = formatted_history["created_at"].isoformat()
                
            if "updated_at" in formatted_history and isinstance(formatted_history["updated_at"], datetime):
                formatted_history["updated_at"] = formatted_history["updated_at"].isoformat()
                
            # Format message timestamps
            if "messages" in formatted_history:
                for message in formatted_history["messages"]:
                    if "timestamp" in message and isinstance(message["timestamp"], datetime):
                        message["timestamp"] = message["timestamp"].isoformat()
            
            formatted_histories.append(formatted_history)
            
        print(f"Returning {len(formatted_histories)} formatted history records")
        if len(formatted_histories) > 0:
            print(f"Sample message count in first history: {len(formatted_histories[0].get('messages', []))}")
        
        return {"histories": formatted_histories}
    except PyMongoError as e:
        logger.error(f"Error retrieving chat history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in get_chat_history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/chat-history-direct")
async def get_chat_history_direct(
    user_id: str = None,
    assignment_id: str = None,
    exercise_id: str = None
):
    """Simplified endpoint to retrieve chat history directly
    
    Returns chat history with minimal processing for debugging
    """
    try:
        # Print debugging info
        print(f"Direct fetch chat history with params: user_id={user_id}, assignment_id={assignment_id}, exercise_id={exercise_id}")
        
        # Build the query
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        
        if assignment_id:
            query["assignment_id"] = assignment_id
            
        if exercise_id:
            query["exercise_id"] = exercise_id
        
        print(f"Direct MongoDB query: {query}")
        
        # Get all results from the collection if query is empty
        if not query:
            all_records = list(chat_history_collection.find({}))
            print(f"Returning all {len(all_records)} chat history records")
            
            # Convert ObjectId to strings
            for record in all_records:
                record['_id'] = str(record['_id'])
                
            return {"direct_histories": all_records, "count": len(all_records)}
        
        # Find records
        records = list(chat_history_collection.find(query))
        print(f"Found {len(records)} direct chat history records")
        
        # Process records
        result_records = []
        for record in records:
            # Convert ObjectId to string
            record['_id'] = str(record['_id'])
            
            # Convert datetime objects
            for field in ['created_at', 'updated_at']:
                if field in record and isinstance(record[field], datetime):
                    record[field] = record[field].isoformat()
                    
            # Convert message timestamps
            if 'messages' in record:
                for msg in record['messages']:
                    if 'timestamp' in msg and isinstance(msg['timestamp'], datetime):
                        msg['timestamp'] = msg['timestamp'].isoformat()
                        
            result_records.append(record)
            
        return {
            "direct_histories": result_records, 
            "count": len(result_records),
            "query": query
        }
            
    except Exception as e:
        logger.error(f"Error in direct chat history: {str(e)}")
        return {
            "error": str(e),
            "query": query,
            "trace": str(e.__traceback__)
        }


@router.get("/chat-history-simple")
async def get_chat_history_simple(
    user_id: str = None,
    assignment_id: str = None,
    exercise_id: str = None
):
    """Simple endpoint to retrieve chat history directly without complex processing
    
    This is a fallback endpoint that returns raw chat history data with minimal processing
    """
    try:
        # Log request parameters
        print(f"[SIMPLE ENDPOINT] Request params: user_id={user_id}, assignment_id={assignment_id}, exercise_id={exercise_id}")
        
        # Test MongoDB connection first
        try:
            db.command("ping")
            print("[SIMPLE ENDPOINT] MongoDB connection successful")
        except Exception as db_error:
            print(f"[SIMPLE ENDPOINT] MongoDB connection error: {str(db_error)}")
            return {
                "success": False,
                "error": f"MongoDB connection error: {str(db_error)}",
                "collection": "chat_histories"
            }
        
        # List all collections for debugging
        collections = db.list_collection_names()
        print(f"[SIMPLE ENDPOINT] Available collections: {collections}")
        
        # Log collection status
        count = 0
        try:
            count = chat_history_collection.count_documents({})
            print(f"[SIMPLE ENDPOINT] Collection count: {count}")
        except Exception as count_error:
            print(f"[SIMPLE ENDPOINT] Error counting documents: {str(count_error)}")
        
        # Try to get one document for debugging
        try:
            sample_doc = chat_history_collection.find_one({})
            if sample_doc:
                print(f"[SIMPLE ENDPOINT] Sample document _id: {sample_doc.get('_id')}")
                print(f"[SIMPLE ENDPOINT] Sample document fields: {list(sample_doc.keys())}")
                print(f"[SIMPLE ENDPOINT] Exercise ID from sample: {sample_doc.get('exercise_id')}")
                print(f"[SIMPLE ENDPOINT] Exercise ID type: {type(sample_doc.get('exercise_id'))}")
            else:
                print("[SIMPLE ENDPOINT] No documents found in collection")
        except Exception as sample_error:
            print(f"[SIMPLE ENDPOINT] Error getting sample document: {str(sample_error)}")
        
        # Build simple query with flexible type handling
        query = {}
        if user_id:
            query["user_id"] = user_id
        if assignment_id:
            query["assignment_id"] = assignment_id
            
        # Special handling for exercise_id
        if exercise_id:
            # We won't add it to the query yet - we'll handle it with an in-memory filter
            print(f"[SIMPLE ENDPOINT] Will filter for exercise_id={exercise_id} (type: {type(exercise_id)})")
            
        print(f"[SIMPLE ENDPOINT] MongoDB query: {query}")
        
        # If no query, return limited results
        if not query:
            print("[SIMPLE ENDPOINT] Empty query - returning all documents (limited to 10)")
            try:
                results = list(chat_history_collection.find({}).limit(10))
            except Exception as find_error:
                print(f"[SIMPLE ENDPOINT] Error fetching all documents: {str(find_error)}")
                results = []
        else:
            # Find matching documents
            try:
                results = list(chat_history_collection.find(query))
                print(f"[SIMPLE ENDPOINT] Found {len(results)} documents with query")
            except Exception as query_error:
                print(f"[SIMPLE ENDPOINT] Error with query: {str(query_error)}")
                results = []
        
        # If exercise_id is provided, filter the results in memory
        if exercise_id and results:
            original_count = len(results)
            
            # Filter based on string comparison of exercise_id
            filtered_results = []
            for doc in results:
                doc_exercise_id = doc.get('exercise_id')
                
                # Compare as strings
                if str(doc_exercise_id) == str(exercise_id):
                    filtered_results.append(doc)
                    print(f"[SIMPLE ENDPOINT] Matched document with exercise_id={doc_exercise_id}")
            
            print(f"[SIMPLE ENDPOINT] Filtered from {original_count} to {len(filtered_results)} documents")
            results = filtered_results
        
        # Convert ObjectId to string in results
        formatted_results = []
        for doc in results:
            try:
                # Convert ObjectId to string
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                    
                # Format timestamps
                for field in ["created_at", "updated_at"]:
                    if field in doc and isinstance(doc[field], datetime):
                        doc[field] = doc[field].isoformat()
                
                # Format messages
                if "messages" in doc:
                    for msg in doc["messages"]:
                        if "timestamp" in msg and isinstance(msg["timestamp"], datetime):
                            msg["timestamp"] = msg["timestamp"].isoformat()
                
                formatted_results.append(doc)
            except Exception as format_error:
                print(f"[SIMPLE ENDPOINT] Error formatting document: {str(format_error)}")
        
        # Return results with detailed diagnostics
        return {
            "success": True,
            "message": f"Found {len(formatted_results)} chat history records",
            "mongo_ok": True,
            "collection_count": count,
            "results": formatted_results,
            "query": query,
            "request_params": {
                "user_id": user_id,
                "assignment_id": assignment_id,
                "exercise_id": exercise_id
            }
        }
    except Exception as e:
        print(f"[SIMPLE ENDPOINT] Error: {str(e)}")
        # Don't raise an exception - return error details instead
        return {
            "success": False,
            "error": str(e),
            "query": locals().get('query', {}),
            "trace": str(e.__traceback__.tb_frame)
        }
