import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Typography,
  Tag,
  Button,
  Space,
  Input,
  DatePicker,
  Select,
  Modal,
  Timeline,
  Progress,
  Alert,
  Popconfirm,
  message
} from 'antd';
import {
  HistoryOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  StopOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface ExecutionRecord {
  id: string;
  workflow_id: string;
  workflow_name: string;
  project_id: string;
  project_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_time: string;
  end_time?: string;
  duration?: number;
  progress: number;
  steps_total: number;
  steps_completed: number;
  error?: string;
  created_by: string;
}

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

const ExecutionHistory: React.FC = () => {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [stepsLoading, setStepsLoading] = useState(false);

  useEffect(() => {
    fetchExecutions();
  }, []);

  // 获取执行历史
  const fetchExecutions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/executions');
      if (response.ok) {
        const data = await response.json();
        setExecutions(data.executions || []);
      } else {
        message.error('获取执行历史失败');
      }
    } catch (error) {
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取执行步骤详情
  const fetchExecutionSteps = async (executionId: string) => {
    try {
      setStepsLoading(true);
      const response = await fetch(`/api/executions/${executionId}/steps`);
      if (response.ok) {
        const data = await response.json();
        setExecutionSteps(data.steps || []);
      } else {
        message.error('获取执行步骤失败');
      }
    } catch (error) {
      message.error('网络错误，请稍后重试');
    } finally {
      setStepsLoading(false);
    }
  };

  // 删除执行记录
  const handleDeleteExecution = async (executionId: string) => {
    try {
      const response = await fetch(`/api/executions/${executionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        message.success('执行记录删除成功');
        fetchExecutions();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    }
  };

  // 查看执行详情
  const handleViewDetails = (execution: ExecutionRecord) => {
    setSelectedExecution(execution);
    setDetailModalVisible(true);
    fetchExecutionSteps(execution.id);
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined className="text-gray-400" />;
      case 'running':
        return <PlayCircleOutlined className="text-blue-400" />;
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

  // 格式化时长
  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}秒`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}时${minutes}分`;
    }
  };

  // 过滤数据
  const filteredExecutions = executions.filter(execution => {
    const matchesSearch = 
      execution.workflow_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      execution.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || execution.status === statusFilter;
    
    const matchesDate = !dateRange || (
      dayjs(execution.start_time).isAfter(dateRange[0]) &&
      dayjs(execution.start_time).isBefore(dateRange[1])
    );
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // 表格列配置
  const columns: ColumnsType<ExecutionRecord> = [
    {
      title: '工作流',
      dataIndex: 'workflow_name',
      key: 'workflow_name',
      render: (text, record) => (
        <div>
          <Text className="text-white font-medium">{text}</Text>
          <br />
          <Text className="text-gray-400 text-sm">{record.project_name}</Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(status)}
          <Tag color={getStatusColor(status)}>
            {status.toUpperCase()}
          </Tag>
        </div>
      ),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress, record) => (
        <div>
          <Progress 
            percent={progress} 
            size="small"
            status={record.status === 'failed' ? 'exception' : 'active'}
          />
          <Text className="text-gray-400 text-xs">
            {record.steps_completed}/{record.steps_total} 步骤
          </Text>
        </div>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'start_time',
      key: 'start_time',
      width: 180,
      render: (time) => (
        <Text className="text-gray-300">
          {dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
        </Text>
      ),
    },
    {
      title: '执行时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (duration, record) => {
        if (duration) {
          return (
            <Text className="text-gray-300">
              {formatDuration(duration)}
            </Text>
          );
        } else if (record.status === 'running') {
          const elapsed = Math.floor((Date.now() - new Date(record.start_time).getTime()) / 1000);
          return (
            <Text className="text-blue-400">
              {formatDuration(elapsed)}
            </Text>
          );
        }
        return <Text className="text-gray-500">-</Text>;
      },
    },
    {
      title: '创建者',
      dataIndex: 'created_by',
      key: 'created_by',
      width: 100,
      render: (user) => (
        <Text className="text-gray-300">{user}</Text>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            className="text-gray-400 hover:text-blue-400"
          />
          <Popconfirm
            title="确定要删除这条执行记录吗？"
            onConfirm={() => handleDeleteExecution(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              className="text-gray-400 hover:text-red-400"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <HistoryOutlined className="text-2xl text-blue-400" />
          <Title level={2} className="text-white m-0">
            执行历史
          </Title>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={fetchExecutions}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      {/* 筛选器 */}
      <Card className="bg-gray-800 border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Search
            placeholder="搜索工作流或项目名称"
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="dark-input"
          />
          
          <Select
            placeholder="筛选状态"
            value={statusFilter}
            onChange={setStatusFilter}
            allowClear
            className="dark-select"
          >
            <Option value="pending">等待中</Option>
            <Option value="running">运行中</Option>
            <Option value="completed">已完成</Option>
            <Option value="failed">失败</Option>
            <Option value="cancelled">已取消</Option>
          </Select>
          
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            className="dark-input"
            placeholder={['开始日期', '结束日期']}
          />
          
          <Button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setDateRange(null);
            }}
          >
            重置筛选
          </Button>
        </div>
      </Card>

      {/* 执行历史表格 */}
      <Card className="bg-gray-800 border-gray-700">
        <Table
          columns={columns}
          dataSource={filteredExecutions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          className="dark-table"
        />
      </Card>

      {/* 执行详情模态框 */}
      <Modal
        title={
          selectedExecution && (
            <div className="flex items-center space-x-2">
              {getStatusIcon(selectedExecution.status)}
              <span>执行详情 - {selectedExecution.workflow_name}</span>
              <Tag color={getStatusColor(selectedExecution.status)}>
                {selectedExecution.status.toUpperCase()}
              </Tag>
            </div>
          )
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
        className="dark-modal"
      >
        {selectedExecution && (
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text className="text-gray-400 block">项目名称</Text>
                <Text className="text-white">{selectedExecution.project_name}</Text>
              </div>
              <div>
                <Text className="text-gray-400 block">工作流名称</Text>
                <Text className="text-white">{selectedExecution.workflow_name}</Text>
              </div>
              <div>
                <Text className="text-gray-400 block">开始时间</Text>
                <Text className="text-white">
                  {dayjs(selectedExecution.start_time).format('YYYY-MM-DD HH:mm:ss')}
                </Text>
              </div>
              <div>
                <Text className="text-gray-400 block">创建者</Text>
                <Text className="text-white">{selectedExecution.created_by}</Text>
              </div>
            </div>

            {/* 进度信息 */}
            <div>
              <Text className="text-gray-400 block mb-2">执行进度</Text>
              <Progress 
                percent={selectedExecution.progress} 
                status={selectedExecution.status === 'failed' ? 'exception' : 'active'}
              />
              <Text className="text-gray-400 text-sm">
                {selectedExecution.steps_completed}/{selectedExecution.steps_total} 步骤完成
              </Text>
            </div>

            {/* 错误信息 */}
            {selectedExecution.error && (
              <Alert
                message="执行错误"
                description={selectedExecution.error}
                type="error"
                showIcon
              />
            )}

            {/* 执行步骤 */}
            <div>
              <Text className="text-gray-400 block mb-3">执行步骤</Text>
              {stepsLoading ? (
                <div className="text-center py-4">
                  <Text className="text-gray-400">正在加载步骤信息...</Text>
                </div>
              ) : (
                <Timeline>
                  {executionSteps.map((step) => (
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
                        </div>
                        
                        {step.start_time && (
                          <Text className="text-gray-400 text-sm block">
                            开始: {dayjs(step.start_time).format('HH:mm:ss')}
                            {step.end_time && ` - 结束: ${dayjs(step.end_time).format('HH:mm:ss')}`}
                          </Text>
                        )}
                        
                        {step.error && (
                          <Alert
                            message={step.error}
                            type="error"
                            showIcon
                          />
                        )}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExecutionHistory;