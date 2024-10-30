from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from app.services.chat_service import chat  
import asyncio

router = APIRouter()

memory = {}

class ChatRequest(BaseModel):
    user_id: str  
    prompt: str

@router.post("/chat")
async def ai_chat(request: ChatRequest):
    user_id = request.user_id
    prompt = request.prompt

    if not user_id or not prompt:
        raise HTTPException(status_code=400, detail="User ID and prompt are required.")

    if user_id not in memory:
        memory[user_id] = []

    return StreamingResponse(chat(prompt, user_id, memory[user_id]), media_type="text/plain")
