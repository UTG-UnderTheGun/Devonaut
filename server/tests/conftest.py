import pytest
from typing import AsyncGenerator, Dict, Any
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
import mongomock
import asyncio
from datetime import datetime, timedelta
from app.main import app, CustomFastAPI
from app.core.security import create_access_token
from app.services.auth_service import get_password_hash


@pytest.fixture
def test_app():
    """Create a FastAPI test application"""
    return app


@pytest.fixture
def client(test_app):
    """Create a FastAPI TestClient"""
    with TestClient(test_app) as client:
        yield client


@pytest.fixture
async def mock_mongodb():
    """Create a mock MongoDB client for testing"""
    client = mongomock.MongoClient()
    db = client["test_db"]
    # Add the client to the app
    app.mongodb_client = AsyncIOMotorClient()
    app.mongodb = app.mongodb_client["test_db"]
    # Replace the app's MongoDB with the mock
    app.mongodb_client = client
    app.mongodb = db
    yield db
    client.close()


@pytest.fixture
async def test_db(mock_mongodb):
    """Create test database collections and return the database"""
    # Create collections
    await mock_mongodb.create_collection("users")
    await mock_mongodb.create_collection("assignments")
    await mock_mongodb.create_collection("submissions")
    await mock_mongodb.create_collection("code_history")
    yield mock_mongodb


@pytest.fixture
async def setup_test_data(test_db):
    """Insert test data into the test database"""
    # Insert a test user
    hashed_password = get_password_hash("testpassword")
    test_user = {
        "username": "testuser",
        "hashed_password": hashed_password,
        "email": "test@example.com",
        "name": "Test User",
        "student_id": "6422040001",
        "section": "1",
        "role": "student",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    await test_db.users.insert_one(test_user)
    
    # Insert a test teacher
    teacher_user = {
        "username": "teacher",
        "hashed_password": hashed_password,
        "email": "teacher@example.com",
        "name": "Test Teacher",
        "role": "teacher",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    await test_db.users.insert_one(teacher_user)
    
    # Insert a test assignment
    test_assignment = {
        "id": "test_assignment_id",
        "title": "Test Assignment",
        "chapter": "Test Chapter",
        "description": "This is a test assignment",
        "dueDate": datetime.now() + timedelta(days=7),
        "points": 10,
        "exercises": [
            {
                "id": 1,
                "title": "Test Exercise",
                "description": "This is a test exercise",
                "type": "coding",
                "points": 5,
                "starter_code": "def test_function():\n    pass",
                "test_cases": "assert test_function() == None"
            }
        ],
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "created_by": "teacher"
    }
    await test_db.assignments.insert_one(test_assignment)
    
    yield test_db


@pytest.fixture
def auth_headers() -> Dict[str, Any]:
    """Return authentication headers with a test JWT token"""
    access_token = create_access_token(data={"sub": "testuser", "role": "student"})
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def teacher_auth_headers() -> Dict[str, Any]:
    """Return authentication headers with a teacher JWT token"""
    access_token = create_access_token(data={"sub": "teacher", "role": "teacher"})
    return {"Authorization": f"Bearer {access_token}"}
