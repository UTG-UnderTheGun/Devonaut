import pytest
from datetime import datetime, timedelta
from jose import jwt
from app.core.security import create_access_token, verify_password, get_password_hash
from app.services.auth_service import authenticate_user, create_refresh_token


def test_password_hashing():
    """Test password hashing and verification"""
    password = "testpassword"
    hashed = get_password_hash(password)
    
    # Hashed password should be different from the original
    assert hashed != password
    
    # Verification should work
    assert verify_password(password, hashed) is True
    
    # Wrong password should fail verification
    assert verify_password("wrongpassword", hashed) is False


def test_create_access_token():
    """Test JWT token creation and verification"""
    data = {"sub": "testuser", "role": "student"}
    token = create_access_token(data=data)
    
    # Token should be a string
    assert isinstance(token, str)
    
    # Should be able to decode the token
    from app.core.config import settings
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    
    assert payload["sub"] == "testuser"
    assert payload["role"] == "student"
    assert "exp" in payload


@pytest.mark.asyncio
async def test_authenticate_user(test_db):
    """Test user authentication"""
    # Insert a test user
    username = "authuser"
    password = "authpassword"
    hashed_password = get_password_hash(password)
    
    await test_db.users.insert_one({
        "username": username,
        "hashed_password": hashed_password,
        "email": "auth@example.com",
        "role": "student"
    })
    
    # Test successful authentication
    user = await authenticate_user(test_db, username, password)
    assert user is not None
    assert user["username"] == username
    
    # Test failed authentication with wrong password
    user = await authenticate_user(test_db, username, "wrongpassword")
    assert user is None
    
    # Test failed authentication with non-existent user
    user = await authenticate_user(test_db, "nonexistentuser", password)
    assert user is None


def test_create_refresh_token():
    """Test refresh token creation"""
    username = "refreshuser"
    token = create_refresh_token(username)
    
    # Token should be a string
    assert isinstance(token, str)
    
    # Should be a valid JWT token
    from app.core.config import settings
    payload = jwt.decode(token, settings.REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
    
    assert payload["sub"] == username
    assert "exp" in payload
    
    # Refresh token expiry should be further in the future than access token
    access_token_data = {"sub": username}
    access_token = create_access_token(data=access_token_data)
    access_payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    
    assert payload["exp"] > access_payload["exp"]
