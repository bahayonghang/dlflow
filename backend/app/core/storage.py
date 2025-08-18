"""数据存储管理模块"""

import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path

from app.core.config import settings


def ensure_data_directories():
    """确保所有数据目录存在"""
    directories = [
        settings.DATA_DIR,
        settings.UPLOAD_DIR,
        settings.PROJECTS_DIR,
        settings.WORKFLOWS_DIR,
        settings.EXECUTIONS_DIR,
        settings.TASKS_DIR,
        settings.CHARTS_DIR,
        settings.TEMP_DIR,
        os.path.join(settings.UPLOAD_DIR, "metadata"),
        os.path.join(settings.EXECUTIONS_DIR, "steps"),
        os.path.join(settings.EXECUTIONS_DIR, "results"),
        os.path.join(settings.TASKS_DIR, "logs")
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)


class JSONStorage:
    """JSON文件存储管理器"""
    
    @staticmethod
    def save_json(file_path: str, data: Dict[str, Any]) -> bool:
        """保存JSON数据到文件"""
        try:
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
            return True
        except Exception as e:
            print(f"Error saving JSON to {file_path}: {e}")
            return False
    
    @staticmethod
    def load_json(file_path: str) -> Optional[Dict[str, Any]]:
        """从文件加载JSON数据"""
        try:
            if not os.path.exists(file_path):
                return None
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading JSON from {file_path}: {e}")
            return None
    
    @staticmethod
    def delete_file(file_path: str) -> bool:
        """删除文件"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            return True
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
            return False


class ProjectStorage:
    """项目存储管理器"""
    
    @staticmethod
    def create_project(name: str, description: str = "", metadata: Dict[str, Any] = None) -> str:
        """创建新项目"""
        project_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        project_data = {
            "id": project_id,
            "name": name,
            "description": description,
            "workflow_path": "",
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
            "status": "active",
            "execution_count": 0,
            "last_execution_id": "",
            "associated_files": []
        }
        
        # 保存项目文件
        project_file = os.path.join(settings.PROJECTS_DIR, f"{project_id}.json")
        JSONStorage.save_json(project_file, project_data)
        
        # 更新项目索引
        ProjectStorage.update_project_index()
        
        return project_id
    
    @staticmethod
    def get_project(project_id: str) -> Optional[Dict[str, Any]]:
        """获取项目信息"""
        project_file = os.path.join(settings.PROJECTS_DIR, f"{project_id}.json")
        return JSONStorage.load_json(project_file)
    
    @staticmethod
    def update_project(project_id: str, updates: Dict[str, Any]) -> bool:
        """更新项目信息"""
        project = ProjectStorage.get_project(project_id)
        if not project:
            return False
        
        project.update(updates)
        project["updated_at"] = datetime.now().isoformat()
        
        project_file = os.path.join(settings.PROJECTS_DIR, f"{project_id}.json")
        success = JSONStorage.save_json(project_file, project)
        
        if success:
            ProjectStorage.update_project_index()
        
        return success
    
    @staticmethod
    def delete_project(project_id: str) -> bool:
        """删除项目"""
        project_file = os.path.join(settings.PROJECTS_DIR, f"{project_id}.json")
        success = JSONStorage.delete_file(project_file)
        
        if success:
            ProjectStorage.update_project_index()
        
        return success
    
    @staticmethod
    def list_projects() -> List[Dict[str, Any]]:
        """获取项目列表"""
        index_file = os.path.join(settings.PROJECTS_DIR, "index.json")
        index_data = JSONStorage.load_json(index_file)
        
        if not index_data:
            return []
        
        return index_data.get("projects", [])
    
    @staticmethod
    def update_project_index():
        """更新项目索引"""
        projects = []
        
        # 扫描所有项目文件
        for file_name in os.listdir(settings.PROJECTS_DIR):
            if file_name.endswith(".json") and file_name != "index.json":
                project_file = os.path.join(settings.PROJECTS_DIR, file_name)
                project_data = JSONStorage.load_json(project_file)
                
                if project_data:
                    projects.append({
                        "id": project_data["id"],
                        "name": project_data["name"],
                        "status": project_data["status"],
                        "created_at": project_data["created_at"],
                        "updated_at": project_data["updated_at"]
                    })
        
        # 按更新时间排序
        projects.sort(key=lambda x: x["updated_at"], reverse=True)
        
        index_data = {
            "projects": projects,
            "total_count": len(projects),
            "last_updated": datetime.now().isoformat()
        }
        
        index_file = os.path.join(settings.PROJECTS_DIR, "index.json")
        JSONStorage.save_json(index_file, index_data)


class ExecutionStorage:
    """执行历史存储管理器"""
    
    @staticmethod
    def create_execution(project_id: str, workflow_id: str, execution_name: str, 
                        input_parameters: Dict[str, Any]) -> str:
        """创建执行记录"""
        execution_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        execution_data = {
            "id": execution_id,
            "project_id": project_id,
            "workflow_id": workflow_id,
            "execution_name": execution_name,
            "input_parameters": input_parameters,
            "output_results": {},
            "status": "pending",
            "started_at": now,
            "completed_at": "",
            "created_at": now,
            "execution_time_seconds": 0,
            "step_count": 0,
            "error_message": ""
        }
        
        execution_file = os.path.join(settings.EXECUTIONS_DIR, f"{execution_id}.json")
        JSONStorage.save_json(execution_file, execution_data)
        
        return execution_id
    
    @staticmethod
    def get_execution(execution_id: str) -> Optional[Dict[str, Any]]:
        """获取执行记录"""
        execution_file = os.path.join(settings.EXECUTIONS_DIR, f"{execution_id}.json")
        return JSONStorage.load_json(execution_file)
    
    @staticmethod
    def update_execution(execution_id: str, updates: Dict[str, Any]) -> bool:
        """更新执行记录"""
        execution = ExecutionStorage.get_execution(execution_id)
        if not execution:
            return False
        
        execution.update(updates)
        
        execution_file = os.path.join(settings.EXECUTIONS_DIR, f"{execution_id}.json")
        return JSONStorage.save_json(execution_file, execution)
    
    @staticmethod
    def delete_execution(execution_id: str) -> bool:
        """删除执行记录"""
        execution_file = os.path.join(settings.EXECUTIONS_DIR, f"{execution_id}.json")
        return JSONStorage.delete_file(execution_file)
    
    @staticmethod
    def list_project_executions(project_id: str) -> List[Dict[str, Any]]:
        """获取项目的执行历史列表"""
        executions = []
        
        for file_name in os.listdir(settings.EXECUTIONS_DIR):
            if file_name.endswith(".json"):
                execution_file = os.path.join(settings.EXECUTIONS_DIR, file_name)
                execution_data = JSONStorage.load_json(execution_file)
                
                if execution_data and execution_data.get("project_id") == project_id:
                    executions.append(execution_data)
        
        # 按创建时间排序
        executions.sort(key=lambda x: x["created_at"], reverse=True)
        
        return executions