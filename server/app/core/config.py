import os

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security configuration constants
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
