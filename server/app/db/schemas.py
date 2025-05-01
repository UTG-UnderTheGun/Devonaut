from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime


class User(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    name: Optional[str] = None
    student_id: Optional[str] = None
    section: Optional[str] = None
    skill_level: Optional[str] = None
    role: Optional[str] = "student"  # Default role is student
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserInDB(BaseModel):
    username: str
    hashed_password: str
    name: Optional[str] = None
    student_id: Optional[str] = None  
    section: Optional[str] = None
    skill_level: Optional[str] = None
    role: str = "student"  # Add role field


class UserProfile(BaseModel):
    name: str
    student_id: str
    section: str


class ExerciseBase(BaseModel):
    id: int
    title: str
    description: str
    type: str  # "coding", "explain", "fill", or "output"
    points: Optional[int] = 1


class OutputExercise(ExerciseBase):
    code: str
    expected_output: str


class CodingExercise(ExerciseBase):
    starter_code: Optional[str] = ""
    test_cases: Optional[str] = ""
    expected_output: Optional[str] = ""
    time_limit: Optional[int] = 5  # seconds


class ExplainExercise(ExerciseBase):
    code: Optional[str] = ""
    expected_explanation: Optional[List[str]] = []


class FillExercise(ExerciseBase):
    code: str
    blanks: List[Dict[str, Any]]  # positions and possible answers


class Exercise(BaseModel):
    id: int
    title: str
    description: str
    type: str  # "coding", "explain", "fill", or "output"
    points: Optional[int] = 1
    
    # Fields for coding exercises
    starter_code: Optional[str] = None
    test_cases: Optional[str] = None
    expected_output: Optional[str] = None
    time_limit: Optional[int] = None
    
    # Fields for explain and output exercises
    code: Optional[str] = None
    
    # Fields for explain exercises
    expected_explanation: Optional[List[str]] = None
    
    # Fields for fill exercises
    blanks: Optional[List[Dict[str, Any]]] = None
    
    # User answer tracking
    userAnswers: Optional[Dict[str, Any]] = None


class AssignmentStats(BaseModel):
    total_students: int
    submissions: int
    pending_review: int
    average_score: Optional[float] = None


class Assignment(BaseModel):
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    title: str
    chapter: str
    description: Optional[str] = ""
    dueDate: datetime
    points: int
    exercises: List[Exercise]
    created_at: Optional[datetime] = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = Field(default_factory=datetime.now)
    created_by: Optional[str] = None  # teacher username
    stats: Optional[AssignmentStats] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "1679548532.123456",
                "title": "Python Loops and Control Flow",
                "chapter": "Chapter 3: Control Structures",
                "description": "Practice exercises on Python loops and conditional statements",
                "dueDate": "2023-05-15T23:59:59",
                "points": 20,
                "exercises": [
                    {
                        "id": 1,
                        "title": "For Loop Sum",
                        "description": "Write a function to calculate the sum of even numbers in a list",
                        "type": "coding",
                        "points": 5,
                        "starter_code": "def sum_even(numbers):\n    # Your code here\n    pass",
                        "test_cases": "assert sum_even([1,2,3,4,5,6]) == 12"
                    },
                    {
                        "id": 2,
                        "title": "Code Explanation",
                        "description": "Explain what this code does",
                        "type": "explain",
                        "points": 3,
                        "code": "x = [i for i in range(10) if i % 2 == 0]"
                    },
                    {
                        "id": 3,
                        "title": "Fill the Blanks",
                        "description": "Complete the code to implement a binary search",
                        "type": "fill",
                        "points": 4,
                        "code": "def binary_search(arr, x):\n    low = 0\n    high = ___\n    while low <= high:\n        mid = ___\n        if arr[mid] < x:\n            low = ___\n        elif arr[mid] > x:\n            high = ___\n        else:\n            return mid\n    return -1",
                        "blanks": [
                            {"position": 1, "options": ["len(arr)", "len(arr)-1", "len(arr)+1"]},
                            {"position": 2, "options": ["(low+high)//2", "low+high/2", "low+(high-low)//2"]}
                        ]
                    },
                    {
                        "id": 4,
                        "title": "Output Prediction",
                        "description": "What will this code output?",
                        "type": "output",
                        "code": "x = 3\ny = 5\na = x + y * (5 + 1)\nb = y + 16 // x\nprint(x, a, b)",
                        "expected_output": "3 33 10"
                    }
                ],
                "created_at": "2023-03-23T10:15:32",
                "updated_at": "2023-03-23T10:15:32",
                "created_by": "professor_smith",
                "stats": {
                    "total_students": 30,
                    "submissions": 25,
                    "pending_review": 5,
                    "average_score": 18.5
                }
            }
        }


class AssignmentCreate(BaseModel):
    title: str
    chapter: str
    description: Optional[str] = ""
    dueDate: datetime
    points: int
    exercises: List[Exercise]


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    chapter: Optional[str] = None
    description: Optional[str] = None
    dueDate: Optional[datetime] = None
    points: Optional[int] = None
    exercises: Optional[List[Exercise]] = None
    updated_at: datetime = Field(default_factory=datetime.now)


class AssignmentSummary(BaseModel):
    id: str
    title: str
    chapter: str
    dueDate: datetime
    points: int
    pending: int  # Number of pending submissions
    created_at: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "id": "1679548532.123456",
                "title": "Python Loops and Control Flow",
                "chapter": "Chapter 3: Control Structures",
                "dueDate": "2023-05-15T23:59:59",
                "points": 20,
                "pending": 5,
                "created_at": "2023-03-23T10:15:32"
            }
        }


class AssignmentSubmission(BaseModel):
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    assignment_id: str
    user_id: str
    username: Optional[str] = None
    answers: Dict[int, Any]  # exercise_id -> answer (could be code, text, or selected options)
    score: Optional[float] = None
    status: str = "pending"  # "pending", "graded", "late"
    submitted_at: datetime = Field(default_factory=datetime.now)
    graded_at: Optional[datetime] = None
    feedback: Optional[Dict[int, str]] = None  # exercise_id -> feedback
    comments: Optional[List[Dict[str, Any]]] = []  # List of comments on the submission
    
    class Config:
        schema_extra = {
            "example": {
                "id": "1679550000.123456",
                "assignment_id": "1679548532.123456",
                "user_id": "student123",
                "username": "john_doe",
                "answers": {
                    "1": "def sum_even(numbers):\n    return sum([n for n in numbers if n % 2 == 0])",
                    "2": "This code creates a list of all even numbers from 0 to 9 using list comprehension.",
                    "3": ["len(arr)-1", "(low+high)//2", "mid+1", "mid-1"],
                    "4": "3 33 10"
                },
                "score": 18,
                "status": "graded",
                "submitted_at": "2023-03-23T11:00:00",
                "graded_at": "2023-03-24T09:30:00",
                "feedback": {
                    "1": {"score": 5, "comments": [{"id": "1234567890", "user_id": "teacher123", "username": "Prof Smith", "role": "teacher", "text": "Good solution using list comprehension!", "timestamp": "2023-03-24T09:30:00"}]},
                    "2": {"score": 3, "comments": [{"id": "1234567891", "user_id": "teacher123", "username": "Prof Smith", "role": "teacher", "text": "Correct, but could be more detailed.", "timestamp": "2023-03-24T09:30:00"}]}
                },
                "comments": [
                    {
                        "id": "1234567892",
                        "user_id": "teacher123",
                        "username": "Prof Smith",
                        "role": "teacher",
                        "text": "Overall good work!",
                        "timestamp": "2023-03-24T09:30:00"
                    },
                    {
                        "id": "1234567893",
                        "user_id": "student123",
                        "username": "john_doe",
                        "role": "student",
                        "text": "Thank you professor!",
                        "timestamp": "2023-03-24T10:15:00"
                    }
                ]
            }
        }


class SubmissionGrading(BaseModel):
    score: float
    feedback: Dict[str, Any] = {}
    comments: Optional[List[Dict[str, Any]]] = []
    
    class Config:
        schema_extra = {
            "example": {
                "score": 18.5,
                "feedback": {
                    "1": {"score": 5, "text": "Excellent solution"},
                    "2": {"score": 3, "text": "Correct but incomplete"}
                },
                "comments": [
                    {"text": "Good effort on this assignment!"}
                ]
            }
        }


class Comment(BaseModel):
    text: str
    exercise_id: Optional[int] = None
    
    class Config:
        schema_extra = {
            "example": {
                "text": "Great job explaining the algorithm!",
                "exercise_id": 2  # If commenting on a specific exercise
            }
        }


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


class InputData(BaseModel):
    input: str
    user_id: Optional[str] = None


class CodeHistory(BaseModel):
    user_id: Optional[str] = None  # Will be set by the server
    username: Optional[str] = None  # Store the username for easier identification
    problem_index: Optional[int] = None
    exercise_id: Optional[str] = None  # Added to track specific exercise
    assignment_id: Optional[str] = None  # Added to track specific assignment
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
                "exercise_id": "exercise123",
                "assignment_id": "assignment456",
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
    exercise_id: Optional[str] = None  # Added to track specific exercise
    assignment_id: Optional[str] = None  # Added to track specific assignment
    test_type: str
    cursor_position: Optional[dict] = None
    timestamp: Optional[datetime] = None
    user_id: Optional[str] = None
    changes: Optional[List[Dict[str, Any]]] = None  # Track what lines changed
    
    class Config:
        # Allow extra fields to be flexible with client data
        extra = "allow"
        
        schema_extra = {
            "example": {
                "code": "print('Hello world')",
                "problem_index": 1,
                "exercise_id": "exercise123",
                "assignment_id": "assignment456",
                "test_type": "code",
                "cursor_position": {"lineNumber": 1, "column": 5},
                "timestamp": "2023-03-03T12:00:00",
                "user_id": "user123",
                "changes": [
                    {
                        "line": 1,
                        "previous": "print('Hello')",
                        "current": "print('Hello world')"
                    }
                ]
            }
        }
