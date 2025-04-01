from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class User(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    name: Optional[str] = None
    skill_level: Optional[str] = None
    role: Optional[str] = "student"  # Default role is student
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserInDB(BaseModel):
    username: str
    hashed_password: str
    skill_level: Optional[str] = None
    role: str = "student"  # Add role field


class CodeSubmission(BaseModel):
    code: str
    timeout: int = 5  # default 5 seconds


class ExecutionResult(BaseModel):
    output: str
    error: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    token: str


class Code(BaseModel):
    code: str


class CodeHistory(BaseModel):
    user_id: Optional[str] = None  # Will be set by the server
    username: Optional[str] = None  # Store the username for easier identification
    problem_index: Optional[int] = None
    test_type: Optional[str] = None
    code: str  # Only required field from client
    output: Optional[str] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None
    is_submission: Optional[bool] = False
    action_type: Optional[str] = "run"
    created_at: Optional[datetime] = None  # Will be set by the server
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": "user123",
                "username": "johndoe",
                "problem_index": 1,
                "test_type": "code",
                "code": "print('Hello, world!')",
                "output": "Hello, world!",
                "error": "",
                "execution_time": 0.05,
                "is_submission": False,
                "action_type": "run",
                "created_at": "2023-03-03T12:00:00"
            }
        }


class SkillLevel(BaseModel):
    skill_level: str


class KeystrokeData(BaseModel):
    code: str
    problem_index: int
    test_type: str
    cursor_position: Optional[dict] = None
    timestamp: Optional[datetime] = None
    user_id: Optional[str] = None
