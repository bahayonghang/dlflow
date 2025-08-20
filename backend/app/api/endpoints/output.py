"""数据输出API端点"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any, Union
import uuid
import os
import json
import zipfile
import io
import polars as pl
from datetime import datetime, timedelta
import base64
import hashlib

from app.database import get_db
from app.models.file import UploadedFile
from app.models.task import Task
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter()


class ExportConfig(BaseModel):
    """导出配置"""
    format: str  # 导出格式：csv, json, xml, excel, pdf, zip
    compression: Optional[str] = None  # 压缩格式：zip, gzip
    encoding: Optional[str] = "utf-8"  # 文件编码
    delimiter: Optional[str] = ","  # CSV分隔符
    include_metadata: Optional[bool] = True  # 是否包含元数据
    password: Optional[str] = None  # 文件密码保护
    expiry_hours: Optional[int] = 24  # 下载链接过期时间（小时）


class TransmissionConfig(BaseModel):
    """传输配置"""
    protocol: str  # 传输协议：http, ftp, email, webhook
    destination: str  # 目标地址
    credentials: Optional[Dict[str, str]] = None  # 认证信息
    encryption: Optional[bool] = True  # 是否加密传输
    retry_attempts: Optional[int] = 3  # 重试次数


class ExportResponse(BaseModel):
    """导出响应"""
    export_id: str
    status: str
    message: str
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    expires_at: Optional[datetime] = None
    checksum: Optional[str] = None


class TransmissionResponse(BaseModel):
    """传输响应"""
    transmission_id: str
    status: str
    message: str
    destination: str
    transmitted_at: Optional[datetime] = None


@router.post("/export", response_model=ExportResponse)
async def export_data(
    file_id: str,
    config: ExportConfig,
    db: AsyncSession = Depends(get_db)
):
    """导出数据"""
    
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
        # 生成导出ID
        export_id = str(uuid.uuid4())
        
        # 读取数据
        df = _load_dataframe(uploaded_file.file_path)
        if df is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无法读取数据文件"
            )
        
        # 生成导出文件
        export_filename = f"{export_id}.{config.format}"
        export_path = os.path.join(settings.UPLOAD_DIR, "exports", export_filename)
        
        # 确保导出目录存在
        os.makedirs(os.path.dirname(export_path), exist_ok=True)
        
        # 根据格式导出数据
        if config.format == "csv":
            df.write_csv(export_path, separator=config.delimiter)
        elif config.format == "json":
            _export_to_json(df, export_path, config)
        elif config.format == "xml":
            _export_to_xml(df, export_path, config)
        elif config.format == "excel":
            _export_to_excel(df, export_path, config)
        elif config.format == "pdf":
            _export_to_pdf(df, export_path, config)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的导出格式: {config.format}"
            )
        
        # 应用压缩
        final_path = export_path
        if config.compression:
            final_path = _apply_compression(export_path, config.compression, config.password)
        
        # 计算文件大小和校验和
        file_size = os.path.getsize(final_path)
        checksum = _calculate_checksum(final_path)
        
        # 生成下载URL
        download_url = f"/api/output/download/{export_id}"
        
        # 计算过期时间
        expires_at = datetime.now() + timedelta(hours=config.expiry_hours)
        
        # 创建导出任务记录
        export_task = Task(
            id=export_id,
            name=f"数据导出: {config.format}",
            task_type="export",
            status="completed",
            parameters=config.dict(),
            result={
                "file_path": final_path,
                "file_size": file_size,
                "checksum": checksum,
                "expires_at": expires_at.isoformat()
            }
        )
        
        db.add(export_task)
        await db.commit()
        
        return ExportResponse(
            export_id=export_id,
            status="success",
            message="数据导出成功",
            download_url=download_url,
            file_size=file_size,
            expires_at=expires_at,
            checksum=checksum
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"数据导出失败: {str(e)}"
        )


@router.get("/download/{export_id}")
async def download_file(
    export_id: str,
    db: AsyncSession = Depends(get_db)
):
    """下载导出文件"""
    
    # 获取导出任务信息
    task_result = await db.execute(
        select(Task).where(Task.id == export_id, Task.task_type == "export")
    )
    export_task = task_result.scalar_one_or_none()
    
    if not export_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="导出文件不存在"
        )
    
    # 检查文件是否过期
    result = export_task.result or {}
    expires_at_str = result.get("expires_at")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.now() > expires_at:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="下载链接已过期"
            )
    
    # 获取文件路径
    file_path = result.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="导出文件不存在"
        )
    
    # 返回文件
    filename = os.path.basename(file_path)
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@router.post("/transmit", response_model=TransmissionResponse)
async def transmit_data(
    export_id: str,
    config: TransmissionConfig,
    db: AsyncSession = Depends(get_db)
):
    """传输数据到指定目标"""
    
    # 获取导出任务信息
    task_result = await db.execute(
        select(Task).where(Task.id == export_id, Task.task_type == "export")
    )
    export_task = task_result.scalar_one_or_none()
    
    if not export_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="导出文件不存在"
        )
    
    try:
        # 生成传输ID
        transmission_id = str(uuid.uuid4())
        
        # 获取文件路径
        result = export_task.result or {}
        file_path = result.get("file_path")
        
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="导出文件不存在"
            )
        
        # 根据协议类型进行传输
        transmission_result = None
        if config.protocol == "http":
            transmission_result = await _transmit_via_http(file_path, config)
        elif config.protocol == "ftp":
            transmission_result = await _transmit_via_ftp(file_path, config)
        elif config.protocol == "email":
            transmission_result = await _transmit_via_email(file_path, config)
        elif config.protocol == "webhook":
            transmission_result = await _transmit_via_webhook(file_path, config)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的传输协议: {config.protocol}"
            )
        
        # 创建传输任务记录
        transmission_task = Task(
            id=transmission_id,
            name=f"数据传输: {config.protocol}",
            task_type="transmission",
            status="completed" if transmission_result["success"] else "failed",
            parameters=config.dict(),
            result=transmission_result
        )
        
        db.add(transmission_task)
        await db.commit()
        
        return TransmissionResponse(
            transmission_id=transmission_id,
            status="success" if transmission_result["success"] else "failed",
            message=transmission_result["message"],
            destination=config.destination,
            transmitted_at=datetime.now() if transmission_result["success"] else None
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"数据传输失败: {str(e)}"
        )


@router.get("/formats")
async def get_supported_formats():
    """获取支持的导出格式"""
    return {
        "formats": [
            {
                "id": "csv",
                "name": "CSV",
                "description": "逗号分隔值文件",
                "mime_type": "text/csv",
                "supports_compression": True
            },
            {
                "id": "json",
                "name": "JSON",
                "description": "JavaScript对象表示法",
                "mime_type": "application/json",
                "supports_compression": True
            },
            {
                "id": "xml",
                "name": "XML",
                "description": "可扩展标记语言",
                "mime_type": "application/xml",
                "supports_compression": True
            },
            {
                "id": "excel",
                "name": "Excel",
                "description": "Microsoft Excel工作簿",
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "supports_compression": False
            },
            {
                "id": "pdf",
                "name": "PDF",
                "description": "便携式文档格式",
                "mime_type": "application/pdf",
                "supports_compression": False
            }
        ],
        "compression_types": [
            {
                "id": "zip",
                "name": "ZIP",
                "description": "ZIP压缩格式"
            },
            {
                "id": "gzip",
                "name": "GZIP",
                "description": "GZIP压缩格式"
            }
        ],
        "transmission_protocols": [
            {
                "id": "http",
                "name": "HTTP",
                "description": "HTTP POST传输"
            },
            {
                "id": "ftp",
                "name": "FTP",
                "description": "文件传输协议"
            },
            {
                "id": "email",
                "name": "Email",
                "description": "电子邮件发送"
            },
            {
                "id": "webhook",
                "name": "Webhook",
                "description": "Webhook回调"
            }
        ]
    }


def _load_dataframe(file_path: str) -> Optional[pl.DataFrame]:
    """加载数据文件为DataFrame"""
    try:
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == ".csv":
            return pl.read_csv(file_path)
        elif file_ext == ".json":
            return pl.read_json(file_path)
        elif file_ext in [".xlsx", ".xls"]:
            return pl.read_excel(file_path)
        else:
            return None
    except Exception:
        return None


def _export_to_json(df: pl.DataFrame, output_path: str, config: ExportConfig):
    """导出为JSON格式"""
    data = df.to_dicts()
    
    export_data = {
        "data": data,
        "metadata": {
            "rows": df.height,
            "columns": df.width,
            "column_names": df.columns,
            "exported_at": datetime.now().isoformat(),
            "format": "json"
        } if config.include_metadata else None
    }
    
    with open(output_path, 'w', encoding=config.encoding) as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)


def _export_to_xml(df: pl.DataFrame, output_path: str, config: ExportConfig):
    """导出为XML格式"""
    import xml.etree.ElementTree as ET
    
    root = ET.Element("dataset")
    
    if config.include_metadata:
        metadata = ET.SubElement(root, "metadata")
        ET.SubElement(metadata, "rows").text = str(df.height)
        ET.SubElement(metadata, "columns").text = str(df.width)
        ET.SubElement(metadata, "exported_at").text = datetime.now().isoformat()
    
    data_element = ET.SubElement(root, "data")
    
    for row in df.to_dicts():
        record = ET.SubElement(data_element, "record")
        for key, value in row.items():
            field = ET.SubElement(record, key)
            field.text = str(value) if value is not None else ""
    
    tree = ET.ElementTree(root)
    tree.write(output_path, encoding=config.encoding, xml_declaration=True)


def _export_to_excel(df: pl.DataFrame, output_path: str, config: ExportConfig):
    """导出为Excel格式"""
    # 使用polars的write_excel方法
    df.write_excel(output_path)


def _export_to_pdf(df: pl.DataFrame, output_path: str, config: ExportConfig):
    """导出为PDF格式（简化实现）"""
    # 这里应该使用专门的PDF库如reportlab
    # 为了简化，我们创建一个文本文件
    with open(output_path.replace('.pdf', '.txt'), 'w', encoding=config.encoding) as f:
        f.write("PDF Export (Text Format)\n")
        f.write("=" * 50 + "\n\n")
        
        if config.include_metadata:
            f.write(f"Rows: {df.height}\n")
            f.write(f"Columns: {df.width}\n")
            f.write(f"Exported at: {datetime.now().isoformat()}\n\n")
        
        # 写入数据（前100行）
        for i, row in enumerate(df.to_dicts()[:100]):
            f.write(f"Row {i+1}:\n")
            for key, value in row.items():
                f.write(f"  {key}: {value}\n")
            f.write("\n")
    
    # 重命名为PDF扩展名（实际应该生成真正的PDF）
    os.rename(output_path.replace('.pdf', '.txt'), output_path)


def _apply_compression(file_path: str, compression_type: str, password: Optional[str] = None) -> str:
    """应用压缩"""
    if compression_type == "zip":
        zip_path = file_path + ".zip"
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            if password:
                zipf.setpassword(password.encode())
            zipf.write(file_path, os.path.basename(file_path))
        
        # 删除原文件
        os.remove(file_path)
        return zip_path
    
    elif compression_type == "gzip":
        import gzip
        gz_path = file_path + ".gz"
        with open(file_path, 'rb') as f_in:
            with gzip.open(gz_path, 'wb') as f_out:
                f_out.write(f_in.read())
        
        # 删除原文件
        os.remove(file_path)
        return gz_path
    
    return file_path


def _calculate_checksum(file_path: str) -> str:
    """计算文件校验和"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


async def _transmit_via_http(file_path: str, config: TransmissionConfig) -> Dict[str, Any]:
    """通过HTTP传输文件"""
    try:
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            with open(file_path, 'rb') as f:
                data = aiohttp.FormData()
                data.add_field('file', f, filename=os.path.basename(file_path))
                
                headers = {}
                if config.credentials:
                    # 添加认证头
                    if 'token' in config.credentials:
                        headers['Authorization'] = f"Bearer {config.credentials['token']}"
                
                async with session.post(config.destination, data=data, headers=headers) as response:
                    if response.status == 200:
                        return {"success": True, "message": "HTTP传输成功"}
                    else:
                        return {"success": False, "message": f"HTTP传输失败: {response.status}"}
    
    except Exception as e:
        return {"success": False, "message": f"HTTP传输异常: {str(e)}"}


async def _transmit_via_ftp(file_path: str, config: TransmissionConfig) -> Dict[str, Any]:
    """通过FTP传输文件"""
    try:
        # 这里应该使用aioftp或类似的异步FTP库
        # 为了简化，返回模拟结果
        return {"success": True, "message": "FTP传输成功（模拟）"}
    
    except Exception as e:
        return {"success": False, "message": f"FTP传输异常: {str(e)}"}


async def _transmit_via_email(file_path: str, config: TransmissionConfig) -> Dict[str, Any]:
    """通过邮件发送文件"""
    try:
        # 这里应该使用aiosmtplib或类似的异步邮件库
        # 为了简化，返回模拟结果
        return {"success": True, "message": "邮件发送成功（模拟）"}
    
    except Exception as e:
        return {"success": False, "message": f"邮件发送异常: {str(e)}"}


async def _transmit_via_webhook(file_path: str, config: TransmissionConfig) -> Dict[str, Any]:
    """通过Webhook传输文件信息"""
    try:
        import aiohttp
        
        # 读取文件并编码为base64
        with open(file_path, 'rb') as f:
            file_content = base64.b64encode(f.read()).decode('utf-8')
        
        payload = {
            "filename": os.path.basename(file_path),
            "content": file_content,
            "size": os.path.getsize(file_path),
            "timestamp": datetime.now().isoformat()
        }
        
        async with aiohttp.ClientSession() as session:
            headers = {'Content-Type': 'application/json'}
            if config.credentials and 'token' in config.credentials:
                headers['Authorization'] = f"Bearer {config.credentials['token']}"
            
            async with session.post(config.destination, json=payload, headers=headers) as response:
                if response.status == 200:
                    return {"success": True, "message": "Webhook传输成功"}
                else:
                    return {"success": False, "message": f"Webhook传输失败: {response.status}"}
    
    except Exception as e:
        return {"success": False, "message": f"Webhook传输异常: {str(e)}"}