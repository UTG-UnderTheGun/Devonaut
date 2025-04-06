import pytest
from fastapi.testclient import TestClient


def test_get_current_user(client: TestClient, auth_headers):
    """Test getting the current authenticated user"""
    response = client.get("/users/me", headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"
    assert response.json()["role"] == "student"


def test_get_user_unauthenticated(client: TestClient):
    """Test getting user when not authenticated"""
    response = client.get("/users/me")
    
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


def test_update_user_profile(client: TestClient, auth_headers):
    """Test updating the user profile"""
    profile_data = {
        "name": "Updated Name",
        "student_id": "6422040999",
        "section": "2"
    }
    
    response = client.put("/users/profile", json=profile_data, headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Name"
    assert response.json()["student_id"] == "6422040999"
    assert response.json()["section"] == "2"
    
    # Verify the profile was updated by fetching it
    get_response = client.get("/users/me", headers=auth_headers)
    assert get_response.json()["name"] == "Updated Name"


def test_update_skill_level(client: TestClient, auth_headers):
    """Test updating user skill level"""
    skill_data = {
        "skill_level": "advanced"
    }
    
    response = client.put("/users/skill-level", json=skill_data, headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["message"] == "Skill level updated successfully"
    
    # Verify the skill level was updated
    get_response = client.get("/users/me", headers=auth_headers)
    assert get_response.json()["skill_level"] == "advanced"
