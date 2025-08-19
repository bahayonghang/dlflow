/**
 * 项目管理API路由
 */

import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 项目数据文件路径
const projectsDataPath = path.join(process.cwd(), '..', 'data', 'projects', 'index.json');

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
    const projectsData = JSON.parse(fs.readFileSync(projectsDataPath, 'utf-8'));
    
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
    let projectsData = { projects: [] };
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

export default router;