"""任务数据模型"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, JSON, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class Task(Base, TimestampMixin):
    """任务模型"""
    
    __tablename__ = "tasks"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    execution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("executions.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    task_type: Mapped[str] = mapped_column(String(100), nullable=False)  # data_processing, analysis, visualization
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, running, completed, failed
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    scheduled_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    parameters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    result: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    
    # 关联关系
    execution = relationship("Execution", foreign_keys=[execution_id])
    
    def __repr__(self) -> str:
        return f"<Task(id='{self.id}', name='{self.name}', status='{self.status}')>"