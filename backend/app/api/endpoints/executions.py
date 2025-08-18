"""执行历史管理API端点"""

from typing import List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.storage import ExecutionStorage, JSONStorage
from app.core.config import settings
import os

router = APIRouter()


class ExecutionResponse(BaseModel):
    """执行记录响应模型"""
    id: str
    project_id: str
    workflow_id: str
    execution_name: str
    input_parameters: dict
    output_results: dict
    status: str
    started_at: str
    completed_at: str
    created_at: str


@router.get("/{execution_id}", response_model=ExecutionResponse)
async def get_execution(execution_id: str):
    """获取执行记录详情"""
    execution = ExecutionStorage.get_execution(execution_id)
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="执行记录不存在"
        )
    
    return ExecutionResponse(**execution)


@router.get("/{execution_id}/steps", response_model=dict)
async def get_execution_steps(execution_id: str):
    """获取执行步骤列表"""
    # 检查执行记录是否存在
    execution = ExecutionStorage.get_execution(execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="执行记录不存在"
        )
    
    try:
        steps = []
        steps_dir = os.path.join(settings.EXECUTIONS_DIR, "steps", execution_id)
        
        if os.path.exists(steps_dir):
            for file_name in os.listdir(steps_dir):
                if file_name.endswith(".json"):
                    step_file = os.path.join(steps_dir, file_name)
                    step_data = JSONStorage.load_json(step_file)
                    
                    if step_data:
                        steps.append(step_data)
        
        # 按步骤顺序排序
        steps.sort(key=lambda x: x.get("step_order", 0))
        
        return {"steps": steps}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取执行步骤失败: {str(e)}"
        )


@router.delete("/{execution_id}", response_model=dict)
async def delete_execution(execution_id: str):
    """删除执行记录"""
    # 检查执行记录是否存在
    execution = ExecutionStorage.get_execution(execution_id)
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="执行记录不存在"
        )
    
    try:
        success = ExecutionStorage.delete_execution(execution_id)
        
        if success:
            # 删除相关的步骤文件
            steps_dir = os.path.join(settings.EXECUTIONS_DIR, "steps", execution_id)
            if os.path.exists(steps_dir):
                import shutil
                shutil.rmtree(steps_dir)
            
            # 删除结果文件
            results_dir = os.path.join(settings.EXECUTIONS_DIR, "results", execution_id)
            if os.path.exists(results_dir):
                import shutil
                shutil.rmtree(results_dir)
            
            return {
                "success": True,
                "message": "执行记录删除成功"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="执行记录删除失败"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除执行记录失败: {str(e)}"
        )


@router.delete("/{execution_id}/steps/{step_id}", response_model=dict)
async def delete_execution_step(execution_id: str, step_id: str):
    """删除执行步骤"""
    try:
        step_file = os.path.join(settings.EXECUTIONS_DIR, "steps", execution_id, f"{step_id}.json")
        
        if not os.path.exists(step_file):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="执行步骤不存在"
            )
        
        success = JSONStorage.delete_file(step_file)
        
        if success:
            return {
                "success": True,
                "message": "执行步骤删除成功"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="执行步骤删除失败"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除执行步骤失败: {str(e)}"
        )