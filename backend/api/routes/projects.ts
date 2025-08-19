/**
 * 项目管理API路由
 */

import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 项目数据文件路径
const projectsDataPath = path.join(process.cwd(), '..', 'data', 'projects', 'index.json');

// 类型定义
interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

interface ProjectsData {
  projects: Project[];
  total_count?: number;
  last_updated?: string;
}

/**
 * 获取项目列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // 检查项目数据文件是否存在
    if (!fs.existsSync(projectsDataPath)) {
      return res.json({
        success: true,
        projects: [],
        total: 0
      });
    }

    // 读取项目数据
    const projectsData: ProjectsData = JSON.parse(fs.readFileSync(projectsDataPath, 'utf-8'));
    
    res.json({
      success: true,
      projects: projectsData.projects || [],
      total: (projectsData.projects || []).length
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: '获取项目列表失败'
    });
  }
});

/**
 * 创建新项目
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: '项目名称不能为空'
      });
    }

    // 生成项目ID
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newProject = {
      id: projectId,
      name,
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    };

    // 读取现有项目数据
    let projectsData: ProjectsData = { projects: [] };
    if (fs.existsSync(projectsDataPath)) {
      projectsData = JSON.parse(fs.readFileSync(projectsDataPath, 'utf-8'));
    }

    // 添加新项目
    projectsData.projects = projectsData.projects || [];
    projectsData.projects.push(newProject);

    // 确保目录存在
    const projectsDir = path.dirname(projectsDataPath);
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    // 保存项目数据
    fs.writeFileSync(projectsDataPath, JSON.stringify(projectsData, null, 2));

    res.json({
      success: true,
      project_id: projectId,
      project: newProject
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: '创建项目失败'
    });
  }
});

/**
 * 更新项目
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, metadata } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: '项目名称不能为空'
      });
    }

    // 检查项目数据文件是否存在
    if (!fs.existsSync(projectsDataPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 读取项目数据
    const projectsData: ProjectsData = JSON.parse(fs.readFileSync(projectsDataPath, 'utf-8'));
    const projects = projectsData.projects || [];
    
    // 查找要更新的项目
    const projectIndex = projects.findIndex((p: Project) => p.id === id);
    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 更新项目信息
    const updatedProject = {
      ...projects[projectIndex],
      name,
      description: description || '',
      metadata: metadata || projects[projectIndex].metadata || {},
      updated_at: new Date().toISOString()
    };
    
    projects[projectIndex] = updatedProject;
    projectsData.projects = projects;

    // 保存更新后的数据
    fs.writeFileSync(projectsDataPath, JSON.stringify(projectsData, null, 2));

    res.json({
      success: true,
      project: updatedProject
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: '更新项目失败'
    });
  }
});

/**
 * 删除项目
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查项目数据文件是否存在
    if (!fs.existsSync(projectsDataPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 读取项目数据
    const projectsData: ProjectsData = JSON.parse(fs.readFileSync(projectsDataPath, 'utf-8'));
    const projects = projectsData.projects || [];
    
    // 查找要删除的项目
    const projectIndex = projects.findIndex((p: Project) => p.id === id);
    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 删除项目
    const deletedProject = projects[projectIndex];
    projects.splice(projectIndex, 1);
    projectsData.projects = projects;

    // 保存更新后的数据
    fs.writeFileSync(projectsDataPath, JSON.stringify(projectsData, null, 2));

    res.json({
      success: true,
      message: '项目删除成功',
      deleted_project: deletedProject
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: '删除项目失败'
    });
  }
});

/**
 * 获取项目工作区数据
 */
router.get('/:id/workspace', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查项目是否存在
    if (!fs.existsSync(projectsDataPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 读取项目数据
    const projectsData: ProjectsData = JSON.parse(fs.readFileSync(projectsDataPath, 'utf-8'));
    const project = projectsData.projects?.find((p: Project) => p.id === id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 工作区数据文件路径
    const workspaceDataPath = path.join(process.cwd(), '..', 'data', 'projects', id, 'workspace.json');
    
    // 默认工作区数据
    let workspaceData = {
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 }
    };

    // 如果工作区文件存在，读取数据
    if (fs.existsSync(workspaceDataPath)) {
      try {
        workspaceData = JSON.parse(fs.readFileSync(workspaceDataPath, 'utf-8'));
      } catch (error) {
        console.error('Error reading workspace data:', error);
        // 使用默认数据
      }
    }

    res.json({
      success: true,
      project_info: project,
      workspace_data: workspaceData
    });
  } catch (error) {
    console.error('Error fetching project workspace:', error);
    res.status(500).json({
      success: false,
      error: '获取工作区数据失败'
    });
  }
});

/**
 * 同步项目工作区数据
 */
router.post('/:id/sync-workspace', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { workspace_data, auto_update_status } = req.body;

    // 检查项目是否存在
    if (!fs.existsSync(projectsDataPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 读取项目数据
    const projectsData: ProjectsData = JSON.parse(fs.readFileSync(projectsDataPath, 'utf-8'));
    const projectIndex = projectsData.projects?.findIndex((p: Project) => p.id === id);
    
    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 工作区数据文件路径
    const workspaceDir = path.join(process.cwd(), '..', 'data', 'projects', id);
    const workspaceDataPath = path.join(workspaceDir, 'workspace.json');
    
    // 确保工作区目录存在
    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    // 保存工作区数据
    const dataToSave = {
      nodes: workspace_data?.nodes || [],
      edges: workspace_data?.edges || [],
      viewport: workspace_data?.viewport || { x: 0, y: 0, zoom: 1 },
      last_updated: new Date().toISOString()
    };

    fs.writeFileSync(workspaceDataPath, JSON.stringify(dataToSave, null, 2));

    // 如果需要自动更新项目状态
    if (auto_update_status) {
      const project = projectsData.projects[projectIndex];
      project.updated_at = new Date().toISOString();
      
      // 根据工作区内容更新状态
      if (dataToSave.nodes.length > 0 || dataToSave.edges.length > 0) {
        project.status = 'active';
      }
      
      // 保存更新后的项目数据
      fs.writeFileSync(projectsDataPath, JSON.stringify(projectsData, null, 2));
    }

    res.json({
      success: true,
      message: '工作区数据同步成功',
      sync_time: dataToSave.last_updated
    });
  } catch (error) {
    console.error('Error syncing workspace:', error);
    res.status(500).json({
      success: false,
      error: '同步工作区数据失败'
    });
  }
});

/**
 * 更新项目状态
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    // 验证状态值
    const validStatuses = ['active', 'archived', 'draft', 'paused', 'completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: '无效的状态值'
      });
    }

    // 检查项目是否存在
    if (!fs.existsSync(projectsDataPath)) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 读取项目数据
    const projectsData: ProjectsData = JSON.parse(fs.readFileSync(projectsDataPath, 'utf-8'));
    const projectIndex = projectsData.projects?.findIndex((p: Project) => p.id === id);
    
    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 更新项目状态
    const project = projectsData.projects[projectIndex];
    const oldStatus = project.status;
    project.status = status;
    project.updated_at = new Date().toISOString();
    
    // 如果提供了原因，添加到元数据中
    if (reason) {
      project.metadata = project.metadata || {};
      project.metadata.status_history = project.metadata.status_history || [];
      project.metadata.status_history.push({
        from: oldStatus,
        to: status,
        reason,
        timestamp: project.updated_at
      });
    }

    // 保存更新后的数据
    fs.writeFileSync(projectsDataPath, JSON.stringify(projectsData, null, 2));

    res.json({
      success: true,
      message: `项目状态已更新为 ${status}`,
      new_status: status,
      old_status: oldStatus,
      updated_at: project.updated_at,
      project: project
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({
      success: false,
      error: '更新项目状态失败'
    });
  }
});

export default router;