"""数据库连接和会话管理"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from typing import AsyncGenerator
import os

from app.models.base import Base
from app.core.config import settings

# 数据库文件路径
DATABASE_PATH = os.path.join(settings.DATA_DIR, "dlflow.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DATABASE_PATH}"

# 创建异步数据库引擎
engine = create_async_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    poolclass=StaticPool,
    connect_args={
        "check_same_thread": False,
    },
)

# 创建异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def create_tables():
    """创建数据库表"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_database():
    """初始化数据库"""
    # 确保数据目录存在
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    # 创建数据库表
    await create_tables()
    
    print(f"数据库初始化完成: {DATABASE_PATH}")