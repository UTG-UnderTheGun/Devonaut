from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Dict, Any
from app.db.schemas import Assignment, AssignmentCreate, AssignmentUpdate, AssignmentSummary
from app.core.security import get_current_user
from app.services.assignment_service import (
    create_assignment,
    get_all_assignments,
    get_assignment_by_id,
    update_assignment,
    delete_assignment
)

router = APIRouter()

@router.post("/", response_model=Assignment)
async def create_new_assignment(
    request: Request,
    assignment: AssignmentCreate,
    current_user=Depends(get_current_user)
):
    """
    Create a new assignment (teachers only)
    """
    user, user_id = current_user
    
    # Check if user is a teacher
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create assignments")
    
    return await create_assignment(request.app.mongodb, assignment, user_id)


@router.get("/", response_model=List[AssignmentSummary])
async def list_assignments(
    request: Request,
    current_user=Depends(get_current_user)
):
    """
    List all assignments
    For teachers: shows their created assignments
    For students: shows all assignments
    """
    user, user_id = current_user
    
    # If teacher, only show their assignments
    teacher_id = user_id if user.get("role") == "teacher" else None
    
    return await get_all_assignments(request.app.mongodb, teacher_id)


@router.get("/{assignment_id}", response_model=Assignment)
async def get_assignment(
    request: Request,
    assignment_id: str,
    current_user=Depends(get_current_user)
):
    """
    Get a specific assignment by ID
    """
    return await get_assignment_by_id(request.app.mongodb, assignment_id)


@router.put("/{assignment_id}", response_model=Assignment)
async def update_existing_assignment(
    request: Request,
    assignment_id: str,
    assignment_data: AssignmentUpdate,
    current_user=Depends(get_current_user)
):
    """
    Update an existing assignment (teachers only)
    """
    user, user_id = current_user
    
    # Check if user is a teacher
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can update assignments")
    
    # Check if teacher owns this assignment
    assignment = await get_assignment_by_id(request.app.mongodb, assignment_id)
    if assignment["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="You can only update your own assignments")
    
    return await update_assignment(request.app.mongodb, assignment_id, assignment_data)


@router.delete("/{assignment_id}")
async def delete_existing_assignment(
    request: Request,
    assignment_id: str,
    current_user=Depends(get_current_user)
):
    """
    Delete an assignment (teachers only)
    """
    user, user_id = current_user
    
    # Check if user is a teacher
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can delete assignments")
    
    # Check if teacher owns this assignment
    assignment = await get_assignment_by_id(request.app.mongodb, assignment_id)
    if assignment["created_by"] != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own assignments")
    
    return await delete_assignment(request.app.mongodb, assignment_id) 