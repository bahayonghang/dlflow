"""文件管理API端点"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from datetime import datetime
import uuid
import os
import aiofiles

from app.database import get_db
from app.models.file import UploadedFile
from app.models.project import Project
from app.core.config import settings
from app.services.task_manager import TaskManager
from pydantic import BaseModel

router = APIRouter()


class FileResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    file_type: str
    mime_type: str
    status: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime


@router.post("/upload", response_model=FileResponse)
async def upload_file(
    project_id: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """上传文件"""
    # 验证项目是否存在
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 验证文件类型
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型: {file_ext}"
        )
    
    # 验证文件大小
    if file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"文件大小超过限制: {settings.MAX_FILE_SIZE} bytes"
        )
    
    # 生成文件ID和路径
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)
    
    # 确保上传目录存在
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # 保存文件
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # 创建文件记录
    uploaded_file = UploadedFile(
        id=file_id,
        project_id=project_id,
        filename=filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=file.size,
        file_type=file_ext.replace('.', ''),
        mime_type=file.content_type,
        status="uploaded",
        description=description
    )
    
    db.add(uploaded_file)
    await db.commit()
    await db.refresh(uploaded_file)
    
    # 创建数据处理任务
    await TaskManager.create_task(
        name=f"处理文件: {file.filename}",
        task_type="data_processing",
        parameters={
            "file_path": file_path,
            "file_id": file_id,
            "processing_config": {
                "detect_time_column": True,
                "analyze_variables": True
            }
        }
    )
    
    return FileResponse(
        id=uploaded_file.id,
        project_id=uploaded_file.project_id,
        filename=uploaded_file.filename,
        original_filename=uploaded_file.original_filename,
        file_path=uploaded_file.file_path,
        file_size=uploaded_file.file_size,
        file_type=uploaded_file.file_type,
        mime_type=uploaded_file.mime_type,
        status=uploaded_file.status,
        description=uploaded_file.description,
        created_at=uploaded_file.created_at,
        updated_at=uploaded_file.updated_at
    )


@router.get("/", response_model=List[FileResponse])
async def list_files(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    file_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """获取文件列表"""
    query = select(UploadedFile)
    
    if project_id:
        query = query.where(UploadedFile.project_id == project_id)
    if status:
        query = query.where(UploadedFile.status == status)
    if file_type:
        query = query.where(UploadedFile.file_type == file_type)
    
    query = query.order_by(UploadedFile.created_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    files = result.scalars().all()
    
    return [
        FileResponse(
            id=file.id,
            project_id=file.project_id,
            filename=file.filename,
            original_filename=file.original_filename,
            file_path=file.file_path,
            file_size=file.file_size,
            file_type=file.file_type,
            mime_type=file.mime_type,
            status=file.status,
            description=file.description,
            created_at=file.created_at,
            updated_at=file.updated_at
        )
        for file in files
    ]


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取文件详情"""
    result = await db.execute(select(UploadedFile).where(UploadedFile.id == file_id))
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    return FileResponse(
        id=file.id,
        project_id=file.project_id,
        filename=file.filename,
        original_filename=file.original_filename,
        file_path=file.file_path,
        file_size=file.file_size,
        file_type=file.file_type,
        mime_type=file.mime_type,
        status=file.status,
        description=file.description,
        created_at=file.created_at,
        updated_at=file.updated_at
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除文件"""
    result = await db.execute(select(UploadedFile).where(UploadedFile.id == file_id))
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    # 删除物理文件
    try:
        if os.path.exists(file.file_path):
            os.remove(file.file_path)
    except Exception as e:
        # 记录错误但不阻止删除数据库记录
        pass
    
    # 删除数据库记录
    await db.execute(delete(UploadedFile).where(UploadedFile.id == file_id))
    await db.commit()
    
    return {"message": "文件已删除"}


@router.post("/{file_id}/process")
async def process_file(
    file_id: str,
    db: AsyncSession = Depends(get_db)
):
    """手动触发文件处理"""
    result = await db.execute(select(UploadedFile).where(UploadedFile.id == file_id))
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    # 创建数据处理任务
    task_id = await TaskManager.create_task(
        name=f"重新处理文件: {file.original_filename}",
        task_type="data_processing",
        parameters={
            "file_path": file.file_path,
            "file_id": file.id,
            "processing_config": {
                "detect_time_column": True,
                "analyze_variables": True
            }
        }
    )
    
    return {"message": "文件处理任务已创建", "task_id": task_id}