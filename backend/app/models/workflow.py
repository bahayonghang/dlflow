"""工作流数据模型"""

from typing import Optional
from sqlalchemy import String, Text, JSON, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class Workflow(Base, TimestampMixin):
    """工作流模型"""
    
    __tablename__ = "workflows"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[str] = mapped_column(String(50), default="1.0.0", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)  # draft, active, archived
    workflow_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # React Flow数据
    
    # 关联关系
    project = relationship("Project", back_populates="workflows")
    nodes = relationship("WorkflowNode", back_populates="workflow", cascade="all, delete-orphan")
    edges = relationship("WorkflowEdge", back_populates="workflow", cascade="all, delete-orphan")
    executions = relationship("Execution", back_populates="workflow")
    
    def __repr__(self) -> str:
        return f"<Workflow(id='{self.id}', name='{self.name}', status='{self.status}')>"


class WorkflowNode(Base, TimestampMixin):
    """工作流节点模型"""
    
    __tablename__ = "workflow_nodes"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=False)
    node_id: Mapped[str] = mapped_column(String(100), nullable=False)  # React Flow节点ID
    node_type: Mapped[str] = mapped_column(String(100), nullable=False)  # input, process, output, etc.
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    position_x: Mapped[float] = mapped_column(Float, nullable=False)
    position_y: Mapped[float] = mapped_column(Float, nullable=False)
    data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # 节点配置数据
    
    # 关联关系
    workflow = relationship("Workflow", back_populates="nodes")
    
    def __repr__(self) -> str:
        return f"<WorkflowNode(id='{self.id}', node_id='{self.node_id}', node_type='{self.node_type}')>"


class WorkflowEdge(Base, TimestampMixin):
    """工作流连接模型"""
    
    __tablename__ = "workflow_edges"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id"), nullable=False)
    edge_id: Mapped[str] = mapped_column(String(100), nullable=False)  # React Flow边ID
    source_node_id: Mapped[str] = mapped_column(String(100), nullable=False)
    target_node_id: Mapped[str] = mapped_column(String(100), nullable=False)
    source_handle: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    target_handle: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # 连接配置数据
    
    # 关联关系
    workflow = relationship("Workflow", back_populates="edges")
    
    def __repr__(self) -> str:
        return f"<WorkflowEdge(id='{self.id}', edge_id='{self.edge_id}', source='{self.source_node_id}', target='{self.target_node_id}')>"