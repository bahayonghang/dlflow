"""任务执行器模块"""

from datetime import datetime
from typing import Dict, Any, Optional
import uuid
import logging
import traceback

from app.database import get_db
from app.models.task import Task
from app.models.execution import Execution, ExecutionStep
from app.services.data_processor import DataProcessor
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)


class TaskExecutor:
    """任务执行器"""
    
    @staticmethod
    async def execute_data_processing_task(
        task_id: str,
        file_path: str,
        processing_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行数据处理任务"""
        try:
            # 更新任务状态为运行中
            await TaskExecutor._update_task_status(task_id, "running")
            
            # 执行数据处理
            result = await TaskExecutor._process_data_file(file_path, processing_config)
            
            # 更新任务状态为完成
            await TaskExecutor._update_task_status(task_id, "completed", result=result)
            
            return result
            
        except Exception as e:
            error_msg = f"数据处理任务执行失败: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            
            # 更新任务状态为失败
            await TaskExecutor._update_task_status(task_id, "failed", error_message=error_msg)
            
            raise e
    
    @staticmethod
    async def execute_analysis_task(
        task_id: str,
        data_path: str,
        analysis_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行数据分析任务"""
        try:
            # 更新任务状态为运行中
            await TaskExecutor._update_task_status(task_id, "running")
            
            # 执行数据分析
            result = await TaskExecutor._analyze_data(data_path, analysis_config)
            
            # 更新任务状态为完成
            await TaskExecutor._update_task_status(task_id, "completed", result=result)
            
            return result
            
        except Exception as e:
            error_msg = f"数据分析任务执行失败: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            
            # 更新任务状态为失败
            await TaskExecutor._update_task_status(task_id, "failed", error_message=error_msg)
            
            raise e
    
    @staticmethod
    async def execute_visualization_task(
        task_id: str,
        data_path: str,
        chart_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """执行数据可视化任务"""
        try:
            # 更新任务状态为运行中
            await TaskExecutor._update_task_status(task_id, "running")
            
            # 执行数据可视化
            result = await TaskExecutor._create_visualization(data_path, chart_config)
            
            # 更新任务状态为完成
            await TaskExecutor._update_task_status(task_id, "completed", result=result)
            
            return result
            
        except Exception as e:
            error_msg = f"数据可视化任务执行失败: {str(e)}\n{traceback.format_exc()}"
            logger.error(error_msg)
            
            # 更新任务状态为失败
            await TaskExecutor._update_task_status(task_id, "failed", error_message=error_msg)
            
            raise e
    
    @staticmethod
    async def _process_data_file(file_path: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """处理数据文件"""
        import polars as pl
        
        # 读取数据文件
        if file_path.endswith('.csv'):
            df = pl.read_csv(file_path)
        elif file_path.endswith('.parquet'):
            df = pl.read_parquet(file_path)
        else:
            raise ValueError(f"不支持的文件格式: {file_path}")
        
        # 检测时间列
        time_info = DataProcessor.detect_time_column(df)
        
        # 解析时间列
        if time_info:
            df = DataProcessor.parse_time_column(df, time_info)
        
        # 分析变量
        variable_analysis = DataProcessor.analyze_variables(df)
        
        # 计算相关性（如果有数值变量）
        correlations = {}
        numeric_vars = [var["name"] for var in variable_analysis["numeric_variables"]]
        if len(numeric_vars) >= 2:
            correlations = DataProcessor.calculate_correlations(df, numeric_vars)
        
        return {
            "file_path": file_path,
            "rows": df.height,
            "columns": len(df.columns),
            "time_info": time_info,
            "variable_analysis": variable_analysis,
            "correlations": correlations,
            "processed_at": datetime.now().isoformat()
        }
    
    @staticmethod
    async def _analyze_data(data_path: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """分析数据"""
        # 这里可以实现更复杂的数据分析逻辑
        # 目前返回基本的分析结果
        return {
            "data_path": data_path,
            "analysis_type": config.get("type", "basic"),
            "result": "分析完成",
            "analyzed_at": datetime.now().isoformat()
        }
    
    @staticmethod
    async def _create_visualization(data_path: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """创建数据可视化"""
        # 这里可以实现数据可视化逻辑
        # 目前返回基本的可视化结果
        return {
            "data_path": data_path,
            "chart_type": config.get("type", "line"),
            "chart_url": f"/charts/{uuid.uuid4().hex}.png",
            "created_at": datetime.now().isoformat()
        }
    
    @staticmethod
    async def _update_task_status(
        task_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ):
        """更新任务状态"""
        try:
            async for db in get_db():
                # 获取任务
                task_result = await db.execute(select(Task).where(Task.id == task_id))
                task = task_result.scalar_one_or_none()
                
                if task:
                    # 更新任务状态
                    task.status = status
                    
                    if status == "running":
                        task.start_time = datetime.now()
                    elif status in ["completed", "failed"]:
                        task.end_time = datetime.now()
                    
                    if result:
                        task.result = result
                    
                    if error_message:
                        task.error_message = error_message
                    
                    await db.commit()
                
                break
                
        except Exception as e:
            logger.error(f"更新任务状态失败: {task_id}, 错误: {e}")