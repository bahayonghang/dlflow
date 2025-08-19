/**
 * 工作流管理API路由
 */

import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 工作流数据文件路径
const workflowsDataPath = path.join(process.cwd(), '..', 'data', 'workflows');

// 类型定义
interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  nodes?: any[];
  edges?: any[];
  metadata?: any;
}

/**
 * 获取工作流列表
 * GET /api/workflows
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // 确保工作流目录存在
    if (!fs.existsSync(workflowsDataPath)) {
      fs.mkdirSync(workflowsDataPath, { recursive: true });
    }

    // 读取工作流文件列表
    const files = fs.readdirSync(workflowsDataPath).filter(file => file.endsWith('.json'));
    const workflows: Workflow[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(workflowsDataPath, file);
        const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        workflows.push(workflowData);
      } catch (error) {
        console.error(`Error reading workflow file ${file}:`, error);
      }
    }

    res.json({
      success: true,
      workflows,
      total: workflows.length
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      error: '获取工作流列表失败'
    });
  }
});

/**
 * 创建新工作流
 * POST /api/workflows
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, nodes = [], edges = [] } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: '工作流名称不能为空'
      });
    }

    // 生成工作流ID
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newWorkflow: Workflow = {
      id: workflowId,
      name,
      description: description || '',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      nodes,
      edges,
      metadata: {}
    };

    // 确保工作流目录存在
    if (!fs.existsSync(workflowsDataPath)) {
      fs.mkdirSync(workflowsDataPath, { recursive: true });
    }

    // 保存工作流文件
    const filePath = path.join(workflowsDataPath, `${workflowId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(newWorkflow, null, 2));

    res.json({
      success: true,
      workflow_id: workflowId,
      workflow: newWorkflow
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      error: '创建工作流失败'
    });
  }
});

/**
 * 获取特定工作流
 * GET /api/workflows/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const filePath = path.join(workflowsDataPath, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '工作流不存在'
      });
    }

    const workflow = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    res.json({
      success: true,
      workflow
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({
      success: false,
      error: '获取工作流失败'
    });
  }
});

/**
 * 更新工作流
 * PUT /api/workflows/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, nodes, edges, status, metadata } = req.body;
    const filePath = path.join(workflowsDataPath, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '工作流不存在'
      });
    }

    const existingWorkflow = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const updatedWorkflow = {
      ...existingWorkflow,
      name: name || existingWorkflow.name,
      description: description !== undefined ? description : existingWorkflow.description,
      nodes: nodes !== undefined ? nodes : existingWorkflow.nodes,
      edges: edges !== undefined ? edges : existingWorkflow.edges,
      status: status || existingWorkflow.status,
      metadata: metadata !== undefined ? metadata : existingWorkflow.metadata,
      updated_at: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(updatedWorkflow, null, 2));

    res.json({
      success: true,
      workflow: updatedWorkflow
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({
      success: false,
      error: '更新工作流失败'
    });
  }
});

/**
 * 删除工作流
 * DELETE /api/workflows/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const filePath = path.join(workflowsDataPath, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '工作流不存在'
      });
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: '工作流删除成功'
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({
      success: false,
      error: '删除工作流失败'
    });
  }
});

export default router;