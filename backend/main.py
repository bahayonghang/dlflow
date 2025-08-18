"""FastAPI主应用程序入口点"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
import os

from app.api.routes import api_router
from app.core.config import settings
from app.core.storage import ensure_data_directories
from app.database import init_database
from app.core.scheduler import scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用程序生命周期管理"""
    # 启动时初始化
    ensure_data_directories()
    await init_database()
    await scheduler.start()
    
    yield
    
    # 关闭时清理资源
    await scheduler.shutdown()


# 创建FastAPI应用实例
app = FastAPI(
    title="DLFlow Backend",
    description="数据处理Web应用后端API",
    version="0.1.0",
    lifespan=lifespan
)

# 配置CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件服务（如果目录存在）
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# 注册API路由
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """根路径健康检查"""
    return {"message": "DLFlow Backend API is running", "version": "0.1.0"}


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "service": "dlflow-backend"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if not settings.DEBUG else "debug"
    )