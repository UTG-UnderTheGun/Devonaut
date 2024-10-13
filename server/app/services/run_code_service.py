import subprocess
from app.db.schemas import Code

async def run_code(code: Code):
    try:
        with open("code.py", "w") as f:
            f.write(code.code)
        
        # Run the Python code using subprocess
        result = subprocess.run(["python", "code.py"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        output = result.stdout.decode("utf-8")
        error = result.stderr.decode("utf-8")

        return {"output": output, "error": error}
    except Exception as e:
        return {"error": str(e)}
