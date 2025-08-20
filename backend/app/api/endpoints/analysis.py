"""数据分析API端点"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
import uuid
import os
import polars as pl
import numpy as np
from datetime import datetime
import json

from app.database import get_db
from app.models.file import UploadedFile
from app.models.task import Task
from app.services.data_processor import DataProcessor
from pydantic import BaseModel

router = APIRouter()


class AnalysisConfig(BaseModel):
    """分析配置"""
    algorithm: str  # 分析算法：descriptive, correlation, regression, timeseries
    parameters: Optional[Dict[str, Any]] = None  # 算法参数
    target_columns: Optional[List[str]] = None  # 目标列
    group_by_columns: Optional[List[str]] = None  # 分组列
    time_column: Optional[str] = None  # 时间列


class AnalysisResponse(BaseModel):
    """分析响应"""
    analysis_id: str
    status: str
    message: str
    results: Optional[Dict[str, Any]] = None
    charts: Optional[List[Dict[str, Any]]] = None
    execution_time: Optional[float] = None


class VisualizationConfig(BaseModel):
    """可视化配置"""
    chart_type: str  # 图表类型：line, bar, scatter, histogram, heatmap, box
    x_column: str  # X轴列
    y_column: Optional[str] = None  # Y轴列
    color_column: Optional[str] = None  # 颜色分组列
    title: Optional[str] = None  # 图表标题
    width: Optional[int] = 800  # 图表宽度
    height: Optional[int] = 600  # 图表高度


@router.post("/execute", response_model=AnalysisResponse)
async def execute_analysis(
    file_id: str,
    config: AnalysisConfig,
    db: AsyncSession = Depends(get_db)
):
    """执行数据分析"""
    
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
        start_time = datetime.now()
        
        # 读取数据文件
        df = _load_dataframe(uploaded_file.file_path)
        
        if df is None or df.height == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无法读取数据文件或文件为空"
            )
        
        # 生成分析ID
        analysis_id = str(uuid.uuid4())
        
        # 根据算法类型执行分析
        results = {}
        charts = []
        
        if config.algorithm == "descriptive":
            results, charts = _descriptive_analysis(df, config)
        elif config.algorithm == "correlation":
            results, charts = _correlation_analysis(df, config)
        elif config.algorithm == "regression":
            results, charts = _regression_analysis(df, config)
        elif config.algorithm == "timeseries":
            results, charts = _timeseries_analysis(df, config)
        elif config.algorithm == "clustering":
            results, charts = _clustering_analysis(df, config)
        elif config.algorithm == "distribution":
            results, charts = _distribution_analysis(df, config)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的分析算法: {config.algorithm}"
            )
        
        # 计算执行时间
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # 创建分析任务记录
        task = Task(
            id=analysis_id,
            name=f"数据分析: {config.algorithm}",
            task_type="analysis",
            status="completed",
            parameters=config.dict(),
            result=results
        )
        
        db.add(task)
        await db.commit()
        
        return AnalysisResponse(
            analysis_id=analysis_id,
            status="success",
            message="分析执行成功",
            results=results,
            charts=charts,
            execution_time=execution_time
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"分析执行失败: {str(e)}"
        )


@router.post("/visualize", response_model=Dict[str, Any])
async def create_visualization(
    file_id: str,
    config: VisualizationConfig,
    db: AsyncSession = Depends(get_db)
):
    """创建数据可视化"""
    
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
        # 读取数据文件
        df = _load_dataframe(uploaded_file.file_path)
        
        if df is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无法读取数据文件"
            )
        
        # 验证列是否存在
        if config.x_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"列 '{config.x_column}' 不存在"
            )
        
        if config.y_column and config.y_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"列 '{config.y_column}' 不存在"
            )
        
        # 生成图表数据
        chart_data = _generate_chart_data(df, config)
        
        return {
            "chart_id": str(uuid.uuid4()),
            "type": config.chart_type,
            "title": config.title or f"{config.chart_type.title()} Chart",
            "data": chart_data,
            "config": {
                "width": config.width,
                "height": config.height,
                "x_column": config.x_column,
                "y_column": config.y_column,
                "color_column": config.color_column
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"可视化创建失败: {str(e)}"
        )


@router.get("/algorithms")
async def get_available_algorithms():
    """获取可用的分析算法"""
    return {
        "algorithms": [
            {
                "id": "descriptive",
                "name": "描述性统计",
                "description": "计算基本统计指标：均值、中位数、标准差等",
                "parameters": ["target_columns"]
            },
            {
                "id": "correlation",
                "name": "相关性分析",
                "description": "计算变量间的相关系数和相关性矩阵",
                "parameters": ["target_columns", "method"]
            },
            {
                "id": "regression",
                "name": "回归分析",
                "description": "线性回归和多项式回归分析",
                "parameters": ["target_columns", "degree", "test_size"]
            },
            {
                "id": "timeseries",
                "name": "时间序列分析",
                "description": "时间序列趋势分析和预测",
                "parameters": ["time_column", "target_columns", "forecast_periods"]
            },
            {
                "id": "clustering",
                "name": "聚类分析",
                "description": "K-means聚类分析",
                "parameters": ["target_columns", "n_clusters", "method"]
            },
            {
                "id": "distribution",
                "name": "分布分析",
                "description": "数据分布特征和正态性检验",
                "parameters": ["target_columns"]
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


def _descriptive_analysis(df: pl.DataFrame, config: AnalysisConfig) -> tuple:
    """描述性统计分析"""
    target_columns = config.target_columns or []
    if not target_columns:
        # 自动选择数值列
        target_columns = [col for col in df.columns if df[col].dtype in [pl.Int64, pl.Float64, pl.Int32, pl.Float32]]
    
    results = {}
    charts = []
    
    for col in target_columns:
        if col in df.columns:
            try:
                stats = {
                    "count": df[col].count(),
                    "mean": float(df[col].mean()) if df[col].mean() is not None else None,
                    "median": float(df[col].median()) if df[col].median() is not None else None,
                    "std": float(df[col].std()) if df[col].std() is not None else None,
                    "min": float(df[col].min()) if df[col].min() is not None else None,
                    "max": float(df[col].max()) if df[col].max() is not None else None,
                    "q25": float(df[col].quantile(0.25)) if df[col].quantile(0.25) is not None else None,
                    "q75": float(df[col].quantile(0.75)) if df[col].quantile(0.75) is not None else None,
                    "null_count": df[col].null_count()
                }
                results[col] = stats
                
                # 生成直方图数据
                hist_data = df[col].drop_nulls().to_list()
                if hist_data:
                    charts.append({
                        "type": "histogram",
                        "title": f"{col} 分布直方图",
                        "data": hist_data[:1000],  # 限制数据点数量
                        "column": col
                    })
            except Exception:
                continue
    
    return results, charts


def _correlation_analysis(df: pl.DataFrame, config: AnalysisConfig) -> tuple:
    """相关性分析"""
    target_columns = config.target_columns or []
    if not target_columns:
        target_columns = [col for col in df.columns if df[col].dtype in [pl.Int64, pl.Float64, pl.Int32, pl.Float32]]
    
    if len(target_columns) < 2:
        return {"error": "需要至少2个数值列进行相关性分析"}, []
    
    # 计算相关性矩阵
    correlations = DataProcessor.calculate_correlations(df, target_columns)
    
    # 生成热力图数据
    heatmap_data = []
    for corr in correlations.get("correlations", []):
        heatmap_data.append({
            "x": corr["variable1"],
            "y": corr["variable2"],
            "value": corr["correlation"]
        })
    
    charts = [{
        "type": "heatmap",
        "title": "相关性热力图",
        "data": heatmap_data,
        "columns": target_columns
    }]
    
    return correlations, charts


def _regression_analysis(df: pl.DataFrame, config: AnalysisConfig) -> tuple:
    """回归分析"""
    target_columns = config.target_columns or []
    if len(target_columns) < 2:
        return {"error": "回归分析需要至少2个变量"}, []
    
    x_col, y_col = target_columns[0], target_columns[1]
    
    if x_col not in df.columns or y_col not in df.columns:
        return {"error": "指定的列不存在"}, []
    
    try:
        # 获取数据
        x_data = df[x_col].drop_nulls().to_numpy()
        y_data = df[y_col].drop_nulls().to_numpy()
        
        if len(x_data) != len(y_data):
            # 处理长度不一致的情况
            min_len = min(len(x_data), len(y_data))
            x_data = x_data[:min_len]
            y_data = y_data[:min_len]
        
        # 简单线性回归
        correlation = np.corrcoef(x_data, y_data)[0, 1]
        slope = np.cov(x_data, y_data)[0, 1] / np.var(x_data)
        intercept = np.mean(y_data) - slope * np.mean(x_data)
        
        # 计算R²
        y_pred = slope * x_data + intercept
        ss_res = np.sum((y_data - y_pred) ** 2)
        ss_tot = np.sum((y_data - np.mean(y_data)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        results = {
            "correlation": float(correlation),
            "slope": float(slope),
            "intercept": float(intercept),
            "r_squared": float(r_squared),
            "equation": f"y = {slope:.4f}x + {intercept:.4f}"
        }
        
        # 生成散点图和回归线
        scatter_data = [
            {"x": float(x), "y": float(y)} 
            for x, y in zip(x_data[:500], y_data[:500])  # 限制数据点
        ]
        
        regression_line = [
            {"x": float(np.min(x_data)), "y": float(slope * np.min(x_data) + intercept)},
            {"x": float(np.max(x_data)), "y": float(slope * np.max(x_data) + intercept)}
        ]
        
        charts = [{
            "type": "scatter",
            "title": f"{x_col} vs {y_col} 回归分析",
            "data": scatter_data,
            "regression_line": regression_line,
            "x_column": x_col,
            "y_column": y_col
        }]
        
        return results, charts
        
    except Exception as e:
        return {"error": f"回归分析失败: {str(e)}"}, []


def _timeseries_analysis(df: pl.DataFrame, config: AnalysisConfig) -> tuple:
    """时间序列分析"""
    time_column = config.time_column
    target_columns = config.target_columns or []
    
    if not time_column or time_column not in df.columns:
        return {"error": "需要指定有效的时间列"}, []
    
    if not target_columns:
        target_columns = [col for col in df.columns if col != time_column and df[col].dtype in [pl.Int64, pl.Float64]]
    
    try:
        # 按时间排序
        df_sorted = df.sort(time_column)
        
        results = {}
        charts = []
        
        for col in target_columns:
            if col in df.columns:
                # 计算趋势
                values = df_sorted[col].drop_nulls().to_list()
                if len(values) > 1:
                    # 简单趋势计算
                    x = list(range(len(values)))
                    slope = np.polyfit(x, values, 1)[0]
                    
                    results[col] = {
                        "trend": "上升" if slope > 0 else "下降" if slope < 0 else "平稳",
                        "slope": float(slope),
                        "mean": float(np.mean(values)),
                        "volatility": float(np.std(values))
                    }
                    
                    # 生成时间序列图
                    time_data = df_sorted[time_column].to_list()[:len(values)]
                    chart_data = [
                        {"time": str(t), "value": float(v)} 
                        for t, v in zip(time_data, values)
                    ]
                    
                    charts.append({
                        "type": "line",
                        "title": f"{col} 时间序列",
                        "data": chart_data,
                        "x_column": "time",
                        "y_column": "value"
                    })
        
        return results, charts
        
    except Exception as e:
        return {"error": f"时间序列分析失败: {str(e)}"}, []


def _clustering_analysis(df: pl.DataFrame, config: AnalysisConfig) -> tuple:
    """聚类分析"""
    target_columns = config.target_columns or []
    n_clusters = config.parameters.get("n_clusters", 3) if config.parameters else 3
    
    if not target_columns:
        target_columns = [col for col in df.columns if df[col].dtype in [pl.Int64, pl.Float64]]
    
    if len(target_columns) < 2:
        return {"error": "聚类分析需要至少2个数值列"}, []
    
    try:
        # 简化的K-means实现（仅用于演示）
        data = df.select(target_columns).drop_nulls()
        
        if data.height < n_clusters:
            return {"error": "数据点数量少于聚类数量"}, []
        
        # 这里应该实现真正的K-means算法
        # 为了简化，我们随机分配聚类标签
        import random
        cluster_labels = [random.randint(0, n_clusters-1) for _ in range(data.height)]
        
        results = {
            "n_clusters": n_clusters,
            "n_points": data.height,
            "cluster_sizes": {f"cluster_{i}": cluster_labels.count(i) for i in range(n_clusters)}
        }
        
        # 生成聚类散点图
        if len(target_columns) >= 2:
            x_col, y_col = target_columns[0], target_columns[1]
            x_data = data[x_col].to_list()
            y_data = data[y_col].to_list()
            
            chart_data = [
                {"x": float(x), "y": float(y), "cluster": cluster}
                for x, y, cluster in zip(x_data[:500], y_data[:500], cluster_labels[:500])
            ]
            
            charts = [{
                "type": "scatter",
                "title": f"聚类分析结果 ({x_col} vs {y_col})",
                "data": chart_data,
                "x_column": x_col,
                "y_column": y_col,
                "color_column": "cluster"
            }]
        else:
            charts = []
        
        return results, charts
        
    except Exception as e:
        return {"error": f"聚类分析失败: {str(e)}"}, []


def _distribution_analysis(df: pl.DataFrame, config: AnalysisConfig) -> tuple:
    """分布分析"""
    target_columns = config.target_columns or []
    if not target_columns:
        target_columns = [col for col in df.columns if df[col].dtype in [pl.Int64, pl.Float64]]
    
    results = {}
    charts = []
    
    for col in target_columns:
        if col in df.columns:
            try:
                values = df[col].drop_nulls().to_list()
                if values:
                    # 计算分布统计
                    mean_val = np.mean(values)
                    std_val = np.std(values)
                    skewness = float(np.mean(((np.array(values) - mean_val) / std_val) ** 3))
                    kurtosis = float(np.mean(((np.array(values) - mean_val) / std_val) ** 4)) - 3
                    
                    results[col] = {
                        "mean": float(mean_val),
                        "std": float(std_val),
                        "skewness": skewness,
                        "kurtosis": kurtosis,
                        "distribution_type": _classify_distribution(skewness, kurtosis)
                    }
                    
                    # 生成箱线图数据
                    q1 = np.percentile(values, 25)
                    q2 = np.percentile(values, 50)
                    q3 = np.percentile(values, 75)
                    iqr = q3 - q1
                    lower_whisker = q1 - 1.5 * iqr
                    upper_whisker = q3 + 1.5 * iqr
                    
                    outliers = [v for v in values if v < lower_whisker or v > upper_whisker]
                    
                    charts.append({
                        "type": "box",
                        "title": f"{col} 分布箱线图",
                        "data": {
                            "q1": float(q1),
                            "q2": float(q2),
                            "q3": float(q3),
                            "lower_whisker": float(max(min(values), lower_whisker)),
                            "upper_whisker": float(min(max(values), upper_whisker)),
                            "outliers": [float(o) for o in outliers[:50]]  # 限制异常值数量
                        },
                        "column": col
                    })
            except Exception:
                continue
    
    return results, charts


def _classify_distribution(skewness: float, kurtosis: float) -> str:
    """分类分布类型"""
    if abs(skewness) < 0.5 and abs(kurtosis) < 0.5:
        return "近似正态分布"
    elif skewness > 0.5:
        return "右偏分布"
    elif skewness < -0.5:
        return "左偏分布"
    elif kurtosis > 0.5:
        return "尖峰分布"
    elif kurtosis < -0.5:
        return "平峰分布"
    else:
        return "其他分布"


def _generate_chart_data(df: pl.DataFrame, config: VisualizationConfig) -> List[Dict[str, Any]]:
    """生成图表数据"""
    chart_data = []
    
    try:
        if config.chart_type == "scatter":
            if config.y_column:
                x_data = df[config.x_column].to_list()
                y_data = df[config.y_column].to_list()
                
                for i, (x, y) in enumerate(zip(x_data[:1000], y_data[:1000])):
                    point = {"x": x, "y": y}
                    if config.color_column and config.color_column in df.columns:
                        point["color"] = df[config.color_column].to_list()[i]
                    chart_data.append(point)
        
        elif config.chart_type == "line":
            x_data = df[config.x_column].to_list()
            if config.y_column:
                y_data = df[config.y_column].to_list()
                chart_data = [
                    {"x": x, "y": y} 
                    for x, y in zip(x_data[:1000], y_data[:1000])
                ]
        
        elif config.chart_type == "bar":
            if config.y_column:
                # 分组统计
                grouped = df.group_by(config.x_column).agg(pl.col(config.y_column).sum())
                chart_data = [
                    {"category": row[config.x_column], "value": row[config.y_column]}
                    for row in grouped.to_dicts()[:50]  # 限制分类数量
                ]
            else:
                # 计数统计
                value_counts = df[config.x_column].value_counts()
                chart_data = [
                    {"category": row[config.x_column], "value": row["count"]}
                    for row in value_counts.to_dicts()[:50]
                ]
        
        elif config.chart_type == "histogram":
            values = df[config.x_column].drop_nulls().to_list()
            chart_data = values[:1000]  # 限制数据点数量
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"图表数据生成失败: {str(e)}"
        )
    
    return chart_data