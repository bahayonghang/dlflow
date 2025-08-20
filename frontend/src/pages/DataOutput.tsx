import React, { useState, useCallback, useEffect } from 'react';
import {
  Layout,
  Card,
  Select,
  Form,
  Input,
  Button,
  Table,
  message,
  Tabs,
  Space,
  Typography,
  Divider,
  Alert,
  Tag,
  Spin,
  Row,
  Col,
  Statistic,
  Progress,
  Empty,
  Switch,
  InputNumber,
  Tooltip,
  Upload,
  List,
  Modal,
  Steps
} from 'antd';
import {
  DownloadOutlined,
  ExportOutlined,
  SendOutlined,
  FileOutlined,
  CloudUploadOutlined,
  MailOutlined,
  LinkOutlined,
  LockOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import type { TableColumnsType } from 'antd';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

interface ExportConfig {
  format: string;
  compression?: string;
  password?: string;
  include_metadata: boolean;
  custom_filename?: string;
  expiry_hours?: number;
}

interface TransmissionConfig {
  protocol: string;
  destination: string;
  credentials?: Record<string, any>;
  notification_email?: string;
}

interface ExportTask {
  id: string;
  filename: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  download_url?: string;
  file_size?: number;
  expiry_time?: string;
}

interface FileInfo {
  filename: string;
  size: number;
  rows: number;
  columns: number;
  format: string;
}

const DataOutput: React.FC = () => {
  const [activeTab, setActiveTab] = useState('files');
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'csv',
    compression: 'none',
    include_metadata: false,
    expiry_hours: 24
  });
  const [transmissionConfig, setTransmissionConfig] = useState<TransmissionConfig>({
    protocol: 'http',
    destination: ''
  });
  const [exportTasks, setExportTasks] = useState<ExportTask[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  // 获取可用文件列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        // 模拟获取文件列表
        setAvailableFiles([
          'processed_data.csv',
          'analysis_results.json',
          'cleaned_dataset.xlsx',
          'transformed_data.xml'
        ]);
      } catch (error) {
        console.error('获取文件列表失败:', error);
      }
    };
    fetchFiles();
  }, []);

  // 获取导出任务列表
  useEffect(() => {
    const fetchExportTasks = async () => {
      try {
        // 模拟导出任务数据
        const mockTasks: ExportTask[] = [
          {
            id: '1',
            filename: 'sales_data_export.csv',
            format: 'CSV',
            status: 'completed',
            progress: 100,
            created_at: '2024-01-15 10:30:00',
            download_url: '/downloads/sales_data_export.csv',
            file_size: 2048576,
            expiry_time: '2024-01-16 10:30:00'
          },
          {
            id: '2',
            filename: 'user_analysis.json',
            format: 'JSON',
            status: 'processing',
            progress: 65,
            created_at: '2024-01-15 11:15:00'
          },
          {
            id: '3',
            filename: 'report_data.xlsx',
            format: 'Excel',
            status: 'failed',
            progress: 0,
            created_at: '2024-01-15 09:45:00'
          }
        ];
        setExportTasks(mockTasks);
      } catch (error) {
        console.error('获取导出任务失败:', error);
      }
    };
    fetchExportTasks();
  }, []);

  // 选择文件
  const handleFileSelect = useCallback(async (filename: string) => {
    if (!filename) return;
    
    setLoading(true);
    try {
      // 模拟文件信息
      const mockFileInfo: FileInfo = {
        filename,
        size: 1024 * 1024 * 2.5, // 2.5MB
        rows: 10000,
        columns: 8,
        format: filename.split('.').pop()?.toUpperCase() || 'UNKNOWN'
      };
      
      setFileInfo(mockFileInfo);
      setSelectedFile(filename);
      message.success('文件信息加载成功!');
    } catch (error) {
      message.error('文件信息加载失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 预览数据
  const handlePreview = useCallback(async () => {
    if (!selectedFile) {
      message.error('请先选择文件');
      return;
    }

    setLoading(true);
    try {
      // 模拟预览数据
      const mockPreviewData = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `数据项${i + 1}`,
        value: Math.floor(Math.random() * 1000),
        category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
        date: `2024-01-${String(i + 1).padStart(2, '0')}`
      }));
      
      setPreviewData(mockPreviewData);
      setPreviewVisible(true);
    } catch (error) {
      message.error('数据预览失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  // 导出数据
  const handleExport = useCallback(async () => {
    if (!selectedFile) {
      message.error('请先选择文件');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/output/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_id: selectedFile,
          ...exportConfig
        })
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const result = await response.json();
      
      // 添加新的导出任务
      const newTask: ExportTask = {
        id: result.task_id || Date.now().toString(),
        filename: result.filename || `export_${Date.now()}.${exportConfig.format}`,
        format: exportConfig.format.toUpperCase(),
        status: 'processing',
        progress: 0,
        created_at: new Date().toLocaleString()
      };
      
      setExportTasks(prev => [newTask, ...prev]);
      setActiveTab('tasks');
      setCurrentStep(1);
      message.success('导出任务已创建!');
    } catch (error) {
      message.error('导出失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedFile, exportConfig]);

  // 传输数据
  const handleTransmission = useCallback(async () => {
    if (!selectedFile) {
      message.error('请先选择文件');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/output/transmit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_id: selectedFile,
          ...transmissionConfig
        })
      });

      if (!response.ok) {
        throw new Error('传输失败');
      }

      const result = await response.json();
      message.success('数据传输成功!');
      setCurrentStep(2);
    } catch (error) {
      message.error('数据传输失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedFile, transmissionConfig]);

  // 下载文件
  const handleDownload = useCallback((task: ExportTask) => {
    if (task.download_url) {
      const link = document.createElement('a');
      link.href = task.download_url;
      link.download = task.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('下载开始!');
    } else {
      message.error('下载链接不可用');
    }
  }, []);

  // 删除任务
  const handleDeleteTask = useCallback((taskId: string) => {
    setExportTasks(prev => prev.filter(task => task.id !== taskId));
    message.success('任务已删除');
  }, []);

  // 生成表格列配置
  const generateTableColumns = useCallback((data: any[]): TableColumnsType<any> => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      width: 120
    }));
  }, []);

  // 导出任务表格列
  const taskColumns: TableColumnsType<ExportTask> = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      ellipsis: true
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (format: string) => <Tag color="blue">{format}</Tag>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'default', icon: <ClockCircleOutlined />, text: '等待中' },
          processing: { color: 'processing', icon: <ClockCircleOutlined />, text: '处理中' },
          completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
          failed: { color: 'error', icon: <ExclamationCircleOutlined />, text: '失败' }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: ExportTask) => (
        <Progress 
          percent={progress} 
          size="small" 
          status={record.status === 'failed' ? 'exception' : undefined}
        />
      )
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (size?: number) => size ? `${(size / 1024 / 1024).toFixed(2)} MB` : '-'
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150
    },
    {
      title: '过期时间',
      dataIndex: 'expiry_time',
      key: 'expiry_time',
      width: 150,
      render: (time?: string) => time || '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, record: ExportTask) => (
        <Space>
          {record.status === 'completed' && record.download_url && (
            <Button 
              type="link" 
              size="small" 
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            >
              下载
            </Button>
          )}
          <Button 
            type="link" 
            size="small" 
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTask(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Content className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6">
            <Title level={2} className="mb-2">
              <ExportOutlined className="mr-2" />
              数据输出
            </Title>
            <Paragraph className="text-gray-600">
              导出处理后的数据，支持多种格式和传输方式
            </Paragraph>
          </div>

          {/* 进度步骤 */}
          <Card className="mb-6 shadow-sm">
            <Steps current={currentStep} className="mb-4">
              <Step title="选择文件" description="选择要导出的数据文件" />
              <Step title="配置导出" description="设置导出格式和参数" />
              <Step title="执行导出" description="生成导出文件" />
              <Step title="下载传输" description="下载文件或传输到目标位置" />
            </Steps>
          </Card>

          {/* 主要内容 */}
          <Card className="shadow-sm">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              type="card"
            >
              {/* 文件选择 */}
              <TabPane 
                tab={
                  <span>
                    <FileOutlined />
                    文件选择
                  </span>
                } 
                key="files"
              >
                <div className="space-y-6">
                  {/* 文件选择 */}
                  <Card title="选择数据文件" size="small">
                    <Form layout="vertical">
                      <Form.Item label="可用文件">
                        <Select
                          placeholder="选择要导出的数据文件"
                          value={selectedFile}
                          onChange={handleFileSelect}
                          loading={loading}
                        >
                          {availableFiles.map(file => (
                            <Option key={file} value={file}>{file}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Form>
                  </Card>

                  {/* 文件信息 */}
                  {fileInfo && (
                    <Card title="文件信息" size="small">
                      <Row gutter={16}>
                        <Col span={6}>
                          <Statistic title="文件名" value={fileInfo.filename} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="文件大小" value={(fileInfo.size / 1024 / 1024).toFixed(2)} suffix="MB" />
                        </Col>
                        <Col span={6}>
                          <Statistic title="数据行数" value={fileInfo.rows} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="数据列数" value={fileInfo.columns} />
                        </Col>
                      </Row>
                      
                      <Divider />
                      
                      <Space>
                        <Button 
                          icon={<EyeOutlined />}
                          onClick={handlePreview}
                          loading={loading}
                        >
                          预览数据
                        </Button>
                        <Button 
                          type="primary"
                          onClick={() => {
                            setActiveTab('export');
                            setCurrentStep(1);
                          }}
                        >
                          开始导出
                        </Button>
                      </Space>
                    </Card>
                  )}
                </div>
              </TabPane>

              {/* 导出配置 */}
              <TabPane 
                tab={
                  <span>
                    <ExportOutlined />
                    导出配置
                  </span>
                } 
                key="export"
                disabled={!fileInfo}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 导出设置 */}
                  <Card title="导出设置" size="small">
                    <Form layout="vertical">
                      <Form.Item label="导出格式">
                        <Select
                          value={exportConfig.format}
                          onChange={(value) => setExportConfig(prev => ({ ...prev, format: value }))}
                        >
                          <Option value="csv">CSV</Option>
                          <Option value="json">JSON</Option>
                          <Option value="xml">XML</Option>
                          <Option value="excel">Excel</Option>
                          <Option value="pdf">PDF</Option>
                        </Select>
                      </Form.Item>
                      
                      <Form.Item label="压缩方式">
                        <Select
                          value={exportConfig.compression}
                          onChange={(value) => setExportConfig(prev => ({ ...prev, compression: value }))}
                        >
                          <Option value="none">无压缩</Option>
                          <Option value="zip">ZIP</Option>
                          <Option value="gzip">GZIP</Option>
                        </Select>
                      </Form.Item>
                      
                      <Form.Item label="自定义文件名">
                        <Input
                          placeholder="留空使用默认文件名"
                          value={exportConfig.custom_filename}
                          onChange={(e) => setExportConfig(prev => ({ ...prev, custom_filename: e.target.value }))}
                        />
                      </Form.Item>
                      
                      <Form.Item label="下载链接有效期（小时）">
                        <InputNumber
                          min={1}
                          max={168}
                          value={exportConfig.expiry_hours}
                          onChange={(value) => setExportConfig(prev => ({ ...prev, expiry_hours: value || 24 }))}
                        />
                      </Form.Item>
                      
                      <Form.Item>
                        <Switch
                          checked={exportConfig.include_metadata}
                          onChange={(checked) => setExportConfig(prev => ({ ...prev, include_metadata: checked }))}
                        />
                        <span className="ml-2">包含元数据</span>
                      </Form.Item>
                      
                      <Form.Item label="密码保护（可选）">
                        <Input.Password
                          placeholder="设置文件密码"
                          value={exportConfig.password}
                          onChange={(e) => setExportConfig(prev => ({ ...prev, password: e.target.value }))}
                        />
                      </Form.Item>
                      
                      <Form.Item>
                        <Button 
                          type="primary" 
                          block
                          loading={loading}
                          onClick={handleExport}
                          icon={<ExportOutlined />}
                        >
                          开始导出
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>

                  {/* 传输配置 */}
                  <Card title="传输配置" size="small">
                    <Form layout="vertical">
                      <Form.Item label="传输协议">
                        <Select
                          value={transmissionConfig.protocol}
                          onChange={(value) => setTransmissionConfig(prev => ({ ...prev, protocol: value }))}
                        >
                          <Option value="http">
                            <LinkOutlined /> HTTP下载
                          </Option>
                          <Option value="ftp">
                            <CloudUploadOutlined /> FTP传输
                          </Option>
                          <Option value="email">
                            <MailOutlined /> 邮件发送
                          </Option>
                          <Option value="webhook">
                            <SendOutlined /> Webhook
                          </Option>
                        </Select>
                      </Form.Item>
                      
                      <Form.Item label="目标地址">
                        <Input
                          placeholder={
                            transmissionConfig.protocol === 'email' ? '接收邮箱地址' :
                            transmissionConfig.protocol === 'ftp' ? 'FTP服务器地址' :
                            transmissionConfig.protocol === 'webhook' ? 'Webhook URL' :
                            '下载链接将自动生成'
                          }
                          value={transmissionConfig.destination}
                          onChange={(e) => setTransmissionConfig(prev => ({ ...prev, destination: e.target.value }))}
                          disabled={transmissionConfig.protocol === 'http'}
                        />
                      </Form.Item>
                      
                      {transmissionConfig.protocol === 'ftp' && (
                        <>
                          <Form.Item label="FTP用户名">
                            <Input
                              placeholder="FTP用户名"
                              value={transmissionConfig.credentials?.username}
                              onChange={(e) => setTransmissionConfig(prev => ({
                                ...prev,
                                credentials: { ...prev.credentials, username: e.target.value }
                              }))}
                            />
                          </Form.Item>
                          <Form.Item label="FTP密码">
                            <Input.Password
                              placeholder="FTP密码"
                              value={transmissionConfig.credentials?.password}
                              onChange={(e) => setTransmissionConfig(prev => ({
                                ...prev,
                                credentials: { ...prev.credentials, password: e.target.value }
                              }))}
                            />
                          </Form.Item>
                        </>
                      )}
                      
                      <Form.Item label="通知邮箱（可选）">
                        <Input
                          placeholder="传输完成后发送通知"
                          value={transmissionConfig.notification_email}
                          onChange={(e) => setTransmissionConfig(prev => ({ ...prev, notification_email: e.target.value }))}
                        />
                      </Form.Item>
                      
                      <Form.Item>
                        <Button 
                          type="default" 
                          block
                          loading={loading}
                          onClick={handleTransmission}
                          icon={<SendOutlined />}
                          disabled={transmissionConfig.protocol !== 'http' && !transmissionConfig.destination}
                        >
                          开始传输
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                </div>
              </TabPane>

              {/* 导出任务 */}
              <TabPane 
                tab={
                  <span>
                    <ClockCircleOutlined />
                    导出任务
                  </span>
                } 
                key="tasks"
              >
                <Card title="导出任务列表" size="small">
                  <Table
                    columns={taskColumns}
                    dataSource={exportTasks}
                    rowKey="id"
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 个任务`
                    }}
                    scroll={{ x: 'max-content' }}
                  />
                </Card>
              </TabPane>
            </Tabs>
          </Card>

          {/* 数据预览模态框 */}
          <Modal
            title="数据预览"
            open={previewVisible}
            onCancel={() => setPreviewVisible(false)}
            footer={[
              <Button key="close" onClick={() => setPreviewVisible(false)}>
                关闭
              </Button>
            ]}
            width={800}
          >
            <Table
              columns={generateTableColumns(previewData)}
              dataSource={previewData.map((row, index) => ({ ...row, key: index }))}
              pagination={false}
              scroll={{ x: 'max-content', y: 300 }}
              size="small"
              bordered
            />
          </Modal>
        </div>
      </Content>
    </Layout>
  );
};

export default DataOutput;