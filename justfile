# 🚀 DLFlow 项目管理工具
# 使用 just 命令来简化项目的开发和部署流程

# 设置默认配置
set shell := ["powershell.exe", "-c"]
set windows-shell := ["powershell.exe", "-c"]

# 📋 显示所有可用命令
default:
    @echo "🎯 DLFlow 项目管理命令列表："
    @echo ""
    @echo "📦 依赖管理："
    @echo "  just install     - 安装所有项目依赖"
    @echo "  just install-fe  - 仅安装前端依赖"
    @echo "  just install-be  - 仅安装后端依赖"
    @echo ""
    @echo "🚀 启动服务："
    @echo "  just dev         - 同时启动前端和后端服务"
    @echo "  just frontend    - 启动前端开发服务器"
    @echo "  just backend     - 启动后端API服务器"
    @echo ""
    @echo "🧹 项目维护："
    @echo "  just clean       - 清理项目缓存和临时文件"
    @echo "  just reset       - 重置项目（清理+重新安装依赖）"
    @echo ""
    @echo "📊 项目信息："
    @echo "  just status      - 显示项目状态"
    @echo "  just help        - 显示详细帮助信息"

# 📦 安装所有项目依赖
install:
    @echo "📦 正在安装项目依赖..."
    @echo "🔧 安装根目录依赖..."
    npm install
    @echo "🎨 安装前端依赖..."
    cd frontend && npm install
    @echo "🐍 安装后端依赖..."
    cd backend && uv sync
    @echo "✅ 所有依赖安装完成！"

# 🎨 仅安装前端依赖
install-fe:
    @echo "🎨 正在安装前端依赖..."
    cd frontend && npm install
    @echo "✅ 前端依赖安装完成！"

# 🐍 仅安装后端依赖
install-be:
    @echo "🐍 正在安装后端依赖..."
    cd backend && uv sync
    @echo "✅ 后端依赖安装完成！"

# 🚀 同时启动前端和后端服务
dev:
    @echo "🚀 正在启动 DLFlow 开发环境..."
    @echo "🎨 前端服务器: http://localhost:5173"
    @echo "🔧 后端API服务器: http://localhost:3001"
    @echo "📖 API健康检查: http://localhost:3001/api/health"
    @echo ""
    @echo "💡 提示：使用 Ctrl+C 停止所有服务"
    @echo ""
    # 使用 concurrently 同时启动前后端服务
    npx concurrently --kill-others --prefix-colors "cyan,magenta" --names "API,Frontend" "cd backend/api && npm run dev" "cd frontend && npm run dev"

# 🎨 启动前端开发服务器
frontend:
    @echo "🎨 正在启动前端开发服务器..."
    @echo "🌐 前端地址: http://localhost:5173"
    @echo "💡 提示：使用 Ctrl+C 停止服务"
    cd frontend && npm run dev

# 🔧 启动后端API服务器
api:
    @echo "🔧 正在启动后端API服务器..."
    @echo "🌐 后端地址: http://localhost:3001"
    @echo "📖 API健康检查: http://localhost:3001/api/health"
    @echo "💡 提示：使用 Ctrl+C 停止服务"
    cd backend/api && npm run dev

# 🐍 启动Python后端服务器（备用）
backend:
    @echo "🐍 正在启动Python后端服务器..."
    @echo "🌐 后端地址: http://localhost:8000"
    @echo "📖 API文档: http://localhost:8000/docs"
    @echo "💡 提示：使用 Ctrl+C 停止服务"
    cd backend && uv run python main.py

# 🧹 清理项目缓存和临时文件
clean:
    @echo "🧹 正在清理项目..."
    @echo "🗑️ 清理前端缓存..."
    -Remove-Item -Recurse -Force frontend/node_modules -ErrorAction SilentlyContinue
    -Remove-Item -Recurse -Force frontend/dist -ErrorAction SilentlyContinue
    -Remove-Item -Recurse -Force frontend/.vite -ErrorAction SilentlyContinue
    @echo "🗑️ 清理后端缓存..."
    -Remove-Item -Recurse -Force backend/__pycache__ -ErrorAction SilentlyContinue
    -Remove-Item -Recurse -Force backend/.pytest_cache -ErrorAction SilentlyContinue
    @echo "🗑️ 清理根目录缓存..."
    -Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    @echo "🗑️ 清理临时数据..."
    -Remove-Item -Recurse -Force data/temp/* -ErrorAction SilentlyContinue
    -Remove-Item -Recurse -Force data/uploads/* -ErrorAction SilentlyContinue
    @echo "✅ 项目清理完成！"

# 🔄 重置项目（清理+重新安装依赖）
reset: clean install
    @echo "🔄 项目重置完成！"

# 📊 显示项目状态
status:
    @echo "📊 DLFlow 项目状态："
    @echo ""
    @echo "📁 项目结构："
    @if (Test-Path "frontend/package.json") { echo "  ✅ 前端项目已配置" } else { echo "  ❌ 前端项目未找到" }
    @if (Test-Path "backend/pyproject.toml") { echo "  ✅ 后端项目已配置" } else { echo "  ❌ 后端项目未找到" }
    @if (Test-Path "data") { echo "  ✅ 数据目录存在" } else { echo "  ❌ 数据目录未找到" }
    @echo ""
    @echo "📦 依赖状态："
    @if (Test-Path "frontend/node_modules") { echo "  ✅ 前端依赖已安装" } else { echo "  ❌ 前端依赖未安装" }
    @if (Test-Path "backend/.venv") { echo "  ✅ 后端依赖已安装" } else { echo "  ❌ 后端依赖未安装" }
    @echo ""
    @echo "🌐 服务端口："
    @echo "  🎨 前端: http://localhost:5173"
    @echo "  🔧 API服务器: http://localhost:3001"
    @echo "  🐍 Python后端: http://localhost:8000 (备用)"
    @echo "  📖 API健康检查: http://localhost:3001/api/health"

# 📖 显示详细帮助信息
help:
    @echo "📖 DLFlow 项目详细帮助"
    @echo ""
    @echo "🎯 项目简介："
    @echo "  DLFlow 是一个智能数据处理Web平台，支持CSV/Parquet文件处理、"
    @echo "  时间数据识别、多变量分析和可视化工作流设计。"
    @echo ""
    @echo "🏗️ 技术架构："
    @echo "  • 前端：React 18 + TypeScript + Antd + Vite"
    @echo "  • 后端：FastAPI + Python 3.11 + SQLite + APScheduler"
    @echo "  • 数据处理：Polars + 时间序列分析"
    @echo ""
    @echo "🚀 快速开始："
    @echo "  1. just install    # 安装所有依赖"
    @echo "  2. just dev        # 启动开发环境"
    @echo "  3. 访问 http://localhost:5173 开始使用"
    @echo ""
    @echo "🔧 常用命令："
    @echo "  • just frontend    # 仅启动前端"
    @echo "  • just backend     # 仅启动后端"
    @echo "  • just clean       # 清理项目"
    @echo "  • just status      # 查看状态"
    @echo ""
    @echo "💡 提示："
    @echo "  • 使用 'just' 命令查看所有可用选项"
    @echo "  • 确保已安装 Node.js 和 Python 3.11+"
    @echo "  • 后端使用 uv 进行依赖管理，请确保已安装"