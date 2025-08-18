# DLFlow Architecture

本页提供系统的高层架构视图、模块边界、依赖关系、核心数据流，以及关键接口说明。文末附可直接嵌入其他文档的 Mermaid 代码片段。

## Overview

- 模块划分
  - Frontend：Vite + React 前端界面与交互
  - Node API (Express)：鉴权与健康检查（本地开发侧重）
  - Backend (FastAPI)：业务 API、配置、调度、数据库与服务层
  - Storage：数据库与文件系统（数据落地、执行产物与静态资源）
- 关键依赖
  - FastAPI 使用 SQLAlchemy Async + SQLite（aiosqlite）作为主数据存储
  - APScheduler 作为任务调度器，TaskManager/TaskExecutor 负责任务编排与执行
  - Polars 用于数据处理与分析
  - storage.py 额外提供 JSON 级别的 Project/Execution 辅助存储索引（与数据库并存，轻量/兼容用途）
- 端到端数据流（示例：文件上传 → 任务调度 → 数据处理 → 结果落地）
  1) 客户端调用 POST /api/files/upload
  2) 后端将文件写入 data/uploads 并写 DB 记录
  3) TaskManager 创建 data_processing 任务，交由 APScheduler 调度
  4) TaskExecutor 触发执行，调用 DataProcessor(Polars) 进行分析
  5) 结果写入 data/executions/* 与数据库，前端通过 API 获取

## Architecture Diagram (Mermaid)

```mermaid
flowchart LR
  %% Layers
  subgraph FE[Frontend (Vite + React)]
    FE_UI[Pages & Components\n- FileUpload / WorkflowExecution / ChartGenerator\n- ProjectManagement / ExecutionHistory]
  end

  subgraph NAPI[Node API (Express)]
    N_AUTH[/POST /api/auth\nGET /api/health/]
  end

  subgraph BE[Backend (FastAPI)]
    subgraph API[REST API (/api/*)]
      A_PROJ[/projects/]
      A_FILES[/files/\n- POST /upload\n- GET /\n- GET /{id}\n- DELETE /{id}\n- POST /{id}/process]
      A_TASKS[/tasks/]
      A_EXECS[/executions/]
      A_WFS[/workflows/]
      A_CHARTS[/charts/]
      A_NTYPES[/node-types/]
      A_HEALTH[/health]
    end

    subgraph CORE[Core]
      C_CFG[Config]
      C_CORS[CORS]
      C_SCHED[APScheduler]
      C_DB[(SQLAlchemy Async\nSQLite)]
      C_STORE[Storage Dirs Helper]
    end

    subgraph SRV[Services]
      S_TM[TaskManager]
      S_TE[TaskExecutor]
      S_DP[DataProcessor (Polars)]
    end
  end

  subgraph STORAGE[Storage]
    ST_DB[(data/dlflow.db)]
    ST_FS[(data/\n- uploads\n- executions/{steps,results}\n- projects\n- workflows\n- charts\n- tasks)]
  end

  %% Frontend traffic
  FE_UI -->|REST /api/*| API
  FE_UI -->|Auth /api/auth| N_AUTH

  %% Backend dependencies
  API -->|CRUD| C_DB
  API -->|init dirs| C_STORE
  C_CFG --> API
  C_CFG --> C_SCHED
  C_CFG --> C_DB

  %% File upload flow
  A_FILES -- save file --> ST_FS
  A_FILES -- write meta --> C_DB
  A_FILES -- create task --> S_TM

  %% Task flow
  S_TM -->|schedule| C_SCHED
  C_SCHED -. triggers .-> S_TE
  S_TE -->|process via| S_DP
  S_DP -->|read/write| ST_FS
  S_TE -->|write results/status| C_DB

  %% Persistence mapping
  C_DB --- ST_DB

  %% Notes on dual persistence helpers
  C_STORE -. JSON Project/Execution helpers .- API

  %% Health checks
  A_HEALTH --> FE_UI
  N_AUTH --> FE_UI
```

## Key Interfaces

- Node (Express)
  - POST /api/auth
  - GET /api/health
- FastAPI (prefix: /api)
  - /projects
  - /files（upload/list/detail/delete/process）
  - /tasks
  - /executions
  - /workflows
  - /charts
  - /node-types
  - /health

## Embeddable Mermaid Snippet

将以下代码片段直接粘贴进任意 Markdown 文档即可渲染相同架构图。

```mermaid
flowchart LR
  subgraph FE[Frontend (Vite + React)]
    FE_UI[Pages & Components\n- FileUpload / WorkflowExecution / ChartGenerator\n- ProjectManagement / ExecutionHistory]
  end
  subgraph NAPI[Node API (Express)]
    N_AUTH[/POST /api/auth\nGET /api/health/]
  end
  subgraph BE[Backend (FastAPI)]
    subgraph API[REST API (/api/*)]
      A_PROJ[/projects/]
      A_FILES[/files/\n- POST /upload\n- GET /\n- GET /{id}\n- DELETE /{id}\n- POST /{id}/process]
      A_TASKS[/tasks/]
      A_EXECS[/executions/]
      A_WFS[/workflows/]
      A_CHARTS[/charts/]
      A_NTYPES[/node-types/]
      A_HEALTH[/health]
    end
    subgraph CORE[Core]
      C_CFG[Config]
      C_CORS[CORS]
      C_SCHED[APScheduler]
      C_DB[(SQLAlchemy Async\nSQLite)]
      C_STORE[Storage Dirs Helper]
    end
    subgraph SRV[Services]
      S_TM[TaskManager]
      S_TE[TaskExecutor]
      S_DP[DataProcessor (Polars)]
    end
  end
  subgraph STORAGE[Storage]
    ST_DB[(data/dlflow.db)]
    ST_FS[(data/\n- uploads\n- executions/{steps,results}\n- projects\n- workflows\n- charts\n- tasks)]
  end
  FE_UI -->|REST /api/*| API
  FE_UI -->|Auth /api/auth| N_AUTH
  API -->|CRUD| C_DB
  API -->|init dirs| C_STORE
  C_CFG --> API
  C_CFG --> C_SCHED
  C_CFG --> C_DB
  A_FILES -- save file --> ST_FS
  A_FILES -- write meta --> C_DB
  A_FILES -- create task --> S_TM
  S_TM -->|schedule| C_SCHED
  C_SCHED -. triggers .-> S_TE
  S_TE -->|process via| S_DP
  S_DP -->|read/write| ST_FS
  S_TE -->|write results/status| C_DB
  C_DB --- ST_DB
  C_STORE -. JSON Project/Execution helpers .- API
  A_HEALTH --> FE_UI
  N_AUTH --> FE_UI