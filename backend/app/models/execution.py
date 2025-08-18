"""执行历史数据模型"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, JSON, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class Execution(Base, TimestampMixin):
    """执行历史模型"""
    
    __tablename__ = "executions"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    workflow_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # pending, running, completed, failed
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 执行时长（秒）
    input_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    output_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    performance_metrics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # 关联关系
    project = relationship("Project", back_populates="executions")
    workflow = relationship("Workflow", back_populates="executions")
    steps = relationship("ExecutionStep", back_populates="execution", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Execution(id='{self.id}', name='{self.name}', status='{self.status}')>"


class ExecutionStep(Base, TimestampMixin):
    """执行步骤模型"""
    
    __tablename__ = "execution_steps"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    execution_id: Mapped[str] = mapped_column(String(36), ForeignKey("executions.id"), nullable=False)
    step_name: Mapped[str] = mapped_column(String(255), nullable=False)
    step_type: Mapped[str] = mapped_column(String(100), nullable=False)  # data_load, process, analyze, visualize
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    start_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    input_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    output_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    result_files: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # 结果文件路径
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # 关联关系
    execution = relationship("Execution", back_populates="steps")
    
    def __repr__(self) -> str:
        return f"<ExecutionStep(id='{self.id}', step_name='{self.step_name}', status='{self.status}')>"