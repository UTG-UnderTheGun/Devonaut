from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
import subprocess
import tempfile
import datetime
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Load environment variables
load_dotenv()

app = FastAPI()

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ideally, this should be restricted to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DATABASE", "devonaut")

# Database connection setup
mongo_client = None

@app.on_event("startup")
async def startup_db_client():
    global mongo_client
    mongo_client = AsyncIOMotorClient(MONGO_URI)
    # Validate connection
    try:
        await mongo_client.admin.command('ping')
        print("Connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    global mongo_client
    if mongo_client:
        mongo_client.close()

# Get MongoDB database
async def get_database():
    return mongo_client[DB_NAME]

# Models
class CodeExecution(BaseModel):
    code: str
    output: Optional[str] = None
    error: Optional[str] = None
    timestamp: Optional[datetime.datetime] = None
    user_id: Optional[str] = None  # If you have user authentication

class CodeRequest(BaseModel):
    code: str

class CodeResponse(BaseModel):
    output: Optional[str] = None
    error: Optional[str] = None

# Helper to convert MongoDB document to dict with proper ObjectId handling
def fix_mongo_id(doc):
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

# API endpoints
@app.post("/code/run-code", response_model=CodeResponse)
async def run_code(code_request: CodeRequest, request: Request, db=Depends(get_database)):
    code = code_request.code
    output = ""
    error = ""
    
    # Run the Python code
    try:
        with tempfile.NamedTemporaryFile(suffix='.py', delete=False) as f:
            f.write(code.encode())
            temp_file_name = f.name

        proc = subprocess.run(
            ['python', temp_file_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10
        )
        
        output = proc.stdout
        error = proc.stderr
        
        os.unlink(temp_file_name)  # Remove the temporary file
        
    except subprocess.TimeoutExpired:
        error = "Execution timed out after 10 seconds"
    except Exception as e:
        error = f"Error executing code: {str(e)}"
        
    # Store the execution in MongoDB
    execution_record = {
        "code": code,
        "output": output,
        "error": error,
        "timestamp": datetime.datetime.utcnow(),
        "user_id": None  # Update this if you add user authentication
    }
    
    try:
        # Insert into MongoDB
        result = await db.code_history.insert_one(execution_record)
        print(f"Saved code execution with ID: {result.inserted_id}")
    except Exception as e:
        print(f"Failed to save to MongoDB: {e}")
    
    return CodeResponse(output=output, error=error)

@app.get("/code/history", response_model=List[Dict[str, Any]])
async def get_code_history(db=Depends(get_database)):
    """Retrieve code execution history from MongoDB."""
    try:
        cursor = db.code_history.find().sort("timestamp", -1).limit(50)  # Get most recent 50 entries
        history = []
        async for document in cursor:
            # Convert MongoDB ObjectId to string
            document = fix_mongo_id(document)
            # Convert datetime to ISO format string for JSON serialization
            if "timestamp" in document and document["timestamp"]:
                document["timestamp"] = document["timestamp"].isoformat()
            history.append(document)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve code history: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "Welcome to Devonaut Code Execution API"}