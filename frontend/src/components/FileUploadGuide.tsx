import React from 'react';
import { Card, Typography, Steps, Alert, Tag, Space, Divider } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

interface FileUploadGuideProps {
  maxFileSize?: number;
  acceptedTypes?: string[];
  showAdvancedTips?: boolean;
}

const FileUploadGuide: React.FC<FileUploadGuideProps> = ({
  maxFileSize = 100,
  acceptedTypes = ['.csv', '.parquet'],
  showAdvancedTips = true
}) => {
  const uploadSteps = [
    {
      title: '选择文件',
      description: '点击上传区域或拖拽文件到指定区域',
      icon: <FileTextOutlined />
    },
    {
      title: '文件验证',
      description: '系统自动验证文件格式、大小和内容结构',
      icon: <CheckCircleOutlined />
    },
    {
      title: '数据上传',
      description: '文件上传到服务器并进行初步处理',
      icon: <DatabaseOutlined />
    },
    {
      title: '预览生成',
      description: '生成数据预览和统计信息',
      icon: <InfoCircleOutlined />
    }
  ];

  const fileTypeInfo = {
    '.csv': {
      name: 'CSV',
      description: '逗号分隔值文件',
      tips: [
        '确保使用UTF-8编码',
        '第一行应为列标题',
        '数据中不应包含多余的逗号',
        '日期格式建议使用ISO 8601标准'
      ],
      color: 'green'
    },
    '.parquet': {
      name: 'Parquet',
      description: '列式存储格式文件',
      tips: [
        '自动识别数据类型',
        '支持嵌套数据结构',
        '压缩效率高，读取速度快',
        '保留原始数据精度'
      ],
      color: 'blue'
    }
  };

  const commonIssues = [
    {
      issue: '文件大小超限',
      solution: `请确保文件大小不超过 ${maxFileSize}MB，可以考虑数据分片或压缩`,
      type: 'error'
    },
    {
      issue: '文件格式不支持',
      solution: `当前只支持 ${acceptedTypes.join(', ')} 格式，请转换文件格式后重试`,
      type: 'error'
    },
    {
      issue: '编码问题',
      solution: 'CSV文件请使用UTF-8编码，避免中文乱码问题',
      type: 'warning'
    },
    {
      issue: '数据结构异常',
      solution: '请检查数据格式，确保列标题完整且数据类型一致',
      type: 'warning'
    }
  ];

  return (
    <div className="space-y-4">
      {/* 上传流程指南 */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <ClockCircleOutlined className="text-blue-400" />
            <span className="text-white">上传流程</span>
          </div>
        }
        className="bg-gray-800 border-gray-700"
      >
        <Steps
          direction="horizontal"
          size="small"
          current={-1}
          className="upload-steps"
        >
          {uploadSteps.map((step, index) => (
            <Step
              key={index}
              title={<Text className="text-white">{step.title}</Text>}
              description={<Text className="text-gray-400 text-sm">{step.description}</Text>}
              icon={<div className="text-blue-400">{step.icon}</div>}
            />
          ))}
        </Steps>
      </Card>

      {/* 支持的文件格式 */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <FileTextOutlined className="text-blue-400" />
            <span className="text-white">支持的文件格式</span>
          </div>
        }
        className="bg-gray-800 border-gray-700"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {acceptedTypes.map((type) => {
            const info = fileTypeInfo[type as keyof typeof fileTypeInfo];
            if (!info) return null;
            
            return (
              <div key={type} className="border border-gray-600 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Tag color={info.color} className="text-sm font-medium">
                    {info.name}
                  </Tag>
                  <Text className="text-gray-300">{info.description}</Text>
                </div>
                
                <div className="space-y-1">
                  {info.tips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                      <Text className="text-gray-400 text-sm">{tip}</Text>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 文件要求 */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <InfoCircleOutlined className="text-blue-400" />
            <span className="text-white">文件要求</span>
          </div>
        }
        className="bg-gray-800 border-gray-700"
      >
        <Space direction="vertical" size="middle" className="w-full">
          <Alert
            message="文件大小限制"
            description={`单个文件大小不能超过 ${maxFileSize}MB`}
            type="info"
            showIcon
            className="bg-blue-900 border-blue-600"
          />
          
          <Alert
            message="数据质量要求"
            description="请确保数据完整性，避免空值过多或数据类型不一致的情况"
            type="info"
            showIcon
            className="bg-blue-900 border-blue-600"
          />
          
          <Alert
            message="时间列识别"
            description="系统会自动识别名为 'DateTime' 或 'tagTime' 的时间列，建议使用标准时间格式"
            type="info"
            showIcon
            className="bg-blue-900 border-blue-600"
          />
        </Space>
      </Card>

      {/* 常见问题解决 */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <ExclamationCircleOutlined className="text-orange-400" />
            <span className="text-white">常见问题</span>
          </div>
        }
        className="bg-gray-800 border-gray-700"
      >
        <div className="space-y-3">
          {commonIssues.map((item, index) => (
            <Alert
              key={index}
              message={item.issue}
              description={item.solution}
              type={item.type as 'error' | 'warning'}
              showIcon
              className={`${
                item.type === 'error' 
                  ? 'bg-red-900 border-red-600' 
                  : 'bg-orange-900 border-orange-600'
              }`}
            />
          ))}
        </div>
      </Card>

      {/* 高级提示 */}
      {showAdvancedTips && (
        <Card 
          title={
            <div className="flex items-center space-x-2">
              <DatabaseOutlined className="text-green-400" />
              <span className="text-white">高级提示</span>
            </div>
          }
          className="bg-gray-800 border-gray-700"
        >
          <div className="space-y-4">
            <div>
              <Title level={5} className="text-white mb-2">数据预处理建议</Title>
              <ul className="space-y-1 text-gray-400 text-sm">
                <li>• 删除不必要的空行和空列</li>
                <li>• 统一数值格式，避免混合文本和数字</li>
                <li>• 处理特殊字符和换行符</li>
                <li>• 确保时间戳格式一致</li>
              </ul>
            </div>
            
            <Divider className="border-gray-600" />
            
            <div>
              <Title level={5} className="text-white mb-2">性能优化</Title>
              <ul className="space-y-1 text-gray-400 text-sm">
                <li>• 大文件建议使用Parquet格式，上传和处理速度更快</li>
                <li>• 避免上传包含大量重复数据的文件</li>
                <li>• 考虑数据采样，先上传小样本验证格式</li>
                <li>• 批量上传时建议分批进行，避免网络超时</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default FileUploadGuide;