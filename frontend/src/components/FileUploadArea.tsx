import React, { useState } from 'react';
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
  Divider
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface FileUploadAreaProps {
  onFileUploaded: (fileInfo: any) => void;
}

interface UploadedFileInfo {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  upload_time: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  preview_data?: any;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFileUploaded }) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadedFileInfo[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

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

  // 文件上传前的验证
  const beforeUpload = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !['csv', 'parquet'].includes(fileExtension)) {
      message.error('只支持 CSV 和 Parquet 格式的文件');
      return false;
    }

    const isLt100M = file.size / 1024 / 1024 < 100;
    if (!isLt100M) {
      message.error('文件大小不能超过 100MB');
      return false;
    }

    return true;
  };

  // 自定义上传请求
  const customRequest = async (options: any) => {
    const { file, onProgress, onSuccess, onError } = options;
    
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    // 添加到上传中列表
    const fileInfo: UploadedFileInfo = {
      id: fileId,
      filename: file.name,
      file_type: fileExtension || 'unknown',
      file_size: file.size,
      upload_time: new Date().toISOString(),
      status: 'uploading',
      progress: 0
    };
    
    setUploadingFiles(prev => [...prev, fileInfo]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('file_id', fileId);

      // 模拟上传进度
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress > 90) {
          progress = 90;
          clearInterval(progressInterval);
        }
        
        setUploadingFiles(prev => 
          prev.map(f => 
            f.id === fileId 
              ? { ...f, progress: Math.round(progress) }
              : f
          )
        );
        
        onProgress({ percent: Math.round(progress) });
      }, 200);

      // 实际上传请求
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 更新文件状态为成功
      const successFileInfo = {
        ...fileInfo,
        status: 'success' as const,
        progress: 100,
        preview_data: result.preview_data
      };
      
      setUploadingFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? successFileInfo
            : f
        )
      );

      onProgress({ percent: 100 });
      onSuccess(result);
      
      // 通知父组件
      onFileUploaded({
        id: fileId,
        filename: file.name,
        file_type: fileExtension,
        file_size: file.size,
        upload_time: new Date().toISOString(),
        preview_data: result.preview_data
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // 更新文件状态为失败
      setUploadingFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'error' as const, progress: 0 }
            : f
        )
      );
      
      onError(error);
      message.error(`文件上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 移除文件
  const handleRemove = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    customRequest,
    beforeUpload,
    showUploadList: false,
    accept: '.csv,.parquet'
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
          支持 CSV 和 Parquet 格式文件，单个文件不超过 100MB
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

      {/* 上传中和已上传文件列表 */}
      {uploadingFiles.length > 0 && (
        <div>
          <Divider orientation="left" className="text-gray-300">
            文件上传状态
          </Divider>
          
          <div className="space-y-3">
            {uploadingFiles.map((file) => (
              <Card 
                key={file.id} 
                size="small" 
                className="bg-gray-800 border-gray-700"
                actions={[
                  file.status === 'success' && (
                    <Button 
                      type="text" 
                      size="small"
                      icon={<DatabaseOutlined />}
                      className="text-blue-400 hover:text-blue-300"
                      onClick={() => {
                        // TODO: 实现数据预览功能
                        message.info('数据预览功能开发中');
                      }}
                    >
                      预览
                    </Button>
                  ),
                  <Button 
                    type="text" 
                    size="small"
                    danger
                    onClick={() => handleRemove(file.id)}
                  >
                    移除
                  </Button>
                ]}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="text-lg">
                      {file.status === 'uploading' && (
                        <ClockCircleOutlined className="text-blue-400" />
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
                        <Text className="text-white font-medium">{file.filename}</Text>
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
                    </div>
                  </div>
                </div>
              </Card>
            ))}
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