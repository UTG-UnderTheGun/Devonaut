from fastapi import APIRouter, Depends
from app.core.security import get_current_user

router = APIRouter()

@router.get("/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    # Assuming current_user is a tuple (user, user_id)
    user, user_id = current_user  # Unpack the user and user_id
    return {"username": user["username"], "user_id": str(user_id)}  # Return username and user_id
