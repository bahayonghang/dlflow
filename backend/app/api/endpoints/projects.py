"""项目管理API端点"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
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
            select(db.func.count(Execution.id)).where(Execution.project_id == project.id)
        )
        executions_count = exec_result.scalar() or 0
        
        # 统计文件数量
        file_result = await db.execute(
            select(db.func.count(UploadedFile.id)).where(UploadedFile.project_id == project.id)
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

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.storage import ProjectStorage

router = APIRouter()


class ProjectCreate(BaseModel):
    """项目创建请求模型"""
    name: str
    description: Optional[str] = ""
    metadata: Optional[dict] = None


class ProjectUpdate(BaseModel):
    """项目更新请求模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[dict] = None
    status: Optional[str] = None


class ProjectResponse(BaseModel):
    """项目响应模型"""
    id: str
    name: str
    description: str
    workflow_path: str
    metadata: dict
    created_at: str
    updated_at: str
    status: str
    execution_count: int
    last_execution_id: str
    associated_files: List[str]


class ProjectListResponse(BaseModel):
    """项目列表响应模型"""
    projects: List[dict]
    total: int


@router.post("/", response_model=dict)
async def create_project(project: ProjectCreate):
    """创建新项目"""
    try:
        project_id = ProjectStorage.create_project(
            name=project.name,
            description=project.description or "",
            metadata=project.metadata or {}
        )
        
        return {
            "success": True,
            "project_id": project_id,
            "message": "项目创建成功"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建项目失败: {str(e)}"
        )


@router.get("/", response_model=ProjectListResponse)
async def list_projects():
    """获取项目列表"""
    try:
        projects = ProjectStorage.list_projects()
        return ProjectListResponse(
            projects=projects,
            total=len(projects)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取项目列表失败: {str(e)}"
        )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """获取项目详情"""
    project = ProjectStorage.get_project(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    return ProjectResponse(**project)


@router.put("/{project_id}", response_model=dict)
async def update_project(project_id: str, updates: ProjectUpdate):
    """更新项目信息"""
    # 检查项目是否存在
    existing_project = ProjectStorage.get_project(project_id)
    if not existing_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 准备更新数据
    update_data = {}
    if updates.name is not None:
        update_data["name"] = updates.name
    if updates.description is not None:
        update_data["description"] = updates.description
    if updates.metadata is not None:
        update_data["metadata"] = updates.metadata
    if updates.status is not None:
        update_data["status"] = updates.status
    
    try:
        success = ProjectStorage.update_project(project_id, update_data)
        
        if success:
            return {
                "success": True,
                "message": "项目更新成功"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="项目更新失败"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"项目更新失败: {str(e)}"
        )


@router.delete("/{project_id}", response_model=dict)
async def delete_project(project_id: str):
    """删除项目"""
    # 检查项目是否存在
    existing_project = ProjectStorage.get_project(project_id)
    if not existing_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    try:
        success = ProjectStorage.delete_project(project_id)
        
        if success:
            return {
                "success": True,
                "message": "项目删除成功"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="项目删除失败"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"项目删除失败: {str(e)}"
        )