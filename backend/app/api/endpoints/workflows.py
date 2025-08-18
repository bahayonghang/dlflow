"""工作流管理API端点"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.storage import JSONStorage
from app.core.config import settings
import os
import uuid
from datetime import datetime

router = APIRouter()


class WorkflowCreate(BaseModel):
    """工作流创建请求模型"""
    name: str
    description: Optional[str] = ""
    nodes: List[dict]
    edges: List[dict]


class WorkflowResponse(BaseModel):
    """工作流响应模型"""
    id: str
    name: str
    description: str
    configuration: dict
    status: str
    created_at: str
    updated_at: str


@router.post("/", response_model=dict)
async def create_workflow(workflow: WorkflowCreate):
    """创建工作流"""
    try:
        workflow_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        workflow_data = {
            "id": workflow_id,
            "name": workflow.name,
            "description": workflow.description,
            "configuration": {
                "nodes": workflow.nodes,
                "edges": workflow.edges
            },
            "status": "draft",
            "created_at": now,
            "updated_at": now
        }
        
        workflow_file = os.path.join(settings.WORKFLOWS_DIR, f"{workflow_id}.json")
        JSONStorage.save_json(workflow_file, workflow_data)
        
        return {
            "success": True,
            "workflow_id": workflow_id
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建工作流失败: {str(e)}"
        )


@router.get("/", response_model=dict)
async def list_workflows():
    """获取工作流列表"""
    try:
        workflows = []
        
        for file_name in os.listdir(settings.WORKFLOWS_DIR):
            if file_name.endswith(".json"):
                workflow_file = os.path.join(settings.WORKFLOWS_DIR, file_name)
                workflow_data = JSONStorage.load_json(workflow_file)
                
                if workflow_data:
                    workflows.append({
                        "id": workflow_data["id"],
                        "name": workflow_data["name"],
                        "description": workflow_data["description"],
                        "status": workflow_data["status"],
                        "created_at": workflow_data["created_at"],
                        "updated_at": workflow_data["updated_at"]
                    })
        
        # 按更新时间排序
        workflows.sort(key=lambda x: x["updated_at"], reverse=True)
        
        return {"workflows": workflows}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取工作流列表失败: {str(e)}"
        )


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: str):
    """获取工作流详情"""
    workflow_file = os.path.join(settings.WORKFLOWS_DIR, f"{workflow_id}.json")
    workflow_data = JSONStorage.load_json(workflow_file)
    
    if not workflow_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="工作流不存在"
        )
    
    return WorkflowResponse(**workflow_data)


@router.post("/{workflow_id}/execute", response_model=dict)
async def execute_workflow(workflow_id: str, parameters: Optional[dict] = None):
    """执行工作流"""
    # 检查工作流是否存在
    workflow_file = os.path.join(settings.WORKFLOWS_DIR, f"{workflow_id}.json")
    workflow_data = JSONStorage.load_json(workflow_file)
    
    if not workflow_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="工作流不存在"
        )
    
    try:
        # 创建任务ID
        task_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        # 创建任务记录
        task_data = {
            "id": task_id,
            "workflow_id": workflow_id,
            "status": "pending",
            "parameters": parameters or {},
            "result": {},
            "started_at": now,
            "completed_at": "",
            "created_at": now
        }
        
        task_file = os.path.join(settings.TASKS_DIR, f"{task_id}.json")
        JSONStorage.save_json(task_file, task_data)
        
        # TODO: 这里应该启动Celery任务来异步执行工作流
        # 现在先返回任务ID
        
        return {
            "success": True,
            "task_id": task_id
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"执行工作流失败: {str(e)}"
        )