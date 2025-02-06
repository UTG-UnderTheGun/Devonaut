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
from typing import Dict, Any
import logging
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Resource constraints
SEMAPHORE = asyncio.Semaphore(50)
THREAD_POOL = ThreadPoolExecutor(max_workers=25)
TEMP_DIRS_SEMAPHORE = asyncio.Semaphore(75)

# Security configurations
BANNED_PATTERNS = {".env", "config/", "/etc/passwd", "/etc/shadow"}
BANNED_MODULES = {
    "os",
    "subprocess",
    "sys",
    "shutil",
    "socket",
    "resource",
    "pwd",
    "grp",
    "ctypes",
}
BANNED_FUNCTIONS = {"eval", "exec", "open", "compile", "execfile", "__import__", "exit"}
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


def validate_code_safety(code: str) -> bool:
    """
    Validate code safety using AST analysis.

    Args:
        code: String containing Python code

    Returns:
        bool: True if code is safe, False otherwise
    """
    try:
        if any(pattern in code for pattern in BANNED_PATTERNS):
            return False
        tree = ast.parse(code)
        visitor = SecurityVisitor()
        visitor.visit(tree)
        return not visitor.unsafe
    except SyntaxError:
        return False


def sandbox_setup(uid: int, gid: int):
    """
    Set up sandbox environment with resource limits.

    Args:
        uid: User ID for sandbox
        gid: Group ID for sandbox
    """
    try:
        # Set resource limits
        resource.setrlimit(
            resource.RLIMIT_AS, (50 * 1024 * 1024, 50 * 1024 * 1024)
        )  # 50MB memory
        resource.setrlimit(resource.RLIMIT_CPU, (4, 4))  # 4 seconds CPU time
        resource.setrlimit(
            resource.RLIMIT_FSIZE, (512 * 1024, 512 * 1024)
        )  # 512KB file size
        resource.setrlimit(resource.RLIMIT_NOFILE, (50, 50))  # 50 file descriptors

        # Drop privileges
        os.setgid(gid)
        os.setuid(uid)
        os.chdir("/")

        # Set no new privileges flag
        try:
            from ctypes import CDLL, c_int

            libc = CDLL(None)
            PR_SET_NO_NEW_PRIVS = 38
            libc.prctl(PR_SET_NO_NEW_PRIVS, c_int(1), c_int(0), c_int(0), c_int(0))
        except:
            pass

    except (resource.error, ValueError) as e:
        logger.warning(f"Could not set some resource limits: {str(e)}")


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
