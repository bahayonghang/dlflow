"""任务调度器模块"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR
from datetime import datetime
from typing import Optional, Dict, Any
import logging
import uuid

from app.core.config import settings
from app.database import get_db
from app.models.task import Task
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

logger = logging.getLogger(__name__)


class TaskScheduler:
    """任务调度器"""
    
    def __init__(self):
        # 配置作业存储
        jobstores = {
            'default': MemoryJobStore()
        }
        
        # 配置执行器
        executors = {
            'default': AsyncIOExecutor()
        }
        
        # 作业默认设置
        job_defaults = settings.SCHEDULER_JOB_DEFAULTS
        
        # 创建调度器
        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone=settings.SCHEDULER_TIMEZONE
        )
        
        # 添加事件监听器
        self.scheduler.add_listener(self._job_executed, EVENT_JOB_EXECUTED)
        self.scheduler.add_listener(self._job_error, EVENT_JOB_ERROR)
    
    async def start(self):
        """启动调度器"""
        self.scheduler.start()
        logger.info("任务调度器已启动")
    
    async def shutdown(self):
        """关闭调度器"""
        self.scheduler.shutdown()
        logger.info("任务调度器已关闭")
    
    async def add_task(
        self,
        task_id: str,
        func,
        args: tuple = (),
        kwargs: dict = None,
        run_date: Optional[datetime] = None,
        **job_kwargs
    ) -> str:
        """添加任务"""
        if kwargs is None:
            kwargs = {}
        
        job_id = f"task_{task_id}"
        
        if run_date:
            # 定时任务
            job = self.scheduler.add_job(
                func,
                'date',
                run_date=run_date,
                args=args,
                kwargs=kwargs,
                id=job_id,
                **job_kwargs
            )
        else:
            # 立即执行
            job = self.scheduler.add_job(
                func,
                args=args,
                kwargs=kwargs,
                id=job_id,
                **job_kwargs
            )
        
        logger.info(f"任务已添加: {job_id}")
        return job.id
    
    async def remove_task(self, task_id: str) -> bool:
        """移除任务"""
        job_id = f"task_{task_id}"
        try:
            self.scheduler.remove_job(job_id)
            logger.info(f"任务已移除: {job_id}")
            return True
        except Exception as e:
            logger.error(f"移除任务失败: {job_id}, 错误: {e}")
            return False
    
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """获取任务状态"""
        job_id = f"task_{task_id}"
        try:
            job = self.scheduler.get_job(job_id)
            if job:
                return {
                    "id": job.id,
                    "name": job.name,
                    "next_run_time": job.next_run_time,
                    "pending": job.pending
                }
            return None
        except Exception as e:
            logger.error(f"获取任务状态失败: {job_id}, 错误: {e}")
            return None
    
    async def list_tasks(self) -> list:
        """列出所有任务"""
        jobs = self.scheduler.get_jobs()
        return [
            {
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time,
                "pending": job.pending
            }
            for job in jobs
        ]
    
    async def _job_executed(self, event):
        """任务执行完成事件处理"""
        job_id = event.job_id
        if job_id.startswith("task_"):
            task_id = job_id.replace("task_", "")
            await self._update_task_status(task_id, "completed")
            logger.info(f"任务执行完成: {job_id}")
    
    async def _job_error(self, event):
        """任务执行错误事件处理"""
        job_id = event.job_id
        if job_id.startswith("task_"):
            task_id = job_id.replace("task_", "")
            await self._update_task_status(task_id, "failed", str(event.exception))
            logger.error(f"任务执行失败: {job_id}, 错误: {event.exception}")
    
    async def _update_task_status(self, task_id: str, status: str, error_message: str = None):
        """更新任务状态"""
        try:
            async for db in get_db():
                # 更新任务状态
                update_data = {
                    "status": status,
                    "end_time": datetime.now()
                }
                
                if status == "running":
                    update_data["start_time"] = datetime.now()
                    update_data.pop("end_time")
                
                if error_message:
                    update_data["error_message"] = error_message
                
                await db.execute(
                    update(Task)
                    .where(Task.id == task_id)
                    .values(**update_data)
                )
                await db.commit()
                break
        except Exception as e:
            logger.error(f"更新任务状态失败: {task_id}, 错误: {e}")


# 全局调度器实例
scheduler = TaskScheduler()