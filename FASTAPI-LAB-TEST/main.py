from fastapi import FastAPI
from pydantic import BaseModel
from generative_text_claude import converse_with_titan  # Import the function

app = FastAPI()

# Define the request body schema
class QueryRequest(BaseModel):
    prompt: str
    yearold: str

@app.get("/")
async def root():
    return {"message": "Hello World"}

# Create a POST endpoint to accept a JSON request
@app.post("/ask/")
async def ask_titan(query_request: QueryRequest):
    # Send the prompt from the JSON body to the Titan Text Express model
    response = converse_with_titan(query_request.prompt,query_request.yearold)
    return {"response": response}
