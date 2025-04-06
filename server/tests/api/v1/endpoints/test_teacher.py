import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta


def test_create_assignment(client: TestClient, teacher_auth_headers):
    """Test creating a new assignment"""
    assignment_data = {
        "title": "New Test Assignment",
        "chapter": "Test Chapter",
        "description": "This is a test assignment",
        "dueDate": (datetime.now() + timedelta(days=7)).isoformat(),
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
        ]
    }
    
    response = client.post("/teacher/assignments", json=assignment_data, headers=teacher_auth_headers)
    
    assert response.status_code == 200
    assert "id" in response.json()
    assert response.json()["title"] == "New Test Assignment"


def test_get_assignments(client: TestClient, teacher_auth_headers):
    """Test getting all assignments"""
    response = client.get("/teacher/assignments", headers=teacher_auth_headers)
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    # Check if test assignment is in the list
    assert any(assignment["title"] == "Test Assignment" for assignment in response.json())


def test_get_assignment_by_id(client: TestClient, teacher_auth_headers):
    """Test getting an assignment by ID"""
    response = client.get("/teacher/assignments/test_assignment_id", headers=teacher_auth_headers)
    
    assert response.status_code == 200
    assert response.json()["id"] == "test_assignment_id"
    assert response.json()["title"] == "Test Assignment"


def test_update_assignment(client: TestClient, teacher_auth_headers):
    """Test updating an assignment"""
    update_data = {
        "title": "Updated Assignment",
        "description": "Updated description"
    }
    
    response = client.put("/teacher/assignments/test_assignment_id", json=update_data, headers=teacher_auth_headers)
    
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Assignment"
    assert response.json()["description"] == "Updated description"


def test_delete_assignment(client: TestClient, teacher_auth_headers):
    """Test deleting an assignment"""
    # First create a new assignment to delete
    assignment_data = {
        "title": "Assignment to Delete",
        "chapter": "Test Chapter",
        "description": "This assignment will be deleted",
        "dueDate": (datetime.now() + timedelta(days=7)).isoformat(),
        "points": 10,
        "exercises": []
    }
    
    create_response = client.post("/teacher/assignments", json=assignment_data, headers=teacher_auth_headers)
    assignment_id = create_response.json()["id"]
    
    # Now delete it
    delete_response = client.delete(f"/teacher/assignments/{assignment_id}", headers=teacher_auth_headers)
    
    assert delete_response.status_code == 200
    assert delete_response.json()["message"] == "Assignment deleted successfully"
    
    # Verify it's gone
    get_response = client.get(f"/teacher/assignments/{assignment_id}", headers=teacher_auth_headers)
    assert get_response.status_code == 404


def test_student_access_denied(client: TestClient, auth_headers):
    """Test that students cannot access teacher endpoints"""
    response = client.get("/teacher/assignments", headers=auth_headers)
    
    assert response.status_code == 403
    assert "permission" in response.json()["detail"].lower()
