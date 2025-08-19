import React from 'react';
import { Alert, Button, Card, Typography, Space, Collapse, Tag } from 'antd';
import {
  ExclamationCircleOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import type { ValidationError } from '../hooks/useFileValidation';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface UploadError {
  type: 'validation' | 'upload' | 'network' | 'server' | 'unknown';
  code?: string;
  message: string;
  details?: string;
  suggestions?: string[];
  retryable?: boolean;
  validationErrors?: ValidationError[];
}

interface UploadErrorHandlerProps {
  error: UploadError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

const UploadErrorHandler: React.FC<UploadErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = true
}) => {
  if (!error) return null;

  // 错误类型配置
  const errorTypeConfig = {
    validation: {
      icon: <WarningOutlined />,
      color: 'warning',
      title: '文件验证失败',
      description: '文件不符合上传要求，请检查文件格式和内容'
    },
    upload: {
      icon: <ExclamationCircleOutlined />,
      color: 'error',
      title: '上传失败',
      description: '文件上传过程中发生错误'
    },
    network: {
      icon: <CloseCircleOutlined />,
      color: 'error',
      title: '网络错误',
      description: '网络连接异常，请检查网络状态'
    },
    server: {
      icon: <ExclamationCircleOutlined />,
      color: 'error',
      title: '服务器错误',
      description: '服务器处理请求时发生错误'
    },
    unknown: {
      icon: <InfoCircleOutlined />,
      color: 'info',
      title: '未知错误',
      description: '发生了未知错误，请稍后重试'
    }
  };

  const config = errorTypeConfig[error.type] || errorTypeConfig.unknown;

  // 渲染验证错误详情
  const renderValidationErrors = () => {
    if (!error.validationErrors || error.validationErrors.length === 0) {
      return null;
    }

    return (
      <div className="mt-4">
        <Text className="text-white font-medium mb-2 block">验证错误详情:</Text>
        <div className="space-y-2">
          {error.validationErrors.map((validationError, index) => (
            <div key={index} className="bg-gray-700 rounded p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Tag color="red">{validationError.type}</Tag>
                <Text className="text-red-400 font-medium">{validationError.field}</Text>
              </div>
              <Text className="text-gray-300 text-sm">{validationError.message}</Text>
              {validationError.expected && (
                <div className="mt-1">
                  <Text className="text-gray-400 text-xs">
                    期望值: {validationError.expected}
                  </Text>
                </div>
              )}
              {validationError.actual && (
                <div className="mt-1">
                  <Text className="text-gray-400 text-xs">
                    实际值: {validationError.actual}
                  </Text>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染建议
  const renderSuggestions = () => {
    if (!error.suggestions || error.suggestions.length === 0) {
      return null;
    }

    return (
      <div className="mt-4">
        <Text className="text-white font-medium mb-2 block">解决建议:</Text>
        <ul className="space-y-1">
          {error.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
              <Text className="text-gray-300 text-sm">{suggestion}</Text>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  // 渲染操作按钮
  const renderActions = () => {
    const actions = [];

    if (error.retryable && onRetry) {
      actions.push(
        <Button
          key="retry"
          type="primary"
          icon={<ReloadOutlined />}
          onClick={onRetry}
          size="small"
        >
          重试
        </Button>
      );
    }

    if (onDismiss) {
      actions.push(
        <Button
          key="dismiss"
          type="text"
          onClick={onDismiss}
          size="small"
          className="text-gray-400 hover:text-white"
        >
          关闭
        </Button>
      );
    }

    return actions.length > 0 ? (
      <div className="mt-4">
        <Space>{actions}</Space>
      </div>
    ) : null;
  };

  return (
    <Card className="bg-gray-800 border-gray-700 mb-4">
      <Alert
        message={
          <div className="flex items-center space-x-2">
            <span className="text-lg">{config.icon}</span>
            <span className="text-white font-medium">{config.title}</span>
            {error.code && (
              <Tag color="red" className="text-xs">{error.code}</Tag>
            )}
          </div>
        }
        description={
          <div>
            <Paragraph className="text-gray-300 mb-2">
              {error.message || config.description}
            </Paragraph>
            
            {showDetails && error.details && (
              <Collapse 
                ghost 
                size="small"
                className="error-details-collapse"
              >
                <Panel 
                  header={
                    <Text className="text-gray-400 text-sm">查看详细信息</Text>
                  } 
                  key="details"
                >
                  <div className="bg-gray-700 rounded p-3 mt-2">
                    <Text className="text-gray-300 text-sm font-mono">
                      {error.details}
                    </Text>
                  </div>
                </Panel>
              </Collapse>
            )}
            
            {renderValidationErrors()}
            {renderSuggestions()}
            {renderActions()}
          </div>
        }
        type={config.color as 'error' | 'warning' | 'info'}
        showIcon={false}
        className={`${
          config.color === 'error' 
            ? 'bg-red-900 border-red-600' 
            : config.color === 'warning'
            ? 'bg-orange-900 border-orange-600'
            : 'bg-blue-900 border-blue-600'
        }`}
      />
    </Card>
  );
};

// 错误工厂函数
export const createUploadError = {
  validation: (message: string, validationErrors?: ValidationError[], suggestions?: string[]): UploadError => ({
    type: 'validation',
    message,
    validationErrors,
    suggestions: suggestions || [
      '检查文件格式是否正确',
      '确认文件大小在允许范围内',
      '验证文件内容结构是否完整'
    ],
    retryable: true
  }),

  upload: (message: string, code?: string, details?: string): UploadError => ({
    type: 'upload',
    code,
    message,
    details,
    suggestions: [
      '检查网络连接是否稳定',
      '确认文件没有被其他程序占用',
      '尝试重新选择文件上传'
    ],
    retryable: true
  }),

  network: (message: string = '网络连接失败'): UploadError => ({
    type: 'network',
    message,
    suggestions: [
      '检查网络连接状态',
      '尝试刷新页面后重试',
      '如果问题持续，请联系技术支持'
    ],
    retryable: true
  }),

  server: (message: string, code?: string, details?: string): UploadError => ({
    type: 'server',
    code,
    message,
    details,
    suggestions: [
      '服务器暂时不可用，请稍后重试',
      '如果问题持续，请联系技术支持',
      '检查文件是否符合服务器要求'
    ],
    retryable: true
  }),

  unknown: (message: string = '发生未知错误'): UploadError => ({
    type: 'unknown',
    message,
    suggestions: [
      '请稍后重试',
      '如果问题持续，请联系技术支持',
      '尝试使用其他浏览器'
    ],
    retryable: true
  })
};

export type { UploadError };
export default UploadErrorHandler;