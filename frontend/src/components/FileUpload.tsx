import React, { useState } from 'react';
import { Upload, message, Card, Typography, Progress, Space, Button, List, Tag } from 'antd';
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';

const { Dragger } = Upload;
const { Text, Title } = Typography;

interface FileInfo {
  id: string;
  filename: string;
  size: number;
  upload_time: string;
  file_type: string;
  columns?: string[];
  rows?: number;
}

interface FileUploadProps {
  onFileUploaded?: (fileInfo: FileInfo) => void;
  onFileSelected?: (fileId: string) => void;
  maxFileSize?: number; // MB
  acceptedTypes?: string[];
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  onFileSelected,
  maxFileSize = 100,
  acceptedTypes = ['.csv', '.parquet']
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');

  // 获取已上传文件列表
  React.useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.files || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: acceptedTypes.join(','),
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError, onProgress }) => {
      const formData = new FormData();
      formData.append('file', file as File);

      try {
        setUploading(true);
        setUploadProgress(0);

        const xhr = new XMLHttpRequest();
        
        // 监听上传进度
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
            onProgress?.({ percent: progress });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            message.success(`文件 ${response.filename} 上传成功！`);
            onSuccess?.(response);
            onFileUploaded?.(response);
            fetchUploadedFiles(); // 刷新文件列表
          } else {
            const error = JSON.parse(xhr.responseText);
            message.error(error.detail || '上传失败');
            onError?.(new Error(error.detail || '上传失败'));
          }
          setUploading(false);
          setUploadProgress(0);
        });

        xhr.addEventListener('error', () => {
          message.error('上传失败');
          onError?.(new Error('上传失败'));
          setUploading(false);
          setUploadProgress(0);
        });

        xhr.open('POST', '/api/files/upload');
        xhr.send(formData);
      } catch (error) {
        message.error('上传失败');
        onError?.(error as Error);
        setUploading(false);
        setUploadProgress(0);
      }
    },
    beforeUpload: (file) => {
      // 检查文件大小
      const isLtMaxSize = file.size / 1024 / 1024 < maxFileSize;
      if (!isLtMaxSize) {
        message.error(`文件大小不能超过 ${maxFileSize}MB!`);
        return false;
      }

      // 检查文件类型
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const isAcceptedType = acceptedTypes.includes(fileExtension);
      if (!isAcceptedType) {
        message.error(`只支持 ${acceptedTypes.join(', ')} 格式的文件!`);
        return false;
      }

      return true;
    },
  };

  // 删除文件
  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        message.success('文件删除成功');
        fetchUploadedFiles();
        if (selectedFileId === fileId) {
          setSelectedFileId('');
        }
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 预览文件
  const handlePreviewFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/preview`);
      if (response.ok) {
        const data = await response.json();
        // 这里可以打开一个模态框显示文件预览
        console.log('File preview:', data);
        message.info('预览功能开发中...');
      }
    } catch (error) {
      message.error('预览失败');
    }
  };

  // 选择文件
  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
    onFileSelected?.(fileId);
  };

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

        {/* 上传进度 */}
        {uploading && (
          <div className="mt-4">
            <Progress 
              percent={uploadProgress} 
              status="active"
              strokeColor="#1890ff"
            />
            <Text className="text-gray-400 text-sm mt-2 block">
              正在上传... {uploadProgress}%
            </Text>
          </div>
        )}
      </Card>

      {/* 已上传文件列表 */}
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
            onClick={fetchUploadedFiles}
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
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviewFile(file.id);
                    }}
                    className="text-gray-400 hover:text-blue-400"
                  />,
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
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <FileTextOutlined className="text-white" />
                    </div>
                  }
                  title={
                    <div className="flex items-center space-x-2">
                      <Text className="text-white font-medium">{file.filename}</Text>
                      <Tag color={getFileTypeColor(file.file_type)}>
                        {file.file_type.toUpperCase()}
                      </Tag>
                    </div>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Text className="text-gray-400 text-sm">
                        大小: {formatFileSize(file.size)}
                      </Text>
                      <Text className="text-gray-400 text-sm">
                        上传时间: {new Date(file.upload_time).toLocaleString()}
                      </Text>
                      {file.rows && (
                        <Text className="text-gray-400 text-sm">
                          {file.rows} 行 × {file.columns?.length || 0} 列
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
    </div>
  );
};

export default FileUpload;