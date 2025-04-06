# Server Tests for DevOnaut

This directory contains tests for the DevOnaut server, which is a FastAPI application that powers the interactive coding learning platform.

## Test Structure

- `conftest.py`: Contains test fixtures and setup code
- `api/v1/endpoints/`: Tests for API endpoints
- `services/`: Tests for service-level functions

## Running Tests

To run the tests, make sure you have the required dependencies installed:

```bash
pip install -r ../requirements.txt
```

Then run the tests with pytest:

```bash
pytest -v
```

For running tests with coverage report:

```bash
pytest --cov=app --cov-report=term-missing
```

## Test Categories

### Authentication Tests

These tests verify the functionality of user registration, login, and token management.

### API Endpoint Tests

These tests ensure that all API endpoints work correctly, handling both valid and invalid inputs appropriately.

### Service Tests

These tests focus on the service layer functions that implement business logic, such as code execution, database operations, etc.

## Mocking

The tests use `mongomock` to mock the MongoDB database, allowing for isolated testing without requiring an actual database connection.

## Test Data

Test data is set up in the `conftest.py` file, with fixtures that create test users, assignments, and other necessary objects for testing.
