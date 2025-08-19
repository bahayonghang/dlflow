import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { Node, Edge } from 'reactflow';

interface ProjectInfo {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface WorkspaceData {
  nodes: Node[];
  edges: Edge[];
  viewport?: { x: number; y: number; zoom: number };
}

interface UseProjectSyncReturn {
  projectInfo: ProjectInfo | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  loadProjectWorkspace: (projectId: string) => Promise<WorkspaceData | null>;
  syncWorkspace: (projectId: string, workspaceData: WorkspaceData, autoUpdateStatus?: boolean) => Promise<boolean>;
  updateProjectStatus: (projectId: string, status: string, reason?: string) => Promise<boolean>;
}

export const useProjectSync = (): UseProjectSyncReturn => {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 加载项目工作区数据
  const loadProjectWorkspace = useCallback(async (projectId: string): Promise<WorkspaceData | null> => {
    if (!projectId) return null;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/workspace`);
      const result = await response.json();
      
      if (result.success) {
        setProjectInfo(result.project_info);
        return result.workspace_data;
      } else {
        message.error('加载项目工作区数据失败');
        return null;
      }
    } catch (error) {
      console.error('Error loading project workspace:', error);
      message.error('加载项目工作区数据失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 同步工作区数据到项目
  const syncWorkspace = useCallback(async (
    projectId: string, 
    workspaceData: WorkspaceData, 
    autoUpdateStatus: boolean = true
  ): Promise<boolean> => {
    if (!projectId) return false;
    
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/sync-workspace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_data: workspaceData,
          auto_update_status: autoUpdateStatus
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLastSyncTime(new Date());
        message.success('工作区数据同步成功');
        return true;
      } else {
        message.error(result.message || '同步失败');
        return false;
      }
    } catch (error) {
      console.error('Error syncing workspace:', error);
      message.error('同步失败');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // 更新项目状态
  const updateProjectStatus = useCallback(async (
    projectId: string, 
    status: string, 
    reason?: string
  ): Promise<boolean> => {
    if (!projectId) return false;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          reason
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新本地项目信息
        if (projectInfo) {
          setProjectInfo({
            ...projectInfo,
            status: result.new_status,
            updated_at: result.updated_at
          });
        }
        message.success(result.message);
        return true;
      } else {
        message.error(result.message || '状态更新失败');
        return false;
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      message.error('状态更新失败');
      return false;
    }
  }, [projectInfo]);

  return {
    projectInfo,
    isLoading,
    isSyncing,
    lastSyncTime,
    loadProjectWorkspace,
    syncWorkspace,
    updateProjectStatus
  };
};