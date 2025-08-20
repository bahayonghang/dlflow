"""API路由配置"""

from fastapi import APIRouter

from app.api.endpoints import (
    projects,
    files,
    workflows,
    tasks,
    executions,
    charts,
    node_types,
    transform,
    analysis,
    output
)

# 创建主API路由器
api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(
    projects.router,
    prefix="/projects",
    tags=["projects"]
)

api_router.include_router(
    files.router,
    prefix="/files",
    tags=["files"]
)

api_router.include_router(
    workflows.router,
    prefix="/workflows",
    tags=["workflows"]
)

api_router.include_router(
    tasks.router,
    prefix="/tasks",
    tags=["tasks"]
)

api_router.include_router(
    executions.router,
    prefix="/executions",
    tags=["executions"]
)

api_router.include_router(
    charts.router,
    prefix="/charts",
    tags=["charts"]
)

api_router.include_router(
    node_types.router,
    prefix="/node-types",
    tags=["node-types"]
)

api_router.include_router(
    transform.router,
    prefix="/transform",
    tags=["transform"]
)

api_router.include_router(
    analysis.router,
    prefix="/analysis",
    tags=["analysis"]
)

api_router.include_router(
    output.router,
    prefix="/output",
    tags=["output"]
)