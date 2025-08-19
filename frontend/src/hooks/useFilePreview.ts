import { useState, useCallback, useRef, useEffect } from 'react';
import { message } from 'antd';

// 预览数据接口
export interface PreviewData {
  columns: ColumnInfo[];
  preview_data: Record<string, any>[];
  total_rows: number;
  file_info: {
    filename: string;
    size: number;
    file_type: string;
  };
  statistics?: Record<string, any>;
}

// 列信息接口
export interface ColumnInfo {
  name: string;
  type: string;
  null_count: number;
  unique_count: number;
  sample_values?: any[];
}

// 预览阶段数据接口
export interface PreviewPhaseData {
  phase: 'file_info' | 'format_recognition' | 'basic_stats' | 'detailed_preview';
  data: any;
  progress: number;
  message: string;
}

// Hook选项接口
export interface UseFilePreviewOptions {
  enableProgressivePreview?: boolean; // 是否启用渐进式预览
  cachePreviewData?: boolean; // 是否缓存预览数据
  autoLoadPreview?: boolean; // 是否自动加载预览
}

// Hook返回值接口
export interface UseFilePreviewReturn {
  previewData: PreviewData | null;
  previewStatus: 'idle' | 'loading' | 'success' | 'error';
  previewProgress: number;
  currentPhase: PreviewPhaseData | null;
  loadPreview: (fileId: string) => Promise<void>;
  clearPreview: () => void;
  refreshPreview: (fileId: string) => Promise<void>;
  isPreviewSupported: (fileType: string) => boolean;
}

/**
 * 文件预览Hook
 * 提供文件预览功能，支持渐进式预览和数据缓存
 */
export const useFilePreview = (
  options: UseFilePreviewOptions = {}
): UseFilePreviewReturn => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewStatus, setPreviewStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [previewProgress, setPreviewProgress] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<PreviewPhaseData | null>(null);
  
  // 缓存预览数据
  const previewCacheRef = useRef<Map<string, PreviewData>>(new Map());
  
  // 当前加载的文件ID
  const currentFileIdRef = useRef<string | null>(null);
  
  // 支持预览的文件类型
  const supportedFileTypes = ['csv', 'parquet'];

  // 检查文件类型是否支持预览
  const isPreviewSupported = useCallback((fileType: string): boolean => {
    return supportedFileTypes.includes(fileType.toLowerCase());
  }, []);

  // 更新预览阶段
  const updatePreviewPhase = useCallback((phase: PreviewPhaseData) => {
    setCurrentPhase(phase);
    setPreviewProgress(phase.progress);
  }, []);

  // 渐进式预览 - 阶段1：文件信息
  const loadFileInfo = useCallback(async (fileId: string): Promise<any> => {
    updatePreviewPhase({
      phase: 'file_info',
      data: null,
      progress: 10,
      message: '正在获取文件信息...'
    });

    try {
      const response = await fetch(`/api/files/${fileId}`);
      if (!response.ok) {
        throw new Error('获取文件信息失败');
      }
      
      const fileInfo = await response.json();
      
      updatePreviewPhase({
        phase: 'file_info',
        data: fileInfo,
        progress: 25,
        message: '文件信息获取完成'
      });
      
      return fileInfo;
    } catch (error) {
      console.error('Error loading file info:', error);
      throw error;
    }
  }, [updatePreviewPhase]);

  // 渐进式预览 - 阶段2：格式识别
  const recognizeFormat = useCallback(async (fileId: string, fileInfo: any): Promise<any> => {
    updatePreviewPhase({
      phase: 'format_recognition',
      data: fileInfo,
      progress: 40,
      message: '正在识别文件格式...'
    });

    // 模拟格式识别过程
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const formatInfo = {
      ...fileInfo,
      format_details: {
        encoding: fileInfo.file_type === 'csv' ? 'UTF-8' : 'Binary',
        delimiter: fileInfo.file_type === 'csv' ? ',' : null,
        has_header: fileInfo.file_type === 'csv' ? true : null,
        compression: fileInfo.file_type === 'parquet' ? 'snappy' : null
      }
    };
    
    updatePreviewPhase({
      phase: 'format_recognition',
      data: formatInfo,
      progress: 50,
      message: '文件格式识别完成'
    });
    
    return formatInfo;
  }, [updatePreviewPhase]);

  // 渐进式预览 - 阶段3：基本统计
  const loadBasicStats = useCallback(async (fileId: string, formatInfo: any): Promise<any> => {
    updatePreviewPhase({
      phase: 'basic_stats',
      data: formatInfo,
      progress: 70,
      message: '正在分析数据结构...'
    });

    try {
      // 首先尝试获取基本统计信息（如果API支持）
      const response = await fetch(`/api/files/${fileId}/stats`);
      let basicStats = null;
      
      if (response.ok) {
        basicStats = await response.json();
      } else {
        // 如果没有专门的统计接口，从预览接口获取基本信息
        const previewResponse = await fetch(`/api/files/${fileId}/preview?limit=1`);
        if (previewResponse.ok) {
          const previewData = await previewResponse.json();
          basicStats = {
            total_rows: previewData.total_rows,
            total_columns: previewData.columns?.length || 0,
            column_types: previewData.columns?.reduce((acc: any, col: any) => {
              acc[col.name] = col.type;
              return acc;
            }, {}) || {}
          };
        }
      }
      
      const statsInfo = {
        ...formatInfo,
        basic_stats: basicStats
      };
      
      updatePreviewPhase({
        phase: 'basic_stats',
        data: statsInfo,
        progress: 85,
        message: '数据结构分析完成'
      });
      
      return statsInfo;
    } catch (error) {
      console.error('Error loading basic stats:', error);
      // 即使统计信息加载失败，也继续预览流程
      return formatInfo;
    }
  }, [updatePreviewPhase]);

  // 渐进式预览 - 阶段4：详细预览
  const loadDetailedPreview = useCallback(async (fileId: string, statsInfo: any): Promise<PreviewData> => {
    updatePreviewPhase({
      phase: 'detailed_preview',
      data: statsInfo,
      progress: 95,
      message: '正在加载详细预览...'
    });

    try {
      const response = await fetch(`/api/files/${fileId}/preview`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '预览加载失败' }));
        throw new Error(errorData.detail || '预览加载失败');
      }
      
      const previewData: PreviewData = await response.json();
      
      updatePreviewPhase({
        phase: 'detailed_preview',
        data: previewData,
        progress: 100,
        message: '预览加载完成'
      });
      
      return previewData;
    } catch (error) {
      console.error('Error loading detailed preview:', error);
      throw error;
    }
  }, [updatePreviewPhase]);

  // 主预览加载函数
  const loadPreview = useCallback(async (fileId: string): Promise<void> => {
    try {
      // 检查缓存
      if (options.cachePreviewData && previewCacheRef.current.has(fileId)) {
        const cachedData = previewCacheRef.current.get(fileId)!;
        setPreviewData(cachedData);
        setPreviewStatus('success');
        setPreviewProgress(100);
        return;
      }

      setPreviewStatus('loading');
      setPreviewProgress(0);
      currentFileIdRef.current = fileId;

      let result: PreviewData;

      if (options.enableProgressivePreview !== false) {
        // 渐进式预览
        const fileInfo = await loadFileInfo(fileId);
        
        // 检查文件类型是否支持预览
        if (!isPreviewSupported(fileInfo.file_type)) {
          throw new Error(`不支持预览 ${fileInfo.file_type.toUpperCase()} 格式的文件`);
        }
        
        const formatInfo = await recognizeFormat(fileId, fileInfo);
        const statsInfo = await loadBasicStats(fileId, formatInfo);
        result = await loadDetailedPreview(fileId, statsInfo);
      } else {
        // 直接加载完整预览
        setPreviewProgress(50);
        const response = await fetch(`/api/files/${fileId}/preview`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: '预览加载失败' }));
          throw new Error(errorData.detail || '预览加载失败');
        }
        result = await response.json();
        setPreviewProgress(100);
      }

      // 只有当前文件ID匹配时才更新状态（避免竞态条件）
      if (currentFileIdRef.current === fileId) {
        setPreviewData(result);
        setPreviewStatus('success');
        
        // 缓存预览数据
        if (options.cachePreviewData) {
          previewCacheRef.current.set(fileId, result);
        }
      }

    } catch (error) {
      console.error('Preview loading error:', error);
      
      // 只有当前文件ID匹配时才更新错误状态
      if (currentFileIdRef.current === fileId) {
        setPreviewStatus('error');
        setPreviewProgress(0);
        
        const errorMessage = error instanceof Error ? error.message : '预览加载失败';
        message.error(errorMessage);
      }
    } finally {
      // 清除当前阶段信息（延迟清除）
      setTimeout(() => {
        if (currentFileIdRef.current === fileId) {
          setCurrentPhase(null);
        }
      }, 2000);
    }
  }, [options, loadFileInfo, recognizeFormat, loadBasicStats, loadDetailedPreview, isPreviewSupported]);

  // 刷新预览
  const refreshPreview = useCallback(async (fileId: string): Promise<void> => {
    // 清除缓存
    if (options.cachePreviewData) {
      previewCacheRef.current.delete(fileId);
    }
    
    // 重新加载
    await loadPreview(fileId);
  }, [loadPreview, options.cachePreviewData]);

  // 清除预览
  const clearPreview = useCallback(() => {
    setPreviewData(null);
    setPreviewStatus('idle');
    setPreviewProgress(0);
    setCurrentPhase(null);
    currentFileIdRef.current = null;
  }, []);

  // 清理缓存（当组件卸载时）
  useEffect(() => {
    return () => {
      previewCacheRef.current.clear();
    };
  }, []);

  return {
    previewData,
    previewStatus,
    previewProgress,
    currentPhase,
    loadPreview,
    clearPreview,
    refreshPreview,
    isPreviewSupported
  };
};

export default useFilePreview;