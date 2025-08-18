"""文件数据模型"""

from typing import Optional
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class UploadedFile(Base, TimestampMixin):
    """上传文件模型"""
    
    __tablename__ = "uploaded_files"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)  # csv, parquet
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="uploaded", nullable=False)  # uploaded, processing, processed, error
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # 关联关系
    project = relationship("Project", back_populates="files")
    
    def __repr__(self) -> str:
        return f"<UploadedFile(id='{self.id}', filename='{self.filename}', status='{self.status}')>"