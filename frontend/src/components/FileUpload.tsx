import React, { useState, useCallback, useEffect } from 'react';
import { Upload, message, Card, Typography, Progress, Space, Button, List, Tag, Modal, Spin } from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useFileUpload } from '../hooks/useFileUpload';
import { useFilePreview } from '../hooks/useFilePreview';
import DataPreview from './DataPreview';

const { Dragger } = Upload;
const { Text, Title } = Typography;

interface FileUploadProps {
  onFileUploaded?: (fileInfo: any) => void;
  onFileSelected?: (fileId: string) => void;
  projectId?: string;
  maxFileSize?: number; // MB
  acceptedTypes?: string[];
  enablePreview?: boolean;
  showFileList?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  onFileSelected,
  projectId,
  maxFileSize = 100,
  acceptedTypes = ['.csv', '.parquet'],
  enablePreview = true,
  showFileList = true
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewFileId, setPreviewFileId] = useState<string>('');

  // 使用文件上传Hook
  const {
    uploadFile,
    uploadProgress,
    isUploading,
    uploadedFiles,
    currentUploadStatus,
    removeFile,
    retryUpload,
    refreshFileList
  } = useFileUpload({
    maxFileSize: maxFileSize * 1024 * 1024, // 转换为字节
    acceptedTypes,
    projectId,
    onSuccess: onFileUploaded,
    autoValidate: true
  });

  // 使用文件预览Hook
  const {
    previewData,
    previewStatus,
    currentPhase,
    loadPreview,
    clearPreview,
    isPreviewSupported
  } = useFilePreview({
    enableProgressivePreview: true,
    cachePreviewData: true
  });

  // 初始化时刷新文件列表
  useEffect(() => {
    if (showFileList) {
      refreshFileList();
    }
  }, [showFileList, refreshFileList]);

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: acceptedTypes.join(','),
    showUploadList: false,
    customRequest: useCallback(async ({ file, onSuccess, onError, onProgress }) => {
      try {
        const result = await uploadFile(file as File);
        if (result) {
          onProgress?.({ percent: 100 });
          onSuccess?.(result);
        } else {
          onError?.(new Error('上传失败'));
        }
      } catch (error) {
        onError?.(error as Error);
      }
    }, [uploadFile]),
    beforeUpload: useCallback((file) => {
      // Hook会自动进行详细验证，这里只做快速检查
      return true;
    }, []),
  };

  // 删除文件
  const handleDeleteFile = useCallback(async (fileId: string) => {
    try {
      await removeFile(fileId);
      if (selectedFileId === fileId) {
        setSelectedFileId('');
        onFileSelected?.('');
      }
    } catch (error) {
      console.error('Delete file error:', error);
    }
  }, [removeFile, selectedFileId, onFileSelected]);

  // 预览文件
  const handlePreviewFile = useCallback(async (fileId: string) => {
    if (!enablePreview) {
      message.info('预览功能已禁用');
      return;
    }

    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) {
      message.error('文件不存在');
      return;
    }

    if (!isPreviewSupported(file.file_type)) {
      message.error(`不支持预览 ${file.file_type.toUpperCase()} 格式的文件`);
      return;
    }

    setPreviewFileId(fileId);
    setShowPreviewModal(true);
    await loadPreview(fileId);
  }, [enablePreview, uploadedFiles, isPreviewSupported, loadPreview]);

  // 关闭预览
  const handleClosePreview = useCallback(() => {
    setShowPreviewModal(false);
    setPreviewFileId('');
    clearPreview();
  }, [clearPreview]);

  // 选择文件
  const handleSelectFile = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
    onFileSelected?.(fileId);
  }, [onFileSelected]);

  // 重试上传
  const handleRetryUpload = useCallback(async (fileId: string) => {
    await retryUpload(fileId);
  }, [retryUpload]);

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件类型标签颜色
  const getFileTypeColor = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'csv':
        return 'green';
      case 'parquet':
        return 'blue';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      {/* 文件上传区域 */}
      <Card className="bg-gray-800 border-gray-700">
        <Dragger {...uploadProps} className="dark-upload">
          <p className="ant-upload-drag-icon">
            <InboxOutlined className="text-blue-400 text-4xl" />
          </p>
          <p className="ant-upload-text text-white">
            点击或拖拽文件到此区域上传
          </p>
          <p className="ant-upload-hint text-gray-400">
            支持 {acceptedTypes.join(', ')} 格式，文件大小不超过 {maxFileSize}MB
          </p>
        </Dragger>

        {/* 上传状态显示 */}
        {currentUploadStatus && (
          <div className="mt-4">
            <div className="flex items-center space-x-3 mb-2">
              <Spin spinning={currentUploadStatus.phase !== 'complete' && currentUploadStatus.phase !== 'error'} />
              <Text className="text-white">{currentUploadStatus.message}</Text>
            </div>
            {currentPhase && (
              <div>
                <Text className="text-gray-400 text-sm">
                  阶段: {currentPhase.phase} - {currentPhase.message}
                </Text>
                <Progress 
                  percent={currentPhase.progress} 
                  status="active"
                  strokeColor="#1890ff"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 已上传文件列表 */}
      {showFileList && (
        <Card 
          title={
            <div className="flex items-center space-x-2">
              <FileTextOutlined className="text-blue-400" />
              <span className="text-white">已上传文件</span>
              <Tag>{uploadedFiles.length}</Tag>
            </div>
          }
          className="bg-gray-800 border-gray-700"
          extra={
            <Button 
              type="text" 
              icon={<UploadOutlined />}
              onClick={refreshFileList}
              className="text-gray-400 hover:text-white"
            >
              刷新
            </Button>
          }
        >
        {uploadedFiles.length === 0 ? (
          <div className="text-center py-8">
            <Text className="text-gray-500">暂无上传文件</Text>
          </div>
        ) : (
          <List
            dataSource={uploadedFiles}
            renderItem={(file) => (
              <List.Item
                className={`border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors ${
                  selectedFileId === file.id ? 'bg-blue-900 border-blue-600' : ''
                }`}
                onClick={() => handleSelectFile(file.id)}
                actions={[
                  file.status === 'success' && enablePreview && (
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewFile(file.id);
                      }}
                      className="text-gray-400 hover:text-blue-400"
                    />
                  ),
                  file.status === 'error' && (
                    <Button
                      type="text"
                      icon={<UploadOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRetryUpload(file.id);
                      }}
                      className="text-gray-400 hover:text-orange-400"
                    />
                  ),
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFile(file.id);
                    }}
                    className="text-gray-400 hover:text-red-400"
                    danger
                  />
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center relative">
                      <FileTextOutlined className="text-white" />
                      {/* 状态指示器 */}
                      <div className="absolute -top-1 -right-1">
                        {file.status === 'uploading' && (
                          <ClockCircleOutlined className="text-blue-400 text-xs" />
                        )}
                        {file.status === 'validating' && (
                          <Spin size="small" />
                        )}
                        {file.status === 'success' && (
                          <CheckCircleOutlined className="text-green-400 text-xs" />
                        )}
                        {file.status === 'error' && (
                          <ExclamationCircleOutlined className="text-red-400 text-xs" />
                        )}
                      </div>
                    </div>
                  }
                  title={
                    <div className="flex items-center space-x-2">
                      <Text className="text-white font-medium">{file.original_filename || file.filename}</Text>
                      <Tag color={getFileTypeColor(file.file_type)}>
                        {file.file_type.toUpperCase()}
                      </Tag>
                      {file.status === 'uploading' && (
                        <Tag color="processing">上传中</Tag>
                      )}
                      {file.status === 'validating' && (
                        <Tag color="processing">验证中</Tag>
                      )}
                      {file.status === 'error' && (
                        <Tag color="error">失败</Tag>
                      )}
                    </div>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text className="text-gray-400 text-sm">
                        大小: {formatFileSize(file.file_size || file.size)}
                      </Text>
                      <Text className="text-gray-400 text-sm">
                        上传时间: {new Date(file.upload_time).toLocaleString()}
                      </Text>
                      {file.rows && (
                        <Text className="text-gray-400 text-sm">
                          {file.rows} 行 × {file.columns?.length || 0} 列
                        </Text>
                      )}
                      {file.progress !== undefined && file.status === 'uploading' && (
                        <Progress 
                          percent={file.progress} 
                          size="small" 
                          className="mt-1"
                          strokeColor="#1890ff"
                        />
                      )}
                      {file.error && (
                        <Text className="text-red-400 text-xs">
                          错误: {file.error}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
        </Card>
      )}

      {/* 预览模态框 */}
      <Modal
        title="文件预览"
        open={showPreviewModal}
        onCancel={handleClosePreview}
        footer={null}
        width="90%"
        style={{ top: 20 }}
        className="dark-modal"
      >
        {previewStatus === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Spin size="large" />
            <Text className="ml-3 text-gray-400">正在加载预览...</Text>
          </div>
        )}
        
        {previewStatus === 'error' && (
          <div className="text-center py-8">
            <Text className="text-red-400">预览加载失败</Text>
          </div>
        )}
        
        {previewStatus === 'success' && previewData && previewFileId && (
          <DataPreview fileId={previewFileId} height={600} />
        )}
      </Modal>
    </div>
  );
};

export default FileUpload;