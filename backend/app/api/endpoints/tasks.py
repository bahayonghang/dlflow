"""任务管理API端点"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.services.task_manager import TaskManager

router = APIRouter()


class TaskCreate(BaseModel):
    name: str
    task_type: str  # data_processing, analysis, visualization
    parameters: dict
    execution_id: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    priority: int = 0


class TaskResponse(BaseModel):
    id: str
    execution_id: Optional[str]
    name: str
    task_type: str
    status: str
    priority: int
    scheduled_time: Optional[datetime]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    parameters: Optional[dict]
    result: Optional[dict]
    error_message: Optional[str]
    retry_count: int
    max_retries: int
    created_at: datetime
    updated_at: datetime


class TaskListResponse(BaseModel):
    id: str
    execution_id: Optional[str]
    name: str
    task_type: str
    status: str
    priority: int
    scheduled_time: Optional[datetime]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    retry_count: int
    created_at: datetime
    updated_at: datetime


@router.post("/", response_model=dict)
async def create_task(
    task_data: TaskCreate
):
    """创建新任务"""
    task_id = await TaskManager.create_task(
        name=task_data.name,
        task_type=task_data.task_type,
        parameters=task_data.parameters,
        execution_id=task_data.execution_id,
        scheduled_time=task_data.scheduled_time,
        priority=task_data.priority
    )
    
    return {"task_id": task_id, "message": "任务已创建"}


@router.get("/", response_model=List[TaskListResponse])
async def list_tasks(
    execution_id: Optional[str] = None,
    status: Optional[str] = None,
    task_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """获取任务列表"""
    tasks = await TaskManager.list_tasks(
        execution_id=execution_id,
        status=status,
        task_type=task_type,
        limit=limit,
        offset=offset
    )
    
    return [
        TaskListResponse(**task)
        for task in tasks
    ]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str
):
    """获取任务详情"""
    task = await TaskManager.get_task(task_id)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    return TaskResponse(**task)


@router.post("/{task_id}/cancel")
async def cancel_task(
    task_id: str
):
    """取消任务"""
    success = await TaskManager.cancel_task(task_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在或无法取消"
        )
    
    return {"message": "任务已取消"}


@router.post("/{task_id}/retry")
async def retry_task(
    task_id: str
):
    """重试任务"""
    success = await TaskManager.retry_task(task_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="任务不存在或无法重试"
        )
    
    return {"message": "任务已重试"}


@router.delete("/{task_id}")
async def delete_task(
    task_id: str
):
    """删除任务"""
    success = await TaskManager.delete_task(task_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )
    
    return {"message": "任务已删除"}


@router.get("/statistics/overview")
async def get_task_statistics():
    """获取任务统计信息"""
    stats = await TaskManager.get_task_statistics()
    return stats