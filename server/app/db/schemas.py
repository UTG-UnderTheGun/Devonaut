from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class User(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    name: Optional[str] = None
    skill_level: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserInDB(BaseModel):
    username: str
    hashed_password: str
    skill_level: Optional[str] = None


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


class SkillLevel(BaseModel):
    skill_level: str
