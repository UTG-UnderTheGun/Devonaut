import pytest
from fastapi.testclient import TestClient


def test_execute_code(client: TestClient, auth_headers):
    """Test executing code"""
    code_data = {
        "code": "print('Hello, World!')",
        "timeout": 5
    }
    
    response = client.post("/code/execute", json=code_data, headers=auth_headers)
    
    assert response.status_code == 200
    assert "output" in response.json()
    assert "error" in response.json()
    assert "Hello, World!" in response.json()["output"]
    assert response.json()["error"] == ""


def test_execute_code_with_error(client: TestClient, auth_headers):
    """Test executing code that contains an error"""
    code_data = {
        "code": "print(undefined_variable)",
        "timeout": 5
    }
    
    response = client.post("/code/execute", json=code_data, headers=auth_headers)
    
    assert response.status_code == 200
    assert "output" in response.json()
    assert "error" in response.json()
    assert "NameError" in response.json()["error"]
    assert "undefined_variable" in response.json()["error"]


def test_execute_code_timeout(client: TestClient, auth_headers):
    """Test executing code that times out"""
    code_data = {
        "code": "import time\nwhile True:\n    time.sleep(1)",
        "timeout": 1  # Set a very low timeout
    }
    
    response = client.post("/code/execute", json=code_data, headers=auth_headers)
    
    assert response.status_code == 200
    assert "output" in response.json()
    assert "error" in response.json()
    assert "Execution timed out" in response.json()["error"]


def test_save_code_history(client: TestClient, auth_headers):
    """Test saving code history"""
    history_data = {
        "code": "print('Testing history')",
        "problem_index": 1,
        "test_type": "code",
        "output": "Testing history",
        "error": "",
        "execution_time": 0.1,
        "is_submission": False,
        "action_type": "run"
    }
    
    response = client.post("/code/history", json=history_data, headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["message"] == "Code history saved successfully"


def test_get_code_history(client: TestClient, auth_headers):
    """Test getting code history"""
    # First save some code history
    history_data = {
        "code": "print('Get history test')",
        "problem_index": 2,
        "test_type": "code",
        "output": "Get history test",
        "error": "",
        "execution_time": 0.1,
        "is_submission": False,
        "action_type": "run"
    }
    
    client.post("/code/history", json=history_data, headers=auth_headers)
    
    # Now get the history
    response = client.get("/code/history", headers=auth_headers)
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)
    # At least the entry we just created should be there
    assert any(item["code"] == "print('Get history test')" for item in response.json())


def test_save_keystroke_data(client: TestClient, auth_headers):
    """Test saving keystroke data"""
    keystroke_data = {
        "code": "def test_function():\n    return True",
        "problem_index": 1,
        "test_type": "code",
        "cursor_position": {"line": 1, "column": 10}
    }
    
    response = client.post("/code/keystroke", json=keystroke_data, headers=auth_headers)
    
    assert response.status_code == 200
    assert response.json()["message"] == "Keystroke data saved successfully"
