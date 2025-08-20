"""数据转换API端点"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
import uuid
import os
import json
import xml.etree.ElementTree as ET
import polars as pl
import aiofiles
from datetime import datetime

from app.database import get_db
from app.models.file import UploadedFile
from app.models.project import Project
from app.core.config import settings
from app.services.data_processor import DataProcessor
from pydantic import BaseModel

router = APIRouter()


class TransformConfig(BaseModel):
    """数据转换配置"""
    source_format: str  # 源格式：csv, json, xml
    target_format: str  # 目标格式：csv, json, xml
    delimiter: Optional[str] = ","  # CSV分隔符
    encoding: Optional[str] = "utf-8"  # 文件编码
    has_header: Optional[bool] = True  # 是否有表头
    clean_options: Optional[Dict[str, Any]] = None  # 清洗选项


class CleanConfig(BaseModel):
    """数据清洗配置"""
    remove_duplicates: bool = False  # 移除重复行
    handle_missing: str = "keep"  # 处理缺失值：keep, drop, fill
    fill_value: Optional[str] = None  # 填充值
    remove_outliers: bool = False  # 移除异常值
    standardize_columns: bool = False  # 标准化列名
    date_columns: Optional[List[str]] = None  # 日期列
    numeric_columns: Optional[List[str]] = None  # 数值列


class TransformResponse(BaseModel):
    """转换响应"""
    task_id: str
    status: str
    message: str
    preview_data: Optional[List[Dict[str, Any]]] = None
    file_info: Optional[Dict[str, Any]] = None


@router.post("/upload", response_model=TransformResponse)
async def upload_file(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    transform_config: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """上传文件并进行格式检测"""
    
    # 验证项目是否存在
    project_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="项目不存在"
        )
    
    # 验证文件类型
    file_ext = os.path.splitext(file.filename)[1].lower()
    supported_formats = [".csv", ".json", ".xml", ".xlsx", ".xls"]
    
    if file_ext not in supported_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件格式: {file_ext}。支持的格式: {', '.join(supported_formats)}"
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
    
    try:
        # 保存文件
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # 读取并分析文件
        df = None
        file_info = {
            "filename": file.filename,
            "size": file.size,
            "format": file_ext.replace('.', ''),
            "encoding": "utf-8"
        }
        
        # 根据文件格式读取数据
        if file_ext == ".csv":
            df = pl.read_csv(file_path, encoding="utf-8")
        elif file_ext == ".json":
            df = pl.read_json(file_path)
        elif file_ext in [".xlsx", ".xls"]:
            df = pl.read_excel(file_path)
        
        if df is not None:
            # 获取数据预览
            preview_data = df.head(5).to_dicts()
            
            # 分析数据结构
            file_info.update({
                "rows": df.height,
                "columns": df.width,
                "column_names": df.columns,
                "column_types": [str(dtype) for dtype in df.dtypes]
            })
            
            # 检测时间列
            time_info = DataProcessor.detect_time_column(df)
            if time_info:
                file_info["time_column"] = time_info
        else:
            preview_data = []
        
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
            status="uploaded"
        )
        
        db.add(uploaded_file)
        await db.commit()
        await db.refresh(uploaded_file)
        
        return TransformResponse(
            task_id=file_id,
            status="success",
            message="文件上传成功",
            preview_data=preview_data,
            file_info=file_info
        )
        
    except Exception as e:
        # 清理文件
        if os.path.exists(file_path):
            os.remove(file_path)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件处理失败: {str(e)}"
        )


@router.post("/convert/{file_id}", response_model=TransformResponse)
async def convert_format(
    file_id: str,
    config: TransformConfig,
    db: AsyncSession = Depends(get_db)
):
    """转换文件格式"""
    
    # 获取文件信息
    file_result = await db.execute(
        select(UploadedFile).where(UploadedFile.id == file_id)
    )
    uploaded_file = file_result.scalar_one_or_none()
    
    if not uploaded_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    try:
        # 读取源文件
        source_path = uploaded_file.file_path
        df = None
        
        if config.source_format == "csv":
            df = pl.read_csv(
                source_path,
                separator=config.delimiter,
                encoding=config.encoding,
                has_header=config.has_header
            )
        elif config.source_format == "json":
            df = pl.read_json(source_path)
        elif config.source_format == "xml":
            # XML转换需要特殊处理
            df = _convert_xml_to_dataframe(source_path)
        
        if df is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无法读取源文件"
            )
        
        # 生成目标文件路径
        target_filename = f"{file_id}_converted.{config.target_format}"
        target_path = os.path.join(settings.UPLOAD_DIR, target_filename)
        
        # 转换格式
        if config.target_format == "csv":
            df.write_csv(target_path, separator=config.delimiter)
        elif config.target_format == "json":
            df.write_json(target_path)
        elif config.target_format == "xml":
            _convert_dataframe_to_xml(df, target_path)
        
        # 获取转换后的预览数据
        preview_data = df.head(5).to_dicts()
        
        # 更新文件状态
        uploaded_file.status = "converted"
        await db.commit()
        
        return TransformResponse(
            task_id=file_id,
            status="success",
            message=f"文件已成功转换为{config.target_format}格式",
            preview_data=preview_data,
            file_info={
                "original_format": config.source_format,
                "target_format": config.target_format,
                "target_file": target_filename,
                "rows": df.height,
                "columns": df.width
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"格式转换失败: {str(e)}"
        )


@router.post("/clean/{file_id}", response_model=TransformResponse)
async def clean_data(
    file_id: str,
    config: CleanConfig,
    db: AsyncSession = Depends(get_db)
):
    """清洗数据"""
    
    # 获取文件信息
    file_result = await db.execute(
        select(UploadedFile).where(UploadedFile.id == file_id)
    )
    uploaded_file = file_result.scalar_one_or_none()
    
    if not uploaded_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    try:
        # 读取文件
        source_path = uploaded_file.file_path
        file_ext = os.path.splitext(source_path)[1].lower()
        
        if file_ext == ".csv":
            df = pl.read_csv(source_path)
        elif file_ext == ".json":
            df = pl.read_json(source_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不支持的文件格式进行清洗"
            )
        
        original_rows = df.height
        
        # 数据清洗操作
        if config.remove_duplicates:
            df = df.unique()
        
        # 处理缺失值
        if config.handle_missing == "drop":
            df = df.drop_nulls()
        elif config.handle_missing == "fill" and config.fill_value:
            df = df.fill_null(config.fill_value)
        
        # 标准化列名
        if config.standardize_columns:
            new_columns = [col.lower().replace(' ', '_').replace('-', '_') for col in df.columns]
            df = df.rename(dict(zip(df.columns, new_columns)))
        
        # 处理日期列
        if config.date_columns:
            for col in config.date_columns:
                if col in df.columns:
                    try:
                        df = df.with_columns(
                            pl.col(col).str.strptime(pl.Datetime, "%Y-%m-%d")
                        )
                    except:
                        pass  # 忽略转换失败的列
        
        # 处理数值列
        if config.numeric_columns:
            for col in config.numeric_columns:
                if col in df.columns:
                    try:
                        df = df.with_columns(
                            pl.col(col).cast(pl.Float64)
                        )
                    except:
                        pass  # 忽略转换失败的列
        
        # 移除异常值（使用IQR方法）
        if config.remove_outliers and config.numeric_columns:
            for col in config.numeric_columns:
                if col in df.columns:
                    try:
                        q1 = df[col].quantile(0.25)
                        q3 = df[col].quantile(0.75)
                        iqr = q3 - q1
                        lower_bound = q1 - 1.5 * iqr
                        upper_bound = q3 + 1.5 * iqr
                        
                        df = df.filter(
                            (pl.col(col) >= lower_bound) & (pl.col(col) <= upper_bound)
                        )
                    except:
                        pass  # 忽略处理失败的列
        
        # 保存清洗后的文件
        cleaned_filename = f"{file_id}_cleaned{file_ext}"
        cleaned_path = os.path.join(settings.UPLOAD_DIR, cleaned_filename)
        
        if file_ext == ".csv":
            df.write_csv(cleaned_path)
        elif file_ext == ".json":
            df.write_json(cleaned_path)
        
        # 获取预览数据
        preview_data = df.head(5).to_dicts()
        
        # 更新文件状态
        uploaded_file.status = "cleaned"
        await db.commit()
        
        return TransformResponse(
            task_id=file_id,
            status="success",
            message="数据清洗完成",
            preview_data=preview_data,
            file_info={
                "original_rows": original_rows,
                "cleaned_rows": df.height,
                "removed_rows": original_rows - df.height,
                "cleaned_file": cleaned_filename,
                "columns": df.width
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"数据清洗失败: {str(e)}"
        )


def _convert_xml_to_dataframe(xml_path: str) -> pl.DataFrame:
    """将XML文件转换为DataFrame"""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    data = []
    for child in root:
        row = {}
        for subchild in child:
            row[subchild.tag] = subchild.text
        data.append(row)
    
    return pl.DataFrame(data)


def _convert_dataframe_to_xml(df: pl.DataFrame, xml_path: str):
    """将DataFrame转换为XML文件"""
    root = ET.Element("data")
    
    for row in df.to_dicts():
        record = ET.SubElement(root, "record")
        for key, value in row.items():
            field = ET.SubElement(record, key)
            field.text = str(value) if value is not None else ""
    
    tree = ET.ElementTree(root)
    tree.write(xml_path, encoding="utf-8", xml_declaration=True)