from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from app.services.chat_service import chat
import asyncio
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv
import time
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
MAX_QUESTIONS = int(os.getenv("MAX_QUESTIONS", "10"))  # Default to 10 questions
RESET_INTERVAL = int(os.getenv("RESET_INTERVAL", "8"))  # Reset period in hours

# MongoDB connection
client = MongoClient(MONGO_URI)
db = client["mydatabase"]
users_collection = db["users"]
reset_collection = db["question_resets"]

# Create router
router = APIRouter()
memory = {}

# Track when questions were last reset
last_reset = None


class ChatRequest(BaseModel):
    user_id: str
    prompt: str


class QuestionsRequest(BaseModel):
    user_id: str


async def check_reset_questions():
    """Check if it's time to reset questions and do so if needed"""
    global last_reset

    # Get the last reset time from database
    reset_record = reset_collection.find_one({"_id": "last_reset"})

    current_time = datetime.utcnow()
    should_reset = False

    if not reset_record:
        # First time, create the record
        reset_collection.insert_one({"_id": "last_reset", "timestamp": current_time})
        last_reset = current_time
    else:
        last_reset_time = reset_record["timestamp"]
        # Check if 8 hours have passed since last reset
        if current_time - last_reset_time >= timedelta(hours=RESET_INTERVAL):
            should_reset = True

    if should_reset:
        # Reset all users' question counters
        users_collection.update_many({}, {"$set": {"questions_used": 0}})

        # Update the last reset time
        reset_collection.update_one(
            {"_id": "last_reset"}, {"$set": {"timestamp": current_time}}
        )
        last_reset = current_time
        print(f"Questions reset at {current_time}")


async def get_reset_dependency():
    """Dependency to check for question reset before processing requests"""
    await check_reset_questions()
    return True


@router.post("/chat")
async def ai_chat(
    request: ChatRequest, reset_checked: bool = Depends(get_reset_dependency)
):
    user_id = request.user_id
    prompt = request.prompt

    if not user_id or not prompt:
        raise HTTPException(status_code=400, detail="User ID and prompt are required.")

    # Check if user has questions left
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        questions_used = user.get("questions_used", 0)
        if questions_used >= MAX_QUESTIONS:
            raise HTTPException(status_code=403, detail="Question limit reached.")

        # Increment the questions_used counter
        users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$inc": {"questions_used": 1}}
        )

        # Initialize conversation memory if needed
        if user_id not in memory:
            memory[user_id] = []

        return StreamingResponse(
            chat(prompt, user_id, memory[user_id]), media_type="text/plain"
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/questions/remaining")
async def get_remaining_questions(
    user_id: str, reset_checked: bool = Depends(get_reset_dependency)
):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        questions_used = user.get("questions_used", 0)
        questions_remaining = max(0, MAX_QUESTIONS - questions_used)

        # Calculate time until next reset
        if last_reset:
            next_reset = last_reset + timedelta(hours=RESET_INTERVAL)
            now = datetime.utcnow()
            hours_until_reset = max(0, (next_reset - now).total_seconds() / 3600)
        else:
            hours_until_reset = RESET_INTERVAL

        return {
            "questions_remaining": questions_remaining,
            "max_questions": MAX_QUESTIONS,
            "hours_until_reset": round(hours_until_reset, 1),
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/questions/reset")
async def reset_questions(request: QuestionsRequest):
    user_id = request.user_id
    try:
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": {"questions_used": 0}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found.")
        return {"success": True, "message": "Questions counter reset successfully."}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


# Optional: Force immediate reset for all users
@router.post("/admin/reset-all-questions")
async def admin_reset_all_questions():
    try:
        users_collection.update_many({}, {"$set": {"questions_used": 0}})
        reset_collection.update_one(
            {"_id": "last_reset"},
            {"$set": {"timestamp": datetime.utcnow()}},
            upsert=True,
        )
        return {
            "success": True,
            "message": "All user question counters reset successfully.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

