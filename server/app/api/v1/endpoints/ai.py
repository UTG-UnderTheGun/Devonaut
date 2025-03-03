from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from app.services.chat_service import chat
import asyncio
from pymongo import MongoClient
from bson import ObjectId
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
MAX_QUESTIONS = int(os.getenv("MAX_QUESTIONS", "10"))  # Default to 10 questions

# MongoDB connection
client = MongoClient(MONGO_URI)
db = client["mydatabase"]
users_collection = db["users"]

# Create router
router = APIRouter()
memory = {}


class ChatRequest(BaseModel):
    user_id: str
    prompt: str


class QuestionsRequest(BaseModel):
    user_id: str


@router.post("/chat")
async def ai_chat(request: ChatRequest):
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
async def get_remaining_questions(user_id: str):
    try:
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        questions_used = user.get("questions_used", 0)
        questions_remaining = max(0, MAX_QUESTIONS - questions_used)

        return {
            "questions_remaining": questions_remaining,
            "max_questions": MAX_QUESTIONS,
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

