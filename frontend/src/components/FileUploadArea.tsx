import React, { useState, useCallback } from 'react';
import {
  Upload,
  Button,
  Progress,
  Alert,
  Typography,
  Space,
  Card,
  Tag,
  message,
  Divider,
  Spin
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useFileUpload } from '../hooks/useFileUpload';
import { useFilePreview } from '../hooks/useFilePreview';
import DataPreview from './DataPreview';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface FileUploadAreaProps {
  onFileUploaded?: (fileInfo: any) => void;
  projectId?: string;
  maxFileSize?: number;
  acceptedTypes?: string[];
  enablePreview?: boolean;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ 
  onFileUploaded,
  projectId,
  maxFileSize = 100,
  acceptedTypes = ['.csv', '.parquet'],
  enablePreview = true
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // 使用文件上传Hook
  const {
    uploadFile,
    uploadProgress,
    isUploading,
    uploadedFiles,
    currentUploadStatus,
    removeFile,
    retryUpload
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

  // 支持的文件类型
  const supportedTypes = {
    'csv': {
      name: 'CSV文件',
      description: '逗号分隔值文件，常用的数据交换格式',
      icon: <FileTextOutlined />,
      color: '#52c41a'
    },
    'parquet': {
      name: 'Parquet文件',
      description: '列式存储格式，适合大数据分析',
      icon: <DatabaseOutlined />,
      color: '#1890ff'
    }
  };

  // 文件上传前的验证（Hook内部已处理，这里只做基础检查）
  const beforeUpload = useCallback((file: File) => {
    // Hook会自动进行详细验证，这里只做快速检查
    return true;
  }, []);

  // 自定义上传请求（使用Hook处理）
  const customRequest = useCallback(async (options: any) => {
    const { file, onProgress, onSuccess, onError } = options;
    
    try {
      const result = await uploadFile(file);
      if (result) {
        onProgress({ percent: 100 });
        onSuccess(result);
      } else {
        onError(new Error('上传失败'));
      }
    } catch (error) {
      onError(error);
    }
  }, [uploadFile]);

  // 预览文件
  const handlePreview = useCallback(async (fileId: string) => {
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

    setSelectedFileId(fileId);
    setShowPreview(true);
    await loadPreview(fileId);
  }, [enablePreview, uploadedFiles, isPreviewSupported, loadPreview]);

  // 关闭预览
  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setSelectedFileId('');
    clearPreview();
  }, [clearPreview]);

  // 重试上传
  const handleRetry = useCallback(async (fileId: string) => {
    await retryUpload(fileId);
  }, [retryUpload]);

  // 移除文件
  const handleRemove = useCallback(async (fileId: string) => {
    await removeFile(fileId);
  }, [removeFile]);

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    customRequest,
    beforeUpload,
    showUploadList: false,
    accept: acceptedTypes.join(',')
  };

  return (
    <div className="file-upload-area">
      {/* 上传区域 */}
      <Dragger {...uploadProps} className="mb-6">
        <p className="ant-upload-drag-icon">
          <UploadOutlined className="text-4xl text-blue-400" />
        </p>
        <p className="ant-upload-text text-white">
          点击或拖拽文件到此区域上传
        </p>
        <p className="ant-upload-hint text-gray-400">
          支持 {acceptedTypes.join(', ')} 格式文件，单个文件不超过 {maxFileSize}MB
        </p>
      </Dragger>

      {/* 支持的文件类型说明 */}
      <Card 
        size="small" 
        title="支持的文件格式" 
        className="mb-6 bg-gray-800 border-gray-700"
      >
        <div className="space-y-3">
          {Object.entries(supportedTypes).map(([type, info]) => (
            <div key={type} className="flex items-start space-x-3">
              <div className="text-lg" style={{ color: info.color }}>
                {info.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <Text className="text-white font-medium">{info.name}</Text>
                  <Tag color={info.color}>.{type}</Tag>
                </div>
                <Text className="text-gray-400 text-sm">{info.description}</Text>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 上传状态显示 */}
      {currentUploadStatus && (
        <Card className="mb-4 bg-gray-800 border-gray-700">
          <div className="flex items-center space-x-3">
            <Spin spinning={currentUploadStatus.phase !== 'complete' && currentUploadStatus.phase !== 'error'} />
            <div className="flex-1">
              <Text className="text-white">{currentUploadStatus.message}</Text>
              {currentPhase && (
                <div className="mt-2">
                  <Text className="text-gray-400 text-sm">
                    阶段: {currentPhase.phase} - {currentPhase.message}
                  </Text>
                  <Progress 
                    percent={currentPhase.progress} 
                    size="small" 
                    className="mt-1"
                    strokeColor="#1890ff"
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 上传中和已上传文件列表 */}
      {uploadedFiles.length > 0 && (
        <div>
          <Divider orientation="left" className="text-gray-300">
            文件列表 ({uploadedFiles.length})
          </Divider>
          
          <div className="space-y-3">
            {uploadedFiles.map((file) => (
              <Card 
                key={file.id} 
                size="small" 
                className="bg-gray-800 border-gray-700"
                actions={[
                  file.status === 'success' && enablePreview && (
                    <Button 
                      type="text" 
                      size="small"
                      icon={<EyeOutlined />}
                      className="text-blue-400 hover:text-blue-300"
                      onClick={() => handlePreview(file.id)}
                    >
                      预览
                    </Button>
                  ),
                  file.status === 'error' && (
                    <Button 
                      type="text" 
                      size="small"
                      icon={<UploadOutlined />}
                      className="text-orange-400 hover:text-orange-300"
                      onClick={() => handleRetry(file.id)}
                    >
                      重试
                    </Button>
                  ),
                  <Button 
                    type="text" 
                    size="small"
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => handleRemove(file.id)}
                  >
                    删除
                  </Button>
                ]}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="text-lg">
                      {file.status === 'uploading' && (
                        <ClockCircleOutlined className="text-blue-400" />
                      )}
                      {file.status === 'validating' && (
                        <Spin size="small" />
                      )}
                      {file.status === 'success' && (
                        <CheckCircleOutlined className="text-green-400" />
                      )}
                      {file.status === 'error' && (
                        <ExclamationCircleOutlined className="text-red-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Text className="text-white font-medium">{file.original_filename}</Text>
                        <Tag color={supportedTypes[file.file_type as keyof typeof supportedTypes]?.color || 'default'}>
                          {file.file_type.toUpperCase()}
                        </Tag>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1">
                        <Text className="text-gray-400 text-xs">
                          {(file.file_size / 1024 / 1024).toFixed(2)} MB
                        </Text>
                        <Text className="text-gray-400 text-xs">
                          {new Date(file.upload_time).toLocaleString()}
                        </Text>
                      </div>
                      
                      {file.status === 'uploading' && (
                        <Progress 
                          percent={file.progress} 
                          size="small" 
                          className="mt-2"
                          strokeColor="#1890ff"
                        />
                      )}
                      
                      {file.error && (
                        <Text className="text-red-400 text-xs mt-1 block">
                          错误: {file.error}
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 数据预览模态框 */}
      {showPreview && selectedFileId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-6xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <Text className="text-white text-lg font-medium">数据预览</Text>
              <Button 
                type="text" 
                onClick={handleClosePreview}
                className="text-gray-400 hover:text-white"
              >
                关闭
              </Button>
            </div>
            
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
            
            {previewStatus === 'success' && previewData && (
              <DataPreview fileId={selectedFileId} height={600} />
            )}
          </div>
        </div>
      )}

      {/* 使用提示 */}
      <Alert
        message="使用提示"
        description={
          <div className="space-y-2 text-sm">
            <div>• 上传的数据文件将用于工作流中的数据输入节点</div>
            <div>• CSV文件请确保使用UTF-8编码，第一行为列标题</div>
            <div>• Parquet文件将自动识别数据类型和结构</div>
            <div>• 时间数据请使用标准格式，系统将自动识别DateTime和tagTime列</div>
            <div>• 支持拖拽上传和批量上传多个文件</div>
            <div>• 上传完成后可点击预览按钮查看数据内容</div>
          </div>
        }
        type="info"
        showIcon
        className="mt-6 bg-gray-800 border-gray-600"
      />
    </div>
  );
};

export default FileUploadArea;