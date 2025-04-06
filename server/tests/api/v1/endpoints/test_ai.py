import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


def test_chat_endpoint(client: TestClient, auth_headers):
    """Test the chat endpoint with a mocked AI response"""
    
    # Prepare test data
    chat_data = {
        "messages": [
            {"role": "user", "content": "What is Python?"}
        ],
        "context": "coding"
    }
    
    # Mock the AI service to avoid actual API calls during testing
    with patch("app.api.v1.endpoints.ai.get_chat_response") as mock_chat:
        # Set up the mock to return a predefined response
        mock_response = {
            "id": "chatcmpl-123",
            "object": "chat.completion",
            "model": "gpt-3.5-turbo",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Python is a programming language."
                    }
                }
            ]
        }
        mock_chat.return_value = {"response": mock_response, "tokens_used": 50}
        
        # Call the endpoint
        response = client.post("/ai/chat", json=chat_data, headers=auth_headers)
        
        # Check the response
        assert response.status_code == 200
        assert "choices" in response.json()
        assert "message" in response.json()["choices"][0]
        assert response.json()["choices"][0]["message"]["content"] == "Python is a programming language."


def test_chat_unauthenticated(client: TestClient):
    """Test the chat endpoint without authentication"""
    
    chat_data = {
        "messages": [
            {"role": "user", "content": "What is Python?"}
        ],
        "context": "coding"
    }
    
    response = client.post("/ai/chat", json=chat_data)
    
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


def test_code_explanation(client: TestClient, auth_headers):
    """Test the code explanation endpoint"""
    
    explanation_data = {
        "code": "def add(a, b):\n    return a + b",
        "language": "python",
        "level": "beginner"
    }
    
    # Mock the AI service
    with patch("app.api.v1.endpoints.ai.get_code_explanation") as mock_explain:
        mock_explanation = "This function adds two numbers and returns the result."
        mock_explain.return_value = {"explanation": mock_explanation, "tokens_used": 30}
        
        # Call the endpoint
        response = client.post("/ai/explain-code", json=explanation_data, headers=auth_headers)
        
        # Check the response
        assert response.status_code == 200
        assert "explanation" in response.json()
        assert response.json()["explanation"] == mock_explanation


def test_code_completion(client: TestClient, auth_headers):
    """Test the code completion endpoint"""
    
    completion_data = {
        "code": "def calculate_area(radius):\n    # Calculate the area of a circle",
        "language": "python"
    }
    
    # Mock the AI service
    with patch("app.api.v1.endpoints.ai.get_code_completion") as mock_complete:
        mock_completion = "    pi = 3.14159\n    return pi * radius * radius"
        mock_complete.return_value = {"completion": mock_completion, "tokens_used": 40}
        
        # Call the endpoint
        response = client.post("/ai/complete-code", json=completion_data, headers=auth_headers)
        
        # Check the response
        assert response.status_code == 200
        assert "completion" in response.json()
        assert response.json()["completion"] == mock_completion


def test_generate_test_cases(client: TestClient, auth_headers):
    """Test the test case generation endpoint"""
    
    test_case_data = {
        "code": "def is_prime(n):\n    if n <= 1:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True",
        "language": "python"
    }
    
    # Mock the AI service
    with patch("app.api.v1.endpoints.ai.generate_test_cases") as mock_tests:
        mock_test_cases = [
            "assert is_prime(2) == True",
            "assert is_prime(4) == False",
            "assert is_prime(17) == True"
        ]
        mock_tests.return_value = {"test_cases": mock_test_cases, "tokens_used": 60}
        
        # Call the endpoint
        response = client.post("/ai/generate-tests", json=test_case_data, headers=auth_headers)
        
        # Check the response
        assert response.status_code == 200
        assert "test_cases" in response.json()
        assert len(response.json()["test_cases"]) == 3
        assert "assert is_prime(2) == True" in response.json()["test_cases"]