/**
 * 执行历史管理API路由
 */

import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// 执行历史数据文件路径
const executionsDataPath = path.join(process.cwd(), '..', 'data', 'executions');
const resultsDataPath = path.join(executionsDataPath, 'results');
const stepsDataPath = path.join(executionsDataPath, 'steps');

// 类型定义
interface Execution {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration?: number;
  progress?: number;
  current_step?: string;
  total_steps?: number;
  error_message?: string;
  metadata?: any;
}

interface ExecutionStep {
  id: string;
  execution_id: string;
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  duration?: number;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  logs?: string[];
}

/**
 * 获取执行历史列表
 * GET /api/executions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // 确保执行历史目录存在
    if (!fs.existsSync(executionsDataPath)) {
      fs.mkdirSync(executionsDataPath, { recursive: true });
    }
    if (!fs.existsSync(resultsDataPath)) {
      fs.mkdirSync(resultsDataPath, { recursive: true });
    }
    if (!fs.existsSync(stepsDataPath)) {
      fs.mkdirSync(stepsDataPath, { recursive: true });
    }

    // 读取执行历史文件列表
    const files = fs.readdirSync(resultsDataPath).filter(file => file.endsWith('.json'));
    const executions: Execution[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(resultsDataPath, file);
        const executionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        executions.push(executionData);
      } catch (error) {
        console.error(`Error reading execution file ${file}:`, error);
      }
    }

    // 按开始时间倒序排列
    executions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

    res.json({
      success: true,
      executions,
      total: executions.length
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({
      success: false,
      error: '获取执行历史失败'
    });
  }
});

/**
 * 创建新执行记录
 * POST /api/executions
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { workflow_id, workflow_name, metadata = {} } = req.body;
    
    if (!workflow_id) {
      return res.status(400).json({
        success: false,
        error: '工作流ID不能为空'
      });
    }

    // 生成执行ID
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newExecution: Execution = {
      id: executionId,
      workflow_id,
      workflow_name: workflow_name || '',
      status: 'pending',
      started_at: new Date().toISOString(),
      progress: 0,
      current_step: '',
      total_steps: 0,
      metadata
    };

    // 确保目录存在
    if (!fs.existsSync(resultsDataPath)) {
      fs.mkdirSync(resultsDataPath, { recursive: true });
    }

    // 保存执行记录文件
    const filePath = path.join(resultsDataPath, `${executionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(newExecution, null, 2));

    res.json({
      success: true,
      execution_id: executionId,
      execution: newExecution
    });
  } catch (error) {
    console.error('Error creating execution:', error);
    res.status(500).json({
      success: false,
      error: '创建执行记录失败'
    });
  }
});

/**
 * 获取特定执行记录
 * GET /api/executions/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const filePath = path.join(resultsDataPath, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '执行记录不存在'
      });
    }

    const execution = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    res.json({
      success: true,
      execution
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({
      success: false,
      error: '获取执行记录失败'
    });
  }
});

/**
 * 获取执行步骤详情
 * GET /api/executions/:id/steps
 */
router.get('/:id/steps', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stepsFilePath = path.join(stepsDataPath, `${id}_steps.json`);

    if (!fs.existsSync(stepsFilePath)) {
      return res.json({
        success: true,
        steps: []
      });
    }

    const stepsData = JSON.parse(fs.readFileSync(stepsFilePath, 'utf-8'));
    
    res.json({
      success: true,
      steps: stepsData.steps || []
    });
  } catch (error) {
    console.error('Error fetching execution steps:', error);
    res.status(500).json({
      success: false,
      error: '获取执行步骤失败'
    });
  }
});

/**
 * 更新执行记录
 * PUT /api/executions/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, progress, current_step, total_steps, error_message, metadata } = req.body;
    const filePath = path.join(resultsDataPath, `${id}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '执行记录不存在'
      });
    }

    const existingExecution = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    const updatedExecution = {
      ...existingExecution,
      status: status || existingExecution.status,
      progress: progress !== undefined ? progress : existingExecution.progress,
      current_step: current_step !== undefined ? current_step : existingExecution.current_step,
      total_steps: total_steps !== undefined ? total_steps : existingExecution.total_steps,
      error_message: error_message !== undefined ? error_message : existingExecution.error_message,
      metadata: metadata !== undefined ? metadata : existingExecution.metadata
    };

    // 如果状态变为完成或失败，设置完成时间和持续时间
    if ((status === 'completed' || status === 'failed') && !existingExecution.completed_at) {
      updatedExecution.completed_at = new Date().toISOString();
      const startTime = new Date(existingExecution.started_at).getTime();
      const endTime = new Date(updatedExecution.completed_at).getTime();
      updatedExecution.duration = endTime - startTime;
    }

    fs.writeFileSync(filePath, JSON.stringify(updatedExecution, null, 2));

    res.json({
      success: true,
      execution: updatedExecution
    });
  } catch (error) {
    console.error('Error updating execution:', error);
    res.status(500).json({
      success: false,
      error: '更新执行记录失败'
    });
  }
});

/**
 * 删除执行记录
 * DELETE /api/executions/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const executionFilePath = path.join(resultsDataPath, `${id}.json`);
    const stepsFilePath = path.join(stepsDataPath, `${id}_steps.json`);

    if (!fs.existsSync(executionFilePath)) {
      return res.status(404).json({
        success: false,
        error: '执行记录不存在'
      });
    }

    // 删除执行记录文件
    fs.unlinkSync(executionFilePath);
    
    // 删除步骤文件（如果存在）
    if (fs.existsSync(stepsFilePath)) {
      fs.unlinkSync(stepsFilePath);
    }

    res.json({
      success: true,
      message: '执行记录删除成功'
    });
  } catch (error) {
    console.error('Error deleting execution:', error);
    res.status(500).json({
      success: false,
      error: '删除执行记录失败'
    });
  }
});

export default router;