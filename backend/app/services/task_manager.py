"""任务管理服务模块"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import uuid
import logging

from app.database import get_db
from app.models.task import Task
from app.models.execution import Execution, ExecutionStep
from app.core.scheduler import scheduler
from app.services.task_executor import TaskExecutor
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)


class TaskManager:
    """任务管理器"""
    
    @staticmethod
    async def create_task(
        name: str,
        task_type: str,
        parameters: Dict[str, Any],
        execution_id: Optional[str] = None,
        scheduled_time: Optional[datetime] = None,
        priority: int = 0
    ) -> str:
        """创建任务"""
        task_id = str(uuid.uuid4())
        
        async for db in get_db():
            # 创建任务记录
            task = Task(
                id=task_id,
                execution_id=execution_id,
                name=name,
                task_type=task_type,
                parameters=parameters,
                scheduled_time=scheduled_time,
                priority=priority,
                status="pending"
            )
            
            db.add(task)
            await db.commit()
            
            # 添加到调度器
            await TaskManager._schedule_task(task)
            
            logger.info(f"任务已创建: {task_id} - {name}")
            return task_id
    
    @staticmethod
    async def _schedule_task(task: Task):
        """调度任务"""
        try:
            # 根据任务类型选择执行函数
            if task.task_type == "data_processing":
                func = TaskExecutor.execute_data_processing_task
                args = (
                    task.id,
                    task.parameters.get("file_path"),
                    task.parameters.get("processing_config", {})
                )
            elif task.task_type == "analysis":
                func = TaskExecutor.execute_analysis_task
                args = (
                    task.id,
                    task.parameters.get("data_path"),
                    task.parameters.get("analysis_config", {})
                )
            elif task.task_type == "visualization":
                func = TaskExecutor.execute_visualization_task
                args = (
                    task.id,
                    task.parameters.get("data_path"),
                    task.parameters.get("chart_config", {})
                )
            else:
                raise ValueError(f"不支持的任务类型: {task.task_type}")
            
            # 添加到调度器
            await scheduler.add_task(
                task.id,
                func,
                args=args,
                run_date=task.scheduled_time
            )
            
        except Exception as e:
            logger.error(f"调度任务失败: {task.id}, 错误: {e}")
            # 更新任务状态为失败
            await TaskManager._update_task_status(task.id, "failed", str(e))
    
    @staticmethod
    async def cancel_task(task_id: str) -> bool:
        """取消任务"""
        try:
            async for db in get_db():
                # 获取任务
                result = await db.execute(select(Task).where(Task.id == task_id))
                task = result.scalar_one_or_none()
                
                if not task:
                    return False
                
                # 从调度器中移除
                await scheduler.remove_task(task_id)
                
                # 更新任务状态
                task.status = "cancelled"
                await db.commit()
                
                logger.info(f"任务已取消: {task_id}")
                return True
                
        except Exception as e:
            logger.error(f"取消任务失败: {task_id}, 错误: {e}")
            return False
    
    @staticmethod
    async def retry_task(task_id: str) -> bool:
        """重试任务"""
        try:
            async for db in get_db():
                # 获取任务
                result = await db.execute(select(Task).where(Task.id == task_id))
                task = result.scalar_one_or_none()
                
                if not task:
                    return False
                
                # 检查重试次数
                if task.retry_count >= task.max_retries:
                    logger.warning(f"任务重试次数已达上限: {task_id}")
                    return False
                
                # 更新重试次数和状态
                task.retry_count += 1
                task.status = "pending"
                task.error_message = None
                await db.commit()
                
                # 重新调度
                await TaskManager._schedule_task(task)
                
                logger.info(f"任务已重试: {task_id} (第{task.retry_count}次)")
                return True
                
        except Exception as e:
            logger.error(f"重试任务失败: {task_id}, 错误: {e}")
            return False
    
    @staticmethod
    async def get_task(task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务详情"""
        try:
            async for db in get_db():
                result = await db.execute(
                    select(Task)
                    .options(selectinload(Task.execution))
                    .where(Task.id == task_id)
                )
                task = result.scalar_one_or_none()
                
                if task:
                    return {
                        "id": task.id,
                        "execution_id": task.execution_id,
                        "name": task.name,
                        "task_type": task.task_type,
                        "status": task.status,
                        "priority": task.priority,
                        "scheduled_time": task.scheduled_time,
                        "start_time": task.start_time,
                        "end_time": task.end_time,
                        "parameters": task.parameters,
                        "result": task.result,
                        "error_message": task.error_message,
                        "retry_count": task.retry_count,
                        "max_retries": task.max_retries,
                        "created_at": task.created_at,
                        "updated_at": task.updated_at
                    }
                
                return None
                
        except Exception as e:
            logger.error(f"获取任务失败: {task_id}, 错误: {e}")
            return None
    
    @staticmethod
    async def list_tasks(
        execution_id: Optional[str] = None,
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """列出任务"""
        try:
            async for db in get_db():
                query = select(Task)
                
                # 添加过滤条件
                if execution_id:
                    query = query.where(Task.execution_id == execution_id)
                if status:
                    query = query.where(Task.status == status)
                if task_type:
                    query = query.where(Task.task_type == task_type)
                
                # 添加排序和分页
                query = query.order_by(Task.created_at.desc()).limit(limit).offset(offset)
                
                result = await db.execute(query)
                tasks = result.scalars().all()
                
                return [
                    {
                        "id": task.id,
                        "execution_id": task.execution_id,
                        "name": task.name,
                        "task_type": task.task_type,
                        "status": task.status,
                        "priority": task.priority,
                        "scheduled_time": task.scheduled_time,
                        "start_time": task.start_time,
                        "end_time": task.end_time,
                        "retry_count": task.retry_count,
                        "created_at": task.created_at,
                        "updated_at": task.updated_at
                    }
                    for task in tasks
                ]
                
        except Exception as e:
            logger.error(f"列出任务失败, 错误: {e}")
            return []
    
    @staticmethod
    async def delete_task(task_id: str) -> bool:
        """删除任务"""
        try:
            async for db in get_db():
                # 先从调度器中移除
                await scheduler.remove_task(task_id)
                
                # 从数据库中删除
                await db.execute(delete(Task).where(Task.id == task_id))
                await db.commit()
                
                logger.info(f"任务已删除: {task_id}")
                return True
                
        except Exception as e:
            logger.error(f"删除任务失败: {task_id}, 错误: {e}")
            return False
    
    @staticmethod
    async def get_task_statistics() -> Dict[str, Any]:
        """获取任务统计信息"""
        try:
            async for db in get_db():
                # 统计各状态的任务数量
                result = await db.execute(
                    select(Task.status, db.func.count(Task.id))
                    .group_by(Task.status)
                )
                status_counts = dict(result.all())
                
                # 统计各类型的任务数量
                result = await db.execute(
                    select(Task.task_type, db.func.count(Task.id))
                    .group_by(Task.task_type)
                )
                type_counts = dict(result.all())
                
                # 获取调度器状态
                scheduler_tasks = await scheduler.list_tasks()
                
                return {
                    "status_counts": status_counts,
                    "type_counts": type_counts,
                    "scheduler_tasks": len(scheduler_tasks),
                    "total_tasks": sum(status_counts.values())
                }
                
        except Exception as e:
            logger.error(f"获取任务统计失败, 错误: {e}")
            return {}
    
    @staticmethod
    async def _update_task_status(task_id: str, status: str, error_message: str = None):
        """更新任务状态"""
        try:
            async for db in get_db():
                update_data = {"status": status}
                
                if status == "running":
                    update_data["start_time"] = datetime.now()
                elif status in ["completed", "failed", "cancelled"]:
                    update_data["end_time"] = datetime.now()
                
                if error_message:
                    update_data["error_message"] = error_message
                
                await db.execute(
                    update(Task)
                    .where(Task.id == task_id)
                    .values(**update_data)
                )
                await db.commit()
                
        except Exception as e:
            logger.error(f"更新任务状态失败: {task_id}, 错误: {e}")