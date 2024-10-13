from fastapi import APIRouter
from app.db.schemas import Code
from app.services.run_code_service import run_code as run_code_service

router = APIRouter()

@router.post("/run-code")
async def run_code(code: Code):
    result = await run_code_service(code)
    return result
