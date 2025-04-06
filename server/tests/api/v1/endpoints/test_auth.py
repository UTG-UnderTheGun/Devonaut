import pytest
from fastapi.testclient import TestClient
from app.db.schemas import User


def test_register_user(client: TestClient, test_app):
    """Test user registration endpoint"""
    user_data = {
        "username": "newuser",
        "password": "password123",
        "email": "new@example.com",
        "name": "New User",
        "student_id": "6422040002",
        "section": "1"
    }
    
    response = client.post("/auth/register", json=user_data)
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "token_type" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_register_duplicate_user(client: TestClient, test_app):
    """Test registering a user with an existing username"""
    # First registration should succeed
    user_data = {
        "username": "duplicateuser",
        "password": "password123",
        "email": "duplicate@example.com"
    }
    
    client.post("/auth/register", json=user_data)
    
    # Second registration with same username should fail
    response = client.post("/auth/register", json=user_data)
    
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


def test_login_user(client: TestClient, test_app):
    """Test user login endpoint"""
    # Register a user first
    user_data = {
        "username": "loginuser",
        "password": "password123",
        "email": "login@example.com"
    }
    
    client.post("/auth/register", json=user_data)
    
    # Now try to login
    login_data = {
        "username": "loginuser",
        "password": "password123"
    }
    
    response = client.post("/auth/token", json=login_data)
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "token_type" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_login_invalid_credentials(client: TestClient, test_app):
    """Test login with invalid credentials"""
    login_data = {
        "username": "nonexistentuser",
        "password": "wrongpassword"
    }
    
    response = client.post("/auth/token", json=login_data)
    
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_logout(client: TestClient, test_app):
    """Test user logout endpoint"""
    response = client.post("/auth/logout")
    
    assert response.status_code == 200
    assert response.json() == {"message": "Logged out successfully"}
    
    # Check for cookie clearing
    assert "Set-Cookie" in response.headers
    assert "access_token=;" in response.headers["Set-Cookie"]
