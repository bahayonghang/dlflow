"""项目管理API端点"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import get_db
from app.models.project import Project
from app.models.execution import Execution
from app.models.file import UploadedFile
from pydantic import BaseModel

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workflow_path: Optional[str] = None
    project_metadata: Optional[dict] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    workflow_path: Optional[str] = None
    project_metadata: Optional[dict] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    workflow_path: Optional[str]
    project_metadata: Optional[dict]
    status: str
    created_at: datetime
    updated_at: datetime
    executions_count: int = 0
    files_count: int = 0


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建新项目"""
    project_id = str(uuid.uuid4())
    
    project = Project(
        id=project_id,
        name=project_data.name,
        description=project_data.description,
        workflow_path=project_data.workflow_path,
        project_metadata=project_data.project_metadata or {},
        status="active"
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        workflow_path=project.workflow_path,
        project_metadata=project.project_metadata,
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """获取项目列表"""
    query = select(Project)
    
    if status:
        query = query.where(Project.status == status)
    
    query = query.order_by(Project.created_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    # 获取每个项目的统计信息
    project_responses = []
    for project in projects:
        # 统计执行次数
        exec_result = await db.execute(
            select(func.count(Execution.id)).where(Execution.project_id == project.id)
        )
        executions_count = exec_result.scalar() or 0
        
        # 统计文件数量
        file_result = await db.execute(
            select(func.count(UploadedFile.id)).where(UploadedFile.project_id == project.id)
        )
        files_count = file_result.scalar() or 0
        
        project_responses.append(ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            workflow_path=project.workflow_path,
            project_metadata=project.project_metadata,
            status=project.status,
            created_at=project.created_at,
            updated_at=project.updated_at,
            executions_count=executions_count,
            files_count=files_count
        ))
    
    return project_responses


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取项目详情"""
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.executions),
            selectinload(Project.files)
        )
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        workflow_path=project.workflow_path,
        project_metadata=project.project_metadata,
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at,
        executions_count=len(project.executions),
        files_count=len(project.files)
    )


@router.get("/{project_id}/workspace", response_model=dict)
async def get_project_workspace(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取项目工作区数据"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 默认工作区数据
    workspace_data = {
        "nodes": [],
        "edges": [],
        "viewport": {"x": 0, "y": 0, "zoom": 1}
    }
    
    # 如果项目有关联的工作流文件，加载工作流数据
    if project.workflow_path:
        try:
            import json
            import os
            from app.core.config import settings
            
            workflow_file_path = os.path.join(settings.WORKFLOWS_DIR, f"{project.workflow_path}.json")
            if os.path.exists(workflow_file_path):
                with open(workflow_file_path, 'r', encoding='utf-8') as f:
                    workflow_data = json.load(f)
                    if 'configuration' in workflow_data:
                        workspace_data = workflow_data['configuration']
        except Exception as e:
            # 如果加载失败，使用默认数据
            pass
    
    project_info = {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "created_at": project.created_at.isoformat(),
        "updated_at": project.updated_at.isoformat()
    }
    
    return {
        "success": True,
        "workspace_data": workspace_data,
        "project_info": project_info
    }


class WorkspaceSyncRequest(BaseModel):
    workspace_data: dict
    auto_update_status: Optional[bool] = False


@router.post("/{project_id}/sync-workspace", response_model=dict)
async def sync_project_workspace(
    project_id: str,
    sync_request: WorkspaceSyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """同步工作区数据到项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    try:
        import json
        import os
        from app.core.config import settings
        
        # 确保工作流目录存在
        os.makedirs(settings.WORKFLOWS_DIR, exist_ok=True)
        
        # 生成工作流文件名（如果项目还没有关联的工作流文件）
        if not project.workflow_path:
            project.workflow_path = f"project_{project_id}_workflow"
        
        # 保存工作流数据到文件
        workflow_file_path = os.path.join(settings.WORKFLOWS_DIR, f"{project.workflow_path}.json")
        workflow_data = {
            "id": project.workflow_path,
            "name": f"{project.name} - 工作流",
            "description": "项目关联的数据处理工作流",
            "configuration": sync_request.workspace_data,
            "status": "active" if sync_request.workspace_data.get("nodes") else "draft",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        with open(workflow_file_path, 'w', encoding='utf-8') as f:
            json.dump(workflow_data, f, ensure_ascii=False, indent=2)
        
        # 更新项目信息
        updated_fields = ["workflow_path", "updated_at"]
        
        # 如果启用自动状态更新
        if sync_request.auto_update_status:
            nodes_count = len(sync_request.workspace_data.get("nodes", []))
            edges_count = len(sync_request.workspace_data.get("edges", []))
            
            if nodes_count == 0:
                project.status = "draft"
            elif nodes_count > 0 and edges_count > 0:
                project.status = "active"
            else:
                project.status = "draft"
            
            updated_fields.append("status")
        
        await db.commit()
        await db.refresh(project)
        
        return {
            "success": True,
            "updated_fields": updated_fields,
            "message": "工作区数据同步成功"
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"同步失败: {str(e)}"
        )


class ProjectStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None


@router.put("/{project_id}/status", response_model=dict)
async def update_project_status(
    project_id: str,
    status_update: ProjectStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新项目状态"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 验证状态值
    valid_statuses = ["active", "draft", "archived"]
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"无效的状态值。有效值: {', '.join(valid_statuses)}"
        )
    
    old_status = project.status
    project.status = status_update.status
    
    await db.commit()
    await db.refresh(project)
    
    return {
        "success": True,
        "old_status": old_status,
        "new_status": project.status,
        "reason": status_update.reason,
        "updated_at": project.updated_at.isoformat(),
        "message": f"项目状态已从 {old_status} 更新为 {project.status}"
    }


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 更新字段
    update_data = project_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        workflow_path=project.workflow_path,
        project_metadata=project.project_metadata,
        status=project.status,
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    await db.execute(delete(Project).where(Project.id == project_id))
    await db.commit()
    
    return {"message": "项目已删除"}


@router.post("/{project_id}/archive")
async def archive_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """归档项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    project.status = "archived"
    await db.commit()
    
    return {"message": "项目已归档"}


@router.post("/{project_id}/restore")
async def restore_project(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """恢复项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    project.status = "active"
    await db.commit()
    
    return {"message": "项目已恢复"}