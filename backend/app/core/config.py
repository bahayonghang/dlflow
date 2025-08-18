"""应用程序配置设置"""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用程序设置"""
    
    # 基本设置
    APP_NAME: str = "DLFlow Backend"
    VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # 服务器设置
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # CORS设置
    ALLOWED_HOSTS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # 数据存储设置
    DATA_DIR: str = os.getenv("DATA_DIR", "../data")
    UPLOAD_DIR: str = os.path.join(DATA_DIR, "uploads")
    PROJECTS_DIR: str = os.path.join(DATA_DIR, "projects")
    WORKFLOWS_DIR: str = os.path.join(DATA_DIR, "workflows")
    EXECUTIONS_DIR: str = os.path.join(DATA_DIR, "executions")
    TASKS_DIR: str = os.path.join(DATA_DIR, "tasks")
    CHARTS_DIR: str = os.path.join(DATA_DIR, "charts")
    TEMP_DIR: str = os.path.join(DATA_DIR, "temp")
    
    # 文件上传设置
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_FILE_TYPES: List[str] = [".csv", ".parquet"]
    
    # 数据库设置
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{os.path.join(DATA_DIR, 'dlflow.db')}")
    
    # 任务调度设置
    SCHEDULER_TIMEZONE: str = os.getenv("SCHEDULER_TIMEZONE", "Asia/Shanghai")
    SCHEDULER_JOB_DEFAULTS: dict = {
        "coalesce": False,
        "max_instances": 3
    }
    
    # 数据处理设置
    TIME_COLUMNS: List[str] = ["DateTime", "tagTime"]
    DATETIME_FORMAT: str = "%Y-%m-%d %H:%M:%S"
    TAGTIME_FORMAT: str = "%Y%m%d%H"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 创建全局设置实例
settings = Settings()