# 背景
文件名：2025-01-15_1_frontend-restructure.md
创建于：2025-01-15_10:30:00
创建者：Claude
主分支：main
任务分支：task/frontend-restructure_2025-01-15_1
Yolo模式：Off

# 任务描述
将所有Web前端相关文件统一整理并存放至名为 `frontend` 的项目根目录下的子文件夹中。确保项目根目录仅包含 `README.md` 等必要的项目级文件，以保持项目结构的整洁和清晰。

# 项目概览
DLFlow是一个智能数据处理Web平台，采用前后端分离架构：
- 前端：React 18 + TypeScript + Antd + React Flow + ECharts + Vite
- 后端：FastAPI + Python 3.11 + SQLite + APScheduler + Polars

⚠️ 警告：永远不要修改此部分 ⚠️
核心RIPER-5协议规则：
- 必须在每个响应开头声明当前模式
- RESEARCH模式：只允许信息收集和分析，禁止实施
- PLAN模式：创建详尽技术规范，禁止代码编写
- EXECUTE模式：严格按照计划实施，禁止偏离
- REVIEW模式：验证实施与计划的符合程度
⚠️ 警告：永远不要修改此部分 ⚠️

# 分析
当前项目根目录包含以下前端相关文件和文件夹：

## 需要移动到frontend/的文件：
- src/ - React源代码目录
- public/ - 静态资源目录
- package.json - Node.js依赖配置
- pnpm-lock.yaml - 包管理器锁文件
- vite.config.ts - Vite构建配置
- tsconfig.json - TypeScript配置
- tailwind.config.js - Tailwind CSS配置
- postcss.config.js - PostCSS配置
- eslint.config.js - ESLint配置
- index.html - 入口HTML文件
- nodemon.json - Nodemon配置
- vercel.json - Vercel部署配置

## 保留在根目录的文件：
- README.md - 项目文档
- .gitignore - Git忽略配置
- .trae/ - TRAE IDE配置
- .vscode/ - VS Code配置
- backend/ - 后端代码
- data/ - 数据存储
- api/ - API相关（需要确认是否为前端相关）

# 提议的解决方案

## 方案概述
将React前端应用相关文件移动到frontend/子目录，保持api/和backend/作为独立服务。这样可以实现清晰的三层架构分离：
- frontend/ - React前端应用
- api/ - Express.js API服务（用于Vercel部署）
- backend/ - FastAPI后端服务

## 需要移动的文件列表
1. src/ → frontend/src/
2. public/ → frontend/public/
3. package.json → frontend/package.json
4. pnpm-lock.yaml → frontend/pnpm-lock.yaml
5. vite.config.ts → frontend/vite.config.ts
6. tsconfig.json → frontend/tsconfig.json
7. tailwind.config.js → frontend/tailwind.config.js
8. postcss.config.js → frontend/postcss.config.js
9. eslint.config.js → frontend/eslint.config.js
10. index.html → frontend/index.html
11. nodemon.json → frontend/nodemon.json（需要更新路径）
12. vercel.json → frontend/vercel.json

## 需要更新的配置
1. nodemon.json - 更新api路径引用
2. 根目录可能需要新的package.json来管理整个项目
3. README.md需要更新运行指令

## 优势
- 清晰的项目结构分离
- 便于独立部署和维护
- 符合现代全栈项目最佳实践

# 当前执行步骤："2. 制定详细实施计划"

## 详细实施计划

### 阶段1：创建目录结构
1. 创建frontend/目录

### 阶段2：移动前端文件
1. 移动src/目录到frontend/src/
2. 移动public/目录到frontend/public/
3. 移动package.json到frontend/package.json
4. 移动pnpm-lock.yaml到frontend/pnpm-lock.yaml
5. 移动vite.config.ts到frontend/vite.config.ts
6. 移动tsconfig.json到frontend/tsconfig.json
7. 移动tailwind.config.js到frontend/tailwind.config.js
8. 移动postcss.config.js到frontend/postcss.config.js
9. 移动eslint.config.js到frontend/eslint.config.js
10. 移动index.html到frontend/index.html
11. 移动vercel.json到frontend/vercel.json

### 阶段3：更新配置文件
1. 更新frontend/nodemon.json中的api路径引用
2. 创建根目录的新package.json用于项目管理
3. 更新README.md中的运行指令

### 阶段4：验证和测试
1. 验证前端项目可以正常启动
2. 验证API服务仍然正常工作
3. 验证后端服务不受影响

## 实施清单：
1. 创建frontend/目录
2. 移动src/目录到frontend/src/
3. 移动public/目录到frontend/public/
4. 移动package.json到frontend/package.json
5. 移动pnpm-lock.yaml到frontend/pnpm-lock.yaml
6. 移动vite.config.ts到frontend/vite.config.ts
7. 移动tsconfig.json到frontend/tsconfig.json
8. 移动tailwind.config.js到frontend/tailwind.config.js
9. 移动postcss.config.js到frontend/postcss.config.js
10. 移动eslint.config.js到frontend/eslint.config.js
11. 移动index.html到frontend/index.html
12. 移动vercel.json到frontend/vercel.json
13. 移动nodemon.json到frontend/nodemon.json并更新api路径引用
14. 创建根目录的新package.json用于项目管理
15. 更新README.md中的运行指令
16. 验证前端项目可以正常启动
17. 验证整个项目结构的完整性

# 任务进度
[待填写]

# 最终审查
[待填写]