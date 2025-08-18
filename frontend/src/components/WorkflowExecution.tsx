import React, { useState, useEffect } from 'react';
import { Card, Typography, Progress, Timeline, Tag, Button, Space, Alert, Spin, Empty } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface ExecutionStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  start_time?: string;
  end_time?: string;
  progress?: number;
  logs?: string[];
  error?: string;
  result?: any;
}

interface ExecutionInfo {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_time: string;
  end_time?: string;
  progress: number;
  current_step?: string;
  steps: ExecutionStep[];
  logs: string[];
  error?: string;
  result?: any;
}

interface WorkflowExecutionProps {
  executionId?: string;
  onExecutionComplete?: (result: any) => void;
  onExecutionError?: (error: string) => void;
}

const WorkflowExecution: React.FC<WorkflowExecutionProps> = ({
  executionId,
  onExecutionComplete,
  onExecutionError
}) => {
  const [execution, setExecution] = useState<ExecutionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string>('');

  // 轮询间隔
  const POLL_INTERVAL = 2000;
  let pollTimer: NodeJS.Timeout | null = null;

  useEffect(() => {
    if (executionId) {
      fetchExecutionStatus();
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [executionId]);

  // 开始轮询
  const startPolling = () => {
    if (pollTimer) return;
    
    setPolling(true);
    pollTimer = setInterval(() => {
      fetchExecutionStatus();
    }, POLL_INTERVAL);
  };

  // 停止轮询
  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    setPolling(false);
  };

  // 获取执行状态
  const fetchExecutionStatus = async () => {
    if (!executionId) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/tasks/${executionId}`);
      if (response.ok) {
        const data = await response.json();
        setExecution(data);

        // 如果执行完成或失败，停止轮询
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          stopPolling();
          
          if (data.status === 'completed') {
            onExecutionComplete?.(data.result);
          } else if (data.status === 'failed') {
            onExecutionError?.(data.error || '执行失败');
          }
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '获取执行状态失败');
        stopPolling();
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      stopPolling();
    } finally {
      setLoading(false);
    }
  };

  // 取消执行
  const handleCancelExecution = async () => {
    if (!executionId) return;

    try {
      const response = await fetch(`/api/tasks/${executionId}/cancel`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchExecutionStatus();
      }
    } catch (err) {
      console.error('Cancel execution error:', err);
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined className="text-gray-400" />;
      case 'running':
        return <Spin size="small" />;
      case 'completed':
        return <CheckCircleOutlined className="text-green-400" />;
      case 'failed':
        return <ExclamationCircleOutlined className="text-red-400" />;
      case 'cancelled':
        return <StopOutlined className="text-orange-400" />;
      default:
        return <ClockCircleOutlined className="text-gray-400" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'running':
        return 'processing';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleString();
  };

  // 计算执行时长
  const getExecutionDuration = () => {
    if (!execution?.start_time) return '';
    
    const start = new Date(execution.start_time);
    const end = execution.end_time ? new Date(execution.end_time) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) {
      return `${duration}秒`;
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}分${duration % 60}秒`;
    } else {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      return `${hours}时${minutes}分`;
    }
  };

  if (!executionId) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <Empty
          description={
            <Text className="text-gray-400">暂无执行任务</Text>
          }
        />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <Alert
          message="获取执行状态失败"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchExecutionStatus}>
              重试
            </Button>
          }
        />
      </Card>
    );
  }

  if (!execution) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <div className="flex items-center justify-center py-8">
          <Spin size="large" />
          <Text className="ml-3 text-gray-400">正在加载执行信息...</Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 执行概览 */}
      <Card 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon(execution.status)}
              <span className="text-white">工作流执行</span>
              <Tag color={getStatusColor(execution.status)}>
                {execution.status.toUpperCase()}
              </Tag>
            </div>
            <Space>
              {polling && (
                <Tag color="blue" icon={<ReloadOutlined spin />}>
                  实时更新
                </Tag>
              )}
              {execution.status === 'running' && (
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<StopOutlined />}
                  onClick={handleCancelExecution}
                >
                  取消执行
                </Button>
              )}
            </Space>
          </div>
        }
        className="bg-gray-800 border-gray-700"
      >
        <div className="space-y-4">
          {/* 进度条 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Text className="text-gray-400">执行进度</Text>
              <Text className="text-white">{execution.progress}%</Text>
            </div>
            <Progress 
              percent={execution.progress} 
              status={execution.status === 'failed' ? 'exception' : 'active'}
              strokeColor={execution.status === 'completed' ? '#52c41a' : '#1890ff'}
            />
          </div>

          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text className="text-gray-400 block">开始时间</Text>
              <Text className="text-white">{formatTime(execution.start_time)}</Text>
            </div>
            <div>
              <Text className="text-gray-400 block">执行时长</Text>
              <Text className="text-white">{getExecutionDuration()}</Text>
            </div>
            {execution.current_step && (
              <div className="col-span-2">
                <Text className="text-gray-400 block">当前步骤</Text>
                <Text className="text-white">{execution.current_step}</Text>
              </div>
            )}
          </div>

          {/* 错误信息 */}
          {execution.error && (
            <Alert
              message="执行错误"
              description={execution.error}
              type="error"
              showIcon
            />
          )}
        </div>
      </Card>

      {/* 执行步骤 */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <PlayCircleOutlined className="text-blue-400" />
            <span className="text-white">执行步骤</span>
          </div>
        }
        className="bg-gray-800 border-gray-700"
      >
        <Timeline>
          {execution.steps.map((step, index) => (
            <Timeline.Item
              key={step.id}
              dot={getStatusIcon(step.status)}
              color={step.status === 'completed' ? 'green' : 
                     step.status === 'failed' ? 'red' : 
                     step.status === 'running' ? 'blue' : 'gray'}
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Text className="text-white font-medium">{step.name}</Text>
                  <Tag color={getStatusColor(step.status)}>
                    {step.status}
                  </Tag>
                  {step.progress !== undefined && step.status === 'running' && (
                    <Text className="text-gray-400 text-sm">{step.progress}%</Text>
                  )}
                </div>
                
                {step.start_time && (
                  <Text className="text-gray-400 text-sm block">
                    开始: {formatTime(step.start_time)}
                    {step.end_time && ` - 结束: ${formatTime(step.end_time)}`}
                  </Text>
                )}
                
                {step.error && (
                  <Alert
                      message={step.error}
                      type="error"
                      showIcon
                    />
                )}
                
                {step.logs && step.logs.length > 0 && (
                  <div className="bg-gray-900 p-2 rounded text-xs">
                    {step.logs.slice(-3).map((log, logIndex) => (
                      <div key={logIndex} className="text-gray-300">
                        {log}
                      </div>
                    ))}
                    {step.logs.length > 3 && (
                      <Text className="text-gray-500">... 更多日志</Text>
                    )}
                  </div>
                )}
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>

      {/* 执行日志 */}
      {execution.logs && execution.logs.length > 0 && (
        <Card 
          title={
            <div className="flex items-center space-x-2">
              <Text className="text-white">执行日志</Text>
            </div>
          }
          className="bg-gray-800 border-gray-700"
        >
          <div className="bg-gray-900 p-3 rounded max-h-60 overflow-y-auto">
            {execution.logs.map((log, index) => (
              <div key={index} className="text-gray-300 text-sm font-mono">
                {log}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 执行结果 */}
      {execution.result && execution.status === 'completed' && (
        <Card 
          title={
            <div className="flex items-center space-x-2">
              <CheckCircleOutlined className="text-green-400" />
              <span className="text-white">执行结果</span>
            </div>
          }
          className="bg-gray-800 border-gray-700"
        >
          <div className="bg-gray-900 p-3 rounded">
            <pre className="text-gray-300 text-sm">
              {JSON.stringify(execution.result, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
};

export default WorkflowExecution;