# 背景
文件名：2025-01-15_5_file-upload-enhancement.md
创建于：2025-01-15_14:30:00
创建者：Claude
主分支：main
任务分支：task/file-upload-enhancement_2025-01-15_5
Yolo模式：Off

# 任务描述
为数据输入参数配置添加实际功能，支持用户上传CSV或Parquet格式的文件。具体实现应包括：

1. 文件上传组件，允许用户选择本地CSV或Parquet文件
2. 文件格式自动识别功能
3. 文件内容预览功能
4. 数据验证机制，确保上传文件符合预期格式
5. 错误处理，对无效文件格式给出明确提示

界面设计应简洁直观，上传流程清晰明了，并提供必要的操作指引。

# 项目概览
DLFlow是一个基于React和FastAPI的数据处理工作流平台，支持可视化的数据处理流程设计。项目包含：
- 前端：React + TypeScript + Ant Design + ReactFlow
- 后端：FastAPI + SQLAlchemy + PostgreSQL
- 现有组件：FileUpload.tsx、FileUploadArea.tsx、DataPreview.tsx
- 后端API：files.py提供文件上传、预览、删除等功能

⚠️ 警告：永远不要修改此部分 ⚠️
核心RIPER-5协议规则：
- 必须在每个响应开头声明当前模式
- RESEARCH模式：只允许观察和分析，禁止建议和实施
- INNOVATE模式：只允许讨论解决方案想法，禁止具体规划
- PLAN模式：创建详细技术规范，禁止实施
- EXECUTE模式：严格按计划实施，禁止偏离
- REVIEW模式：验证实施与计划的符合程度
- 未经明确信号不能转换模式
⚠️ 警告：永远不要修改此部分 ⚠️

# 分析
## 现有组件分析

### FileUpload.tsx
- 功能：基础文件上传，支持CSV和Parquet格式
- 特点：拖拽上传、进度显示、文件列表管理
- 限制：文件大小100MB，支持删除和预览（预览功能未完全实现）
- API调用：/api/files/upload, /api/files, /api/files/{id}/preview

### FileUploadArea.tsx
- 功能：增强的文件上传区域
- 特点：支持多文件上传、文件类型说明、上传状态管理
- 限制：预览功能标记为"开发中"
- 模拟上传进度，实际调用/api/upload

### DataPreview.tsx
- 功能：数据预览和分析
- 特点：表格预览、列信息、统计信息、多标签页展示
- 支持：数据类型识别、空值统计、示例值显示
- API调用：/api/files/{fileId}/preview

### 后端API (files.py)
- 上传：/api/files/upload - 支持项目关联、文件验证、自动处理任务
- 列表：/api/files - 支持过滤和分页
- 详情：/api/files/{file_id} - 获取文件信息
- 删除：/api/files/{file_id} - 删除文件和物理文件
- 处理：/api/files/{file_id}/process - 手动触发文件处理

## 发现的问题
1. FileUploadArea使用/api/upload而FileUpload使用/api/files/upload，API端点不一致
2. 预览功能在多个组件中标记为"开发中"，但DataPreview组件已实现
3. 文件格式自动识别功能基础存在，但验证机制不够完善
4. 错误处理主要在前端，后端验证相对简单
5. 缺少完整的数据验证流程（如CSV列标题验证、数据类型检查等）

## 技术栈分析

### 后端技术栈
- FastAPI + SQLAlchemy + Polars
- 已支持CSV和Parquet格式（配置在settings.ALLOWED_FILE_TYPES）
- Polars库已包含，支持高效的CSV和Parquet文件处理
- 数据处理服务（data_processor.py）已实现时间列检测、变量分析等功能
- 文件大小限制：100MB

### 前端技术栈
- React + TypeScript + Ant Design
- 现有组件功能完备但需要整合和增强
- PropertyPanel支持数据输入节点的文件选择配置
- 缺少统一的文件验证和预览流程

### 现有API端点
- POST /api/files/upload - 文件上传（需要project_id）
- GET /api/files - 文件列表
- GET /api/files/{file_id} - 文件详情
- GET /api/files/{file_id}/preview - 文件预览（DataPreview组件已实现）
- DELETE /api/files/{file_id} - 删除文件
- POST /api/files/{file_id}/process - 手动处理文件

# 提议的解决方案

## 方案一：统一API端点架构

### 核心思路
将现有的分散API端点统一到一个一致的架构下，解决FileUploadArea和FileUpload组件使用不同端点的问题。

### 具体方案
**选项A：标准化到/api/files/**
- 优势：与现有后端API完全兼容，无需修改数据库模型
- 劣势：需要修改FileUploadArea组件的API调用
- 实现复杂度：低

**选项B：创建统一的/api/data/upload端点**
- 优势：语义更清晰，专门用于数据文件上传
- 劣势：需要新增后端路由，可能与现有系统产生冲突
- 实现复杂度：中等

**选项C：适配器模式**
- 在前端创建API适配器层，统一不同组件的API调用
- 优势：不需要修改后端，前端改动最小
- 劣势：增加了抽象层，可能影响性能

## 方案二：预览功能集成策略

### 核心思路
将已实现的DataPreview组件与文件上传流程深度集成，提供无缝的预览体验。

### 具体方案
**选项A：嵌入式预览**
- 在FileUpload组件内直接嵌入DataPreview
- 优势：用户体验流畅，无需额外操作
- 劣势：组件耦合度高，可能影响性能

**选项B：模态框预览**
- 通过模态框展示DataPreview组件
- 优势：保持组件独立性，界面清晰
- 劣势：需要额外的用户交互步骤

**选项C：侧边栏预览**
- 在Workspace页面右侧添加预览面板
- 优势：可以同时查看多个文件，支持对比
- 劣势：占用屏幕空间，移动端适配困难

**选项D：渐进式预览**
- 上传过程中逐步显示文件信息：格式识别 → 基本统计 → 详细预览
- 优势：用户体验最佳，提供即时反馈
- 劣势：实现复杂度最高，需要流式处理

## 方案三：数据验证机制增强

### 核心思路
建立多层次的数据验证体系，从文件格式到数据内容的全面检查。

### 具体方案
**层次一：文件级验证**
- 文件扩展名检查
- MIME类型验证
- 文件头魔数验证（防止扩展名伪造）
- 文件大小和完整性检查

**层次二：格式级验证**
- CSV：编码检测、分隔符识别、引号处理
- Parquet：schema验证、压缩格式检查
- 通用：列数一致性、数据类型推断

**层次三：内容级验证**
- 必需列检查（如时间列、ID列）
- 数据范围验证（日期范围、数值范围）
- 空值比例检查
- 重复数据检测

**层次四：业务级验证**
- 与现有数据集的兼容性检查
- 工作流节点要求的数据格式验证
- 自定义验证规则支持

### 验证策略选择
**选项A：前端预验证 + 后端完整验证**
- 优势：用户体验好，减少无效上传
- 劣势：前端验证可能被绕过，需要重复逻辑

**选项B：纯后端验证**
- 优势：安全性高，逻辑集中
- 劣势：用户需要等待上传完成才能看到错误

**选项C：流式验证**
- 边上传边验证，实时反馈
- 优势：体验最佳，可以提前终止无效上传
- 劣势：实现复杂，需要WebSocket或Server-Sent Events

## 方案四：错误处理和用户体验优化

### 核心思路
建立用户友好的错误处理机制，提供清晰的指导和恢复建议。

### 具体方案
**错误分类和处理**
- 网络错误：自动重试机制，断点续传支持
- 格式错误：详细的错误说明和修复建议
- 数据错误：高亮问题行/列，提供数据清洗建议
- 系统错误：友好的错误页面，联系支持渠道

**用户指导系统**
- 交互式文件格式指南
- 示例文件下载
- 常见问题解答集成
- 视频教程链接

**进度和状态管理**
- 详细的上传进度显示
- 验证步骤可视化
- 后台处理状态通知
- 历史上传记录

## 方案五：组件重构和整合

### 核心思路
重新设计组件架构，提高代码复用性和维护性。

### 具体方案
**选项A：单一组件方案**
- 将FileUpload、FileUploadArea、DataPreview合并为一个综合组件
- 优势：逻辑集中，状态管理简单
- 劣势：组件过于庞大，难以维护

**选项B：组合组件方案**
- 保持组件独立，通过高阶组件或Context进行状态共享
- 优势：保持组件职责单一，灵活性高
- 劣势：状态管理复杂，可能出现同步问题

**选项C：Hook化重构**
- 将文件上传逻辑抽取为自定义Hook
- 组件只负责UI渲染，逻辑完全由Hook管理
- 优势：逻辑复用性强，测试容易
- 劣势：学习成本高，调试复杂

**选项D：微前端架构**
- 将文件上传功能作为独立的微应用
- 优势：完全独立开发和部署
- 劣势：架构复杂度大幅增加

## 推荐方案组合

基于技术可行性、实现复杂度和用户体验的综合考虑，推荐以下组合：

1. **API统一**：选择选项A（标准化到/api/files/），实现成本最低
2. **预览集成**：选择选项D（渐进式预览），提供最佳用户体验
3. **数据验证**：选择选项A（前端预验证 + 后端完整验证），平衡体验和安全
4. **错误处理**：实施完整的错误分类和用户指导系统
5. **组件重构**：选择选项C（Hook化重构），提高代码质量和可维护性

这个组合方案能够在保持现有系统稳定性的前提下，显著提升文件上传功能的用户体验和技术质量。

# 当前执行步骤："2. 制定详细技术规范"

## 详细技术规范

### 1. API端点统一规范

#### 目标
将FileUploadArea组件的API调用从/api/upload统一到/api/files/upload，确保所有文件上传组件使用一致的后端接口。

#### 具体修改
**文件路径**: `frontend/src/components/FileUploadArea.tsx`
**修改内容**:
- 将customRequest函数中的fetch调用从'/api/upload'改为'/api/files/upload'
- 添加project_id参数支持（可选，默认为null用于通用工作区）
- 修改FormData构造，移除file_id字段，使用后端自动生成的UUID
- 更新错误处理逻辑，适配后端API的响应格式

**依赖关系**: 无需修改后端API，现有/api/files/upload已支持所需功能

### 2. 渐进式预览功能规范

#### 目标
实现上传过程中的渐进式数据预览：文件信息 → 格式识别 → 基本统计 → 详细预览

#### 组件架构
**新增Hook**: `useFilePreview`
- 管理预览状态：idle, uploading, analyzing, preview, error
- 提供预览数据获取和状态管理功能
- 支持预览数据缓存和更新

**修改组件**: `FileUploadArea.tsx`
- 集成useFilePreview Hook
- 添加预览状态显示组件
- 实现渐进式预览UI更新

**预览阶段定义**:
1. **文件信息阶段**: 显示文件名、大小、类型
2. **格式识别阶段**: 显示文件格式验证结果
3. **基本统计阶段**: 显示行数、列数、数据类型分布
4. **详细预览阶段**: 嵌入DataPreview组件显示完整预览

#### API集成
**新增端点**: `/api/files/{file_id}/preview/stream`
- 支持流式预览数据获取
- 返回分阶段的预览信息
- 使用Server-Sent Events实现实时更新

### 3. 多层次数据验证机制规范

#### 前端验证层
**文件路径**: `frontend/src/hooks/useFileValidation.ts`
**验证内容**:
- 文件扩展名检查（.csv, .parquet）
- 文件大小限制（100MB）
- MIME类型基础验证
- 文件名合法性检查

#### 后端验证增强
**文件路径**: `backend/app/services/file_validator.py`
**新增功能**:
- 文件头魔数验证
- CSV编码检测和分隔符识别
- Parquet schema验证
- 数据类型一致性检查
- 必需列验证（可配置）

**修改文件**: `backend/app/api/endpoints/files.py`
**增强内容**:
- 集成file_validator服务
- 添加详细的验证错误响应
- 支持验证规则配置

### 4. Hook化重构规范

#### 核心Hook设计
**useFileUpload Hook**
```typescript
interface UseFileUploadOptions {
  maxFileSize?: number;
  acceptedTypes?: string[];
  projectId?: string;
  onSuccess?: (fileInfo: FileInfo) => void;
  onError?: (error: Error) => void;
}

interface UseFileUploadReturn {
  uploadFile: (file: File) => Promise<void>;
  uploadProgress: number;
  isUploading: boolean;
  uploadedFiles: FileInfo[];
  removeFile: (fileId: string) => void;
  retryUpload: (fileId: string) => void;
}
```

**useFilePreview Hook**
```typescript
interface UseFilePreviewReturn {
  previewData: PreviewData | null;
  previewStatus: 'idle' | 'loading' | 'success' | 'error';
  loadPreview: (fileId: string) => Promise<void>;
  clearPreview: () => void;
}
```

**useFileValidation Hook**
```typescript
interface UseFileValidationReturn {
  validateFile: (file: File) => ValidationResult;
  validationErrors: ValidationError[];
  isValid: boolean;
}
```

#### 组件重构计划
**FileUpload.tsx重构**:
- 移除内部状态管理逻辑
- 使用useFileUpload和useFilePreview Hooks
- 简化组件为纯UI渲染

**FileUploadArea.tsx重构**:
- 统一使用相同的Hook架构
- 移除重复的上传逻辑
- 专注于拖拽上传UI

### 5. 错误处理和用户体验优化规范

#### 错误分类系统
**错误类型定义**:
```typescript
interface FileError {
  type: 'network' | 'validation' | 'format' | 'system';
  code: string;
  message: string;
  details?: any;
  suggestions?: string[];
}
```

#### 用户指导系统
**新增组件**: `FileUploadGuide.tsx`
- 交互式文件格式说明
- 常见错误解决方案
- 示例文件下载链接

**新增组件**: `UploadErrorHandler.tsx`
- 错误信息展示
- 修复建议提供
- 重试操作支持

#### 进度状态管理
**状态定义**:
```typescript
interface UploadStatus {
  phase: 'uploading' | 'validating' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: any;
}
```

### 6. 测试策略

#### 单元测试
- Hook功能测试
- 验证逻辑测试
- 错误处理测试

#### 集成测试
- 文件上传流程测试
- API集成测试
- 预览功能测试

#### E2E测试
- 完整用户流程测试
- 错误场景测试
- 性能测试

## 实施清单

1. 创建useFileValidation Hook，实现前端文件验证逻辑
2. 创建useFileUpload Hook，抽取文件上传核心逻辑
3. 创建useFilePreview Hook，管理预览状态和数据
4. 修改FileUploadArea.tsx，统一API端点到/api/files/upload
5. 重构FileUploadArea.tsx，集成新的Hook架构
6. 重构FileUpload.tsx，使用Hook化架构
7. 创建FileUploadGuide.tsx组件，提供用户指导
8. 创建UploadErrorHandler.tsx组件，处理错误显示
9. 后端创建file_validator.py服务，增强数据验证
10. 修改backend/app/api/endpoints/files.py，集成验证服务
11. 新增/api/files/{file_id}/preview/stream端点，支持流式预览
12. 在FileUploadArea中实现渐进式预览UI
13. 添加错误分类和处理逻辑
14. 实现上传进度和状态可视化
15. 编写Hook单元测试
16. 编写组件集成测试
17. 编写API端点测试
18. 执行E2E测试验证完整流程
19. 性能优化和代码审查
20. 文档更新和部署准备

# 任务进度
[2025-01-15_14:30:00]
- 已修改：创建任务文件 .tasks/2025-01-15_5_file-upload-enhancement.md
- 更改：初始化任务文件，记录需求分析和现有组件分析
- 原因：建立任务跟踪和分析基础
- 阻碍因素：无
- 状态：未确认

# 最终审查
[完成后填充]