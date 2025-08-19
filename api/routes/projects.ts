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

export default router;