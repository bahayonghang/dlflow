import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { useFileValidation, ValidationResult } from './useFileValidation';

// 文件信息接口
export interface FileInfo {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  status: 'uploading' | 'success' | 'error' | 'validating';
  upload_time: string;
  progress: number;
  error?: string;
  preview_data?: any;
  // 兼容旧接口
  size?: number;
  rows?: number;
  columns?: string[];
}

// 上传状态接口
export interface UploadStatus {
  phase: 'uploading' | 'validating' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  details?: any;
}

// Hook选项接口
export interface UseFileUploadOptions {
  maxFileSize?: number;
  acceptedTypes?: string[];
  projectId?: string;
  onSuccess?: (fileInfo: FileInfo) => void;
  onError?: (error: Error, file?: File) => void;
  onProgress?: (progress: number, file: File) => void;
  autoValidate?: boolean;
}

// Hook返回值接口
export interface UseFileUploadReturn {
  uploadFile: (file: File) => Promise<FileInfo | null>;
  uploadFiles: (files: File[]) => Promise<(FileInfo | null)[]>;
  uploadProgress: number;
  isUploading: boolean;
  uploadedFiles: FileInfo[];
  currentUploadStatus: UploadStatus | null;
  currentPhase?: UploadStatus;
  removeFile: (fileId: string) => Promise<void>;
  retryUpload: (fileId: string) => Promise<void>;
  refreshFileList: () => Promise<void>;
  clearFiles: () => void;
  cancelUpload: () => void;
}

/**
 * 文件上传Hook
 * 提供完整的文件上传功能，包括验证、进度跟踪、错误处理等
 */
export const useFileUpload = (
  options: UseFileUploadOptions = {}
): UseFileUploadReturn => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [currentUploadStatus, setCurrentUploadStatus] = useState<UploadStatus | null>(null);
  
  // 用于取消上传的引用
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 文件验证Hook
  const { validateFile } = useFileValidation({
    maxFileSize: options.maxFileSize,
    acceptedTypes: options.acceptedTypes
  });

  // 更新上传状态
  const updateUploadStatus = useCallback((status: UploadStatus) => {
    setCurrentUploadStatus(status);
    setUploadProgress(status.progress);
  }, []);

  // 生成文件ID
  const generateFileId = useCallback(() => {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 创建FormData
  const createFormData = useCallback((file: File): FormData => {
    const formData = new FormData();
    formData.append('file', file);
    
    // 添加项目ID（如果提供）
    if (options.projectId) {
      formData.append('project_id', options.projectId);
    }
    
    // 添加描述信息
    formData.append('description', `数据文件: ${file.name}`);
    
    return formData;
  }, [options.projectId]);

  // 上传单个文件
  const uploadFile = useCallback(async (file: File): Promise<FileInfo | null> => {
    try {
      // 1. 验证文件（如果启用自动验证）
      if (options.autoValidate !== false) {
        updateUploadStatus({
          phase: 'validating',
          progress: 5,
          message: '正在验证文件...',
          details: { fileName: file.name }
        });

        const validationResult: ValidationResult = validateFile(file);
        if (!validationResult.isValid) {
          const errorMessage = validationResult.errors.map(e => e.message).join('; ');
          throw new Error(`文件验证失败: ${errorMessage}`);
        }

        // 显示警告（如果有）
        if (validationResult.warnings && validationResult.warnings.length > 0) {
          validationResult.warnings.forEach(warning => {
            message.warning(warning.message);
          });
        }
      }

      // 2. 准备上传
      setIsUploading(true);
      const fileId = generateFileId();
      const formData = createFormData(file);
      
      // 创建AbortController用于取消上传
      abortControllerRef.current = new AbortController();

      // 3. 创建临时文件信息
      const tempFileInfo: FileInfo = {
        id: fileId,
        filename: file.name,
        original_filename: file.name,
        file_size: file.size,
        file_type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        mime_type: file.type,
        status: 'uploading',
        upload_time: new Date().toISOString(),
        progress: 0
      };

      // 添加到上传列表
      setUploadedFiles(prev => [...prev, tempFileInfo]);

      updateUploadStatus({
        phase: 'uploading',
        progress: 10,
        message: '正在上传文件...',
        details: { fileName: file.name, fileSize: file.size }
      });

      // 4. 执行上传
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
        // 不设置Content-Type，让浏览器自动设置multipart/form-data边界
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '上传失败' }));
        throw new Error(errorData.detail || `上传失败: ${response.statusText}`);
      }

      updateUploadStatus({
        phase: 'processing',
        progress: 80,
        message: '正在处理文件...',
        details: { fileName: file.name }
      });

      // 5. 解析响应
      const result = await response.json();
      
      const fileInfo: FileInfo = {
        id: result.id,
        filename: result.filename,
        original_filename: result.original_filename,
        file_size: result.file_size,
        file_type: result.file_type,
        mime_type: result.mime_type,
        status: 'success',
        upload_time: result.created_at,
        progress: 100
      };

      // 6. 更新文件列表
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileId ? fileInfo : f)
      );

      updateUploadStatus({
        phase: 'complete',
        progress: 100,
        message: '文件上传完成',
        details: { fileName: file.name, fileId: result.id }
      });

      // 7. 调用成功回调
      if (options.onSuccess) {
        options.onSuccess(fileInfo);
      }

      message.success(`文件 ${file.name} 上传成功`);
      return fileInfo;

    } catch (error) {
      console.error('File upload error:', error);
      
      const errorMessage = error instanceof Error ? error.message : '上传失败';
      
      // 更新文件状态为错误
      setUploadedFiles(prev => 
        prev.map(f => 
          f.filename === file.name && f.status === 'uploading'
            ? { ...f, status: 'error' as const, error: errorMessage, progress: 0 }
            : f
        )
      );

      updateUploadStatus({
        phase: 'error',
        progress: 0,
        message: errorMessage,
        details: { fileName: file.name, error: errorMessage }
      });

      // 调用错误回调
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(errorMessage), file);
      }

      message.error(`文件上传失败: ${errorMessage}`);
      return null;

    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
      
      // 清除状态（延迟清除以便用户看到完成状态）
      setTimeout(() => {
        setCurrentUploadStatus(null);
        setUploadProgress(0);
      }, 2000);
    }
  }, [options, validateFile, updateUploadStatus, generateFileId, createFormData]);

  // 上传多个文件
  const uploadFiles = useCallback(async (files: File[]): Promise<(FileInfo | null)[]> => {
    const results: (FileInfo | null)[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updateUploadStatus({
        phase: 'uploading',
        progress: (i / files.length) * 100,
        message: `正在上传文件 ${i + 1}/${files.length}: ${file.name}`,
        details: { currentFile: i + 1, totalFiles: files.length, fileName: file.name }
      });
      
      const result = await uploadFile(file);
      results.push(result);
      
      // 如果上传被取消，停止后续上传
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }
    }
    
    return results;
  }, [uploadFile, updateUploadStatus]);

  // 删除文件
  const removeFile = useCallback(async (fileId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '删除失败' }));
        throw new Error(errorData.detail || '删除失败');
      }

      // 从列表中移除文件
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      message.success('文件删除成功');

    } catch (error) {
      console.error('File delete error:', error);
      const errorMessage = error instanceof Error ? error.message : '删除失败';
      message.error(`删除失败: ${errorMessage}`);
    }
  }, []);

  // 重试上传
  const retryUpload = useCallback(async (fileId: string): Promise<void> => {
    const fileToRetry = uploadedFiles.find(f => f.id === fileId);
    if (!fileToRetry) {
      message.error('找不到要重试的文件');
      return;
    }

    // 创建一个新的File对象用于重试（这里需要从原始文件重新创建）
    // 注意：实际实现中可能需要保存原始File对象的引用
    message.info(`准备重试上传: ${fileToRetry.original_filename}`);
    
    // 移除失败的文件记录
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    
    // 这里需要重新获取原始文件，实际实现中可能需要用户重新选择文件
    // 或者在上传时保存File对象的引用
  }, [uploadedFiles]);

  // 取消上传
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setCurrentUploadStatus({
        phase: 'error',
        progress: 0,
        message: '上传已取消',
        details: { cancelled: true }
      });
      message.info('上传已取消');
    }
  }, []);

  // 刷新文件列表
  const refreshFileList = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error('获取文件列表失败');
      }
      
      const result = await response.json();
      if (result.success && result.data?.files) {
        setUploadedFiles(result.data.files);
      }
    } catch (error) {
      console.error('Refresh file list error:', error);
      message.error('刷新文件列表失败');
    }
  }, []);

  // 清除文件列表
  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
    setUploadProgress(0);
    setCurrentUploadStatus(null);
  }, []);

  return {
    uploadFile,
    uploadFiles,
    uploadProgress,
    isUploading,
    uploadedFiles,
    currentUploadStatus,
    currentPhase: currentUploadStatus,
    removeFile,
    retryUpload,
    refreshFileList,
    clearFiles,
    cancelUpload
  };
};

export default useFileUpload;