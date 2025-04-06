import pytest
from app.services.run_code_service import execute_python_code
import time


def test_execute_simple_code():
    """Test executing simple Python code"""
    code = "a = 5\nb = 10\nprint(a + b)"
    result = execute_python_code(code)
    
    assert result["output"].strip() == "15"
    assert result["error"] == ""
    assert "execution_time" in result
    assert result["execution_time"] >= 0


def test_execute_code_with_error():
    """Test executing code that raises an error"""
    code = "a = 5 / 0"
    result = execute_python_code(code)
    
    assert result["output"] == ""
    assert "ZeroDivisionError" in result["error"]
    assert "execution_time" in result


def test_execute_code_with_print():
    """Test executing code with print statements"""
    code = "print('Hello')\nprint('World')"
    result = execute_python_code(code)
    
    assert "Hello" in result["output"]
    assert "World" in result["output"]
    assert result["error"] == ""


def test_execute_code_with_input():
    """Test executing code that tries to use input (should fail safely)"""
    code = "name = input('Enter your name: ')\nprint(f'Hello, {name}')"
    result = execute_python_code(code)
    
    assert "EOFError" in result["error"] or "input" in result["error"]


def test_execute_code_with_imports():
    """Test executing code with standard library imports"""
    code = "import math\nprint(math.sqrt(16))"
    result = execute_python_code(code)
    
    assert "4.0" in result["output"]
    assert result["error"] == ""


def test_execute_code_timeout():
    """Test executing code that would timeout"""
    code = "import time\nwhile True:\n    time.sleep(0.1)"
    result = execute_python_code(code, timeout=0.5)
    
    assert "Execution timed out" in result["error"]


def test_execute_recursive_code():
    """Test executing recursive function (tests stack handling)"""
    code = """
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

print(factorial(5))"""
    result = execute_python_code(code)
    
    assert "120" in result["output"]
    assert result["error"] == ""


def test_execute_code_with_loop():
    """Test executing code with loops"""
    code = """
sum = 0
for i in range(1, 101):
    sum += i
print(sum)"""
    result = execute_python_code(code)
    
    assert "5050" in result["output"]
    assert result["error"] == ""


def test_execute_code_with_test_cases():
    """Test code execution with assertions (for test cases)"""
    code = """
def add(a, b):
    return a + b

assert add(2, 3) == 5
assert add(-1, 1) == 0
print('All tests passed!')"""
    result = execute_python_code(code)
    
    assert "All tests passed!" in result["output"]
    assert result["error"] == ""


def test_execute_code_with_syntax_error():
    """Test executing code with syntax errors"""
    code = "print('Hello world'"
    result = execute_python_code(code)
    
    assert "SyntaxError" in result["error"]
