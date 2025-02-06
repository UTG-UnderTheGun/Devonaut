from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi_limiter.depends import RateLimiter
from app.db.schemas import Code
from app.services.run_code_service import run_code as run_code_service
from app.services.export_code import export_code
from typing import Dict, Any, Tuple
from app.core.security import get_current_user

router = APIRouter()


async def get_identifier(request: Request):
    """
    Async identifier function for rate limiting that also checks authentication
    """
    try:
        user, user_id = await get_current_user(request)
        return f"run_code:{user_id}"
    except HTTPException:
        raise HTTPException(status_code=401, detail="Not authenticated")


@router.post("/run-code", response_model=Dict[str, Any])
async def run_code(
    request: Request,  # Add request parameter
    code: Code,
    current_user=Depends(get_current_user),
    _: bool = Depends(RateLimiter(times=20, seconds=60, identifier=get_identifier)),
):
    """
    Execute code with per-user rate limiting and proper error handling.
    """
    try:
        user, user_id = current_user
        result = await run_code_service(code, user_id=user_id)
        return result
    except HTTPException as he:
        return JSONResponse(
            status_code=he.status_code,
            content={"error": he.detail},
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "detail": str(e)},
        )


@router.post("/export")
async def export_as_json():
    return await export_code()
