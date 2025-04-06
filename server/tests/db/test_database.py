import pytest
from motor.motor_asyncio import AsyncIOMotorDatabase
import mongomock
import asyncio
from datetime import datetime
from app.db.schemas import User


@pytest.mark.asyncio
async def test_database_connection(test_db):
    """Test connecting to the MongoDB test database"""
    # Verify we have a valid database instance
    assert isinstance(test_db, mongomock.Database)
    
    # Test we can list collections
    collections = await test_db.list_collection_names()
    assert "users" in collections
    assert "assignments" in collections
    assert "submissions" in collections
    assert "code_history" in collections


@pytest.mark.asyncio
async def test_insert_and_find_user(test_db):
    """Test inserting and finding a user in the database"""
    # Create a test user
    test_user = {
        "username": "dbtest",
        "hashed_password": "hashed_test_password",
        "email": "dbtest@example.com",
        "role": "student",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    # Insert the user
    await test_db.users.insert_one(test_user)
    
    # Retrieve the user
    found_user = await test_db.users.find_one({"username": "dbtest"})
    
    assert found_user is not None
    assert found_user["username"] == "dbtest"
    assert found_user["email"] == "dbtest@example.com"
    assert found_user["role"] == "student"


@pytest.mark.asyncio
async def test_update_user(test_db):
    """Test updating a user in the database"""
    # Create and insert a test user
    test_user = {
        "username": "update_test",
        "hashed_password": "hashed_test_password",
        "email": "update@example.com",
        "role": "student",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    await test_db.users.insert_one(test_user)
    
    # Update the user
    update_result = await test_db.users.update_one(
        {"username": "update_test"},
        {"$set": {"email": "updated@example.com", "name": "Updated Name"}}
    )
    
    assert update_result.modified_count == 1
    
    # Verify the update
    updated_user = await test_db.users.find_one({"username": "update_test"})
    assert updated_user["email"] == "updated@example.com"
    assert updated_user["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_user(test_db):
    """Test deleting a user from the database"""
    # Create and insert a test user
    test_user = {
        "username": "delete_test",
        "hashed_password": "hashed_test_password",
        "email": "delete@example.com",
        "role": "student",
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    await test_db.users.insert_one(test_user)
    
    # Delete the user
    delete_result = await test_db.users.delete_one({"username": "delete_test"})
    
    assert delete_result.deleted_count == 1
    
    # Verify the user no longer exists
    deleted_user = await test_db.users.find_one({"username": "delete_test"})
    assert deleted_user is None


@pytest.mark.asyncio
async def test_query_multiple_users(test_db):
    """Test querying for multiple users"""
    # Insert multiple test users
    test_users = [
        {
            "username": "query_test1",
            "hashed_password": "hashed_test_password",
            "email": "query1@example.com",
            "role": "student",
            "section": "A",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "username": "query_test2",
            "hashed_password": "hashed_test_password",
            "email": "query2@example.com",
            "role": "student",
            "section": "A",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        },
        {
            "username": "query_test3",
            "hashed_password": "hashed_test_password",
            "email": "query3@example.com",
            "role": "teacher",
            "section": "B",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
    ]
    
    await test_db.users.insert_many(test_users)
    
    # Query for section A students
    section_a_cursor = test_db.users.find({"section": "A"})
    section_a_users = []
    async for user in section_a_cursor:
        section_a_users.append(user)
    
    assert len(section_a_users) == 2
    
    # Query for student roles
    student_cursor = test_db.users.find({"role": "student"})
    student_count = 0
    async for _ in student_cursor:
        student_count += 1
    
    assert student_count >= 2  # There might be other student users from other tests
    
    # Query for a non-existent section
    section_z_cursor = test_db.users.find({"section": "Z"})
    section_z_users = []
    async for user in section_z_cursor:
        section_z_users.append(user)
    
    assert len(section_z_users) == 0