import os
import subprocess
import asyncio
import tempfile
import ast
import pwd
import resource
from pathlib import Path
from fastapi import HTTPException
from app.db.schemas import Code
from typing import Dict, Any, Optional
import logging
from concurrent.futures import ThreadPoolExecutor
import uuid
import io
import sys
import queue
import threading

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Resource constraints
SEMAPHORE = asyncio.Semaphore(50)
THREAD_POOL = ThreadPoolExecutor(max_workers=25)
TEMP_DIRS_SEMAPHORE = asyncio.Semaphore(75)

# Store active processes by user_id
ACTIVE_PROCESSES = {}
PROCESS_INPUTS = {}
PROCESS_OUTPUTS = {}

# Security configurations
BANNED_PATTERNS = {".env", "config/", "/etc/passwd", "/etc/shadow"}
BANNED_MODULES = {
    "os",
    "subprocess",
    "sys.exit",  # Allow sys for input but not exit
    "shutil",
    "socket",
    "resource",
    "pwd",
    "grp",
    "ctypes",
}
BANNED_FUNCTIONS = {"eval", "exec", "compile", "execfile", "__import__", "exit"}
BANNED_METHODS = {
    "system",
    "popen",
    "chdir",
    "rmdir",
    "remove",
    "unlink",
    "kill",
    "connect",
}


class SecurityVisitor(ast.NodeVisitor):
    """AST visitor for security validation."""

    def __init__(self):
        self.unsafe = False

    def visit_Import(self, node):
        for alias in node.names:
            if alias.name in BANNED_MODULES:
                self.unsafe = True
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module in BANNED_MODULES:
            self.unsafe = True
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in BANNED_FUNCTIONS:
                self.unsafe = True
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in BANNED_METHODS:
                self.unsafe = True
        self.generic_visit(node)


def validate_code_safety(code_str: str) -> bool:
    """Validate code safety using AST analysis."""
    try:
        if not code_str or not code_str.strip():
            return True

        # Basic pattern check
        for pattern in BANNED_PATTERNS:
            if pattern in code_str:
                logger.warning(f"Banned pattern detected: {pattern}")
                return False

        # Parse the code into an AST
        tree = ast.parse(code_str)

        # Check for unsafe constructs
        visitor = SecurityVisitor()
        visitor.visit(tree)

        return not visitor.unsafe
    except SyntaxError:
        # Syntax errors will be caught by the Python interpreter
        return True
    except Exception as e:
        logger.error(f"Error validating code safety: {str(e)}")
        return False


def sandbox_setup(uid: int, gid: int) -> None:
    """Set up sandbox environment with resource limits."""
    # Set resource limits
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))  # 5 seconds CPU time
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))  # Max 64 open files
    resource.setrlimit(resource.RLIMIT_NPROC, (10, 10))  # Max 10 processes/threads
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))  # 1MB file size

    # Drop privileges by changing to nobody user
    os.setgroups([])
    os.setgid(gid)
    os.setuid(uid)


class InputWrapper:
    """Custom wrapper for redirecting sys.stdin to handle input."""
    def __init__(self, process_id):
        self.process_id = process_id
        self.buffer = queue.Queue()
        self.waiting = False

    def readline(self):
        self.waiting = True
        # Signal to the frontend that we need input
        PROCESS_OUTPUTS[self.process_id] += "__INPUT_REQUIRED__"
        # Wait for input
        result = self.buffer.get()
        self.waiting = False
        return result + "\n"  # Add newline to simulate pressing Enter


class OutputWrapper:
    """Custom wrapper for capturing stdout and stderr."""
    def __init__(self, process_id):
        self.process_id = process_id
        self.buffer = []

    def write(self, data):
        if data:
            PROCESS_OUTPUTS[self.process_id] += data
            self.buffer.append(data)
            return len(data)
        return 0

    def flush(self):
        pass


class InteractiveCodeRunner:
    """Class to handle interactive code execution with support for input."""
    def __init__(self, code_str, process_id):
        self.code_str = code_str
        self.process_id = process_id
        self.stdin_wrapper = InputWrapper(process_id)
        self.stdout_wrapper = OutputWrapper(process_id)
        self.stderr_wrapper = OutputWrapper(process_id)
        self.namespace = {}
        self.thread = None
        self.is_running = False
        self.error = None

    def run(self):
        """Run the code in a thread to allow for async input handling."""
        self.is_running = True
        self.thread = threading.Thread(target=self._execute)
        self.thread.daemon = True
        self.thread.start()

    def _execute(self):
        """Execute the code with custom input/output handling."""
        try:
            # Save original stdin/stdout/stderr
            original_stdin = sys.stdin
            original_stdout = sys.stdout
            original_stderr = sys.stderr

            # Set up custom input/output
            sys.stdin = self.stdin_wrapper
            sys.stdout = self.stdout_wrapper
            sys.stderr = self.stderr_wrapper

            # Include a custom safe input function in the execution namespace
            def safe_input(prompt=""):
                print(prompt, end="")
                return sys.stdin.readline().rstrip("\n")

            self.namespace["input"] = safe_input

            # Execute the code
            exec(self.code_str, self.namespace)
            
        except Exception as e:
            self.error = str(e)
            PROCESS_OUTPUTS[self.process_id] += f"Runtime error: {str(e)}"
        finally:
            # Restore original stdin/stdout/stderr
            sys.stdin = original_stdin
            sys.stdout = original_stdout
            sys.stderr = original_stderr
            self.is_running = False

    def send_input(self, input_str):
        """Send input to the running process."""
        if self.is_running and self.stdin_wrapper.waiting:
            # Add the input to the process buffer
            self.stdin_wrapper.buffer.put(input_str)
            return True
        return False


async def execute_in_sandbox(
    code_str: str, temp_dir: str, env: Dict[str, str], user_id: str
) -> Dict[str, Any]:
    """
    Execute code in a sandboxed environment.

    Args:
        code_str: String containing Python code
        temp_dir: Temporary directory path
        env: Environment variables dictionary

    Returns:
        Dict containing execution results or error message
    """
    # For interactive input, we use a different approach
    if "input(" in code_str:
        return await execute_interactive(code_str, user_id)
    
    try:
        sandbox_user = pwd.getpwnam("nobody")
        sandbox_gid = sandbox_user.pw_gid
        sandbox_uid = sandbox_user.pw_uid

        result = await asyncio.get_event_loop().run_in_executor(
            THREAD_POOL,
            lambda: subprocess.run(
                ["/usr/bin/python3", "-I", "-S", "-c", code_str],
                capture_output=True,
                text=True,
                timeout=5,
                check=True,
                env=env,
                cwd=temp_dir,
                preexec_fn=lambda: sandbox_setup(sandbox_uid, sandbox_gid),
            ),
        )
        return {
            "output": result.stdout.strip(),
            "error": result.stderr.strip(),
            "user_id": user_id,
        }
    except subprocess.TimeoutExpired:
        return {"error": "Execution timed out (5s limit)"}
    except subprocess.CalledProcessError as e:
        return {"error": f"Runtime error: {e.stderr.strip()}"}
    except Exception as e:
        logger.error(f"Execution error: {str(e)}")
        return {"error": f"Server error: {str(e)}"}


async def execute_interactive(code_str: str, user_id: str) -> Dict[str, Any]:
    """
    Execute code in interactive mode with input support.
    
    Args:
        code_str: String containing Python code
        user_id: User ID for tracking the process
        
    Returns:
        Dict containing execution results or error message
    """
    try:
        # Clean up any previous process for this user
        if user_id in ACTIVE_PROCESSES:
            del ACTIVE_PROCESSES[user_id]
        
        # Generate a unique process ID
        process_id = f"{user_id}_{uuid.uuid4().hex}"
        
        # Initialize output buffer for this process
        PROCESS_OUTPUTS[process_id] = ""
        
        # Create and run the interactive code runner
        runner = InteractiveCodeRunner(code_str, process_id)
        ACTIVE_PROCESSES[user_id] = {"runner": runner, "process_id": process_id}
        
        # Start execution
        runner.run()
        
        # Wait a short time for initial output or prompt
        await asyncio.sleep(0.1)
        
        # Return the initial output
        return {
            "output": PROCESS_OUTPUTS[process_id],
            "user_id": user_id
        }
    except Exception as e:
        logger.error(f"Interactive execution error: {str(e)}")
        return {"error": f"Server error: {str(e)}"}


async def send_input(input_str: str, user_id: str) -> Dict[str, Any]:
    """
    Send input to a running interactive process.
    
    Args:
        input_str: Input string from the user
        user_id: User ID for identifying the process
        
    Returns:
        Dict containing updated execution results
    """
    try:
        # Check if there's an active process for this user
        if user_id not in ACTIVE_PROCESSES:
            return {"error": "No active process found. Please run your code first."}
        
        process_info = ACTIVE_PROCESSES[user_id]
        runner = process_info["runner"]
        process_id = process_info["process_id"]
        
        # Update the output with the user's input (to display it)
        PROCESS_OUTPUTS[process_id] += input_str + "\n"
        
        # Send the input to the process
        success = runner.send_input(input_str)
        
        if not success:
            return {"error": "Process is not waiting for input"}
            
        # Wait a short time for processing
        await asyncio.sleep(0.1)
        
        # Check if process is still running
        if not runner.is_running:
            # Process finished, clean up
            result = {"output": PROCESS_OUTPUTS[process_id]}
            del ACTIVE_PROCESSES[user_id]
            del PROCESS_OUTPUTS[process_id]
        else:
            # Process still running, return current output
            result = {"output": PROCESS_OUTPUTS[process_id]}
            
        return result
    except Exception as e:
        logger.error(f"Input handling error: {str(e)}")
        return {"error": f"Input error: {str(e)}"}


async def run_code(code: Code, user_id: str) -> Dict[str, Any]:
    """
    Main function to run code with all security measures and user context.
    """
    # Use a user-specific semaphore to prevent single user from hogging resources
    user_semaphore = asyncio.Semaphore(10)  # Max 10 concurrent executions per user

    async with user_semaphore:
        async with SEMAPHORE:  # Global semaphore still applies
            if not validate_code_safety(code.code):
                raise HTTPException(
                    status_code=400, detail="Potentially dangerous code detected"
                )

            # Check if code contains input() function
            if "input(" in code.code:
                return await execute_interactive(code.code, user_id)
            
            async with TEMP_DIRS_SEMAPHORE:
                try:
                    with tempfile.TemporaryDirectory() as temp_dir:
                        env = {
                            "PATH": "/usr/bin:/bin",
                            "PYTHONPATH": "",
                            "PYTHONSAFEPATH": "1",
                            "PYTHONNOUSERSITE": "1",
                            "USER_ID": str(user_id),  # Add user context to environment
                        }

                        os.chmod(temp_dir, 0o555)

                        return await asyncio.wait_for(
                            execute_in_sandbox(code.code, temp_dir, env, user_id),
                            timeout=6,
                        )
                except asyncio.TimeoutError:
                    return {"error": "Request timed out"}
                except Exception as e:
                    logger.error(f"Unexpected error for user {user_id}: {str(e)}")
                    return {"error": "Internal server error"}
