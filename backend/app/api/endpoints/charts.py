"""图表生成API端点"""

from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.storage import JSONStorage
from app.core.config import settings
from app.services.data_processor import DataProcessor
import os
import uuid
from datetime import datetime
import polars as pl

router = APIRouter()


class ChartGenerateRequest(BaseModel):
    """图表生成请求模型"""
    file_id: str
    chart_type: str
    x_field: str
    y_field: Optional[str] = None
    config: Optional[dict] = None


class ChartGenerateResponse(BaseModel):
    """图表生成响应模型"""
    success: bool
    chart_data: dict


@router.post("/generate", response_model=ChartGenerateResponse)
async def generate_chart(request: ChartGenerateRequest):
    """生成图表"""
    # 获取文件元数据
    metadata_path = os.path.join(settings.UPLOAD_DIR, "metadata", f"{request.file_id}.json")
    metadata = JSONStorage.load_json(metadata_path)
    
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文件不存在"
        )
    
    try:
        # 读取数据文件
        file_path = metadata["file_path"]
        
        if metadata["file_type"] == "csv":
            df = pl.read_csv(file_path)
        elif metadata["file_type"] == "parquet":
            df = pl.read_parquet(file_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不支持的文件类型"
            )
        
        # 验证字段是否存在
        if request.x_field not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"字段 {request.x_field} 不存在"
            )
        
        if request.y_field and request.y_field not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"字段 {request.y_field} 不存在"
            )
        
        # 生成图表数据
        chart_data = _generate_chart_data(df, request)
        
        # 保存图表配置
        chart_id = str(uuid.uuid4())
        chart_config = {
            "id": chart_id,
            "task_id": "",  # 如果是任务生成的图表，这里会有task_id
            "chart_type": request.chart_type,
            "chart_data": chart_data,
            "chart_options": request.config or {},
            "created_at": datetime.now().isoformat()
        }
        
        chart_file = os.path.join(settings.CHARTS_DIR, f"{chart_id}.json")
        JSONStorage.save_json(chart_file, chart_config)
        
        return ChartGenerateResponse(
            success=True,
            chart_data=chart_data
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成图表失败: {str(e)}"
        )


def _generate_chart_data(df: pl.DataFrame, request: ChartGenerateRequest) -> dict:
    """生成图表数据"""
    chart_type = request.chart_type
    x_field = request.x_field
    y_field = request.y_field
    
    if chart_type == "bar":
        # 柱状图
        if y_field:
            # 双字段柱状图
            chart_df = df.select([x_field, y_field]).limit(100)  # 限制数据量
            data = chart_df.to_dicts()
        else:
            # 单字段频次柱状图
            chart_df = df.group_by(x_field).agg(pl.count().alias("count")).sort("count", descending=True).limit(20)
            data = chart_df.to_dicts()
            y_field = "count"
        
        return {
            "type": "bar",
            "x_field": x_field,
            "y_field": y_field,
            "data": data
        }
    
    elif chart_type == "line":
        # 折线图
        if not y_field:
            raise ValueError("折线图需要指定Y轴字段")
        
        chart_df = df.select([x_field, y_field]).sort(x_field).limit(1000)
        data = chart_df.to_dicts()
        
        return {
            "type": "line",
            "x_field": x_field,
            "y_field": y_field,
            "data": data
        }
    
    elif chart_type == "scatter":
        # 散点图
        if not y_field:
            raise ValueError("散点图需要指定Y轴字段")
        
        chart_df = df.select([x_field, y_field]).limit(1000)
        data = chart_df.to_dicts()
        
        return {
            "type": "scatter",
            "x_field": x_field,
            "y_field": y_field,
            "data": data
        }
    
    elif chart_type == "heatmap":
        # 热力图（需要两个分类字段）
        if not y_field:
            raise ValueError("热力图需要指定Y轴字段")
        
        # 计算交叉表
        chart_df = df.group_by([x_field, y_field]).agg(pl.count().alias("value"))
        data = chart_df.to_dicts()
        
        return {
            "type": "heatmap",
            "x_field": x_field,
            "y_field": y_field,
            "data": data
        }
    
    else:
        raise ValueError(f"不支持的图表类型: {chart_type}")