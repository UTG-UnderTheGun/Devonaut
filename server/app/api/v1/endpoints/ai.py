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
