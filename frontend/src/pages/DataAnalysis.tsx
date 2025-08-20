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
  Tooltip
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  FundOutlined,
  CalculatorOutlined,
  ExperimentOutlined,
  EyeOutlined,
  DownloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
// import {
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   ScatterChart,
//   Scatter,
//   PieChart,
//   Pie,
//   Cell,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip as RechartsTooltip,
//   Legend,
//   ResponsiveContainer,
//   AreaChart,
//   Area
// } from 'recharts';
import type { TableColumnsType } from 'antd';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

interface AnalysisConfig {
  algorithm: string;
  parameters: Record<string, any>;
  columns?: string[];
  target_column?: string;
}

interface AnalysisResult {
  algorithm: string;
  results: Record<string, any>;
  summary: string;
  execution_time: number;
  data_points: number;
}

interface VisualizationConfig {
  chart_type: string;
  x_column: string;
  y_column?: string;
  group_column?: string;
  title?: string;
  width?: number;
  height?: number;
}

interface FileInfo {
  filename: string;
  columns: string[];
  rows: number;
  column_types: Record<string, string>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

const DataAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState('data');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>({
    algorithm: '',
    parameters: {},
    columns: []
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [visualizationConfig, setVisualizationConfig] = useState<VisualizationConfig>({
    chart_type: 'line',
    x_column: '',
    y_column: ''
  });
  const [chartData, setChartData] = useState<any[]>([]);

  // 获取可用算法列表
  useEffect(() => {
    const fetchAlgorithms = async () => {
      try {
        const response = await fetch('/api/analysis/algorithms');
        if (response.ok) {
          const data = await response.json();
          setAlgorithms(data.algorithms || []);
        }
      } catch (error) {
        console.error('获取算法列表失败:', error);
      }
    };
    fetchAlgorithms();
  }, []);

  // 获取可用文件列表
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        // 这里应该调用API获取已上传的文件列表
        // 暂时使用模拟数据
        setAvailableFiles(['sample_data.csv', 'sales_data.xlsx', 'user_data.json']);
      } catch (error) {
        console.error('获取文件列表失败:', error);
      }
    };
    fetchFiles();
  }, []);

  // 加载文件数据
  const handleFileSelect = useCallback(async (filename: string) => {
    if (!filename) return;
    
    setLoading(true);
    try {
      // 模拟文件信息和预览数据
      const mockFileInfo: FileInfo = {
        filename,
        columns: ['id', 'name', 'age', 'salary', 'department', 'join_date'],
        rows: 1000,
        column_types: {
          id: 'integer',
          name: 'string',
          age: 'integer',
          salary: 'float',
          department: 'string',
          join_date: 'datetime'
        }
      };
      
      const mockPreviewData = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `员工${i + 1}`,
        age: 25 + Math.floor(Math.random() * 15),
        salary: 5000 + Math.floor(Math.random() * 10000),
        department: ['技术部', '销售部', '市场部', '人事部'][Math.floor(Math.random() * 4)],
        join_date: `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`
      }));
      
      setFileInfo(mockFileInfo);
      setPreviewData(mockPreviewData);
      setSelectedFile(filename);
      message.success('文件加载成功!');
    } catch (error) {
      message.error('文件加载失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 执行数据分析
  const handleAnalysis = useCallback(async () => {
    if (!selectedFile || !analysisConfig.algorithm) {
      message.error('请选择文件和分析算法');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_id: selectedFile,
          ...analysisConfig
        })
      });

      if (!response.ok) {
        throw new Error('分析执行失败');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setActiveTab('results');
      message.success('数据分析完成!');
    } catch (error) {
      message.error('数据分析失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedFile, analysisConfig]);

  // 生成可视化
  const handleVisualization = useCallback(async () => {
    if (!selectedFile || !visualizationConfig.x_column) {
      message.error('请选择文件和X轴列');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analysis/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_id: selectedFile,
          ...visualizationConfig
        })
      });

      if (!response.ok) {
        throw new Error('可视化生成失败');
      }

      const result = await response.json();
      setChartData(result.chart_data || []);
      setActiveTab('visualization');
      message.success('可视化生成成功!');
    } catch (error) {
      message.error('可视化生成失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedFile, visualizationConfig]);

  // 生成表格列配置
  const generateTableColumns = useCallback((data: any[]): TableColumnsType<any> => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      width: 120,
      render: (value: any) => {
        if (value === null || value === undefined) {
          return <Text type="secondary">NULL</Text>;
        }
        if (typeof value === 'number') {
          return value.toLocaleString();
        }
        return String(value);
      }
    }));
  }, []);

  // 渲染图表
  const renderChart = useCallback(() => {
    if (!chartData || chartData.length === 0) {
      return (
        <Empty 
          description="暂无图表数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    const { chart_type, x_column, y_column, title } = visualizationConfig;

    // 暂时显示占位符，等待recharts安装完成
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded">
        <div className="text-center">
          <BarChartOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <div className="text-lg font-medium mb-2">{title || '数据图表'}</div>
          <div className="text-gray-500">
            图表类型: {chart_type} | X轴: {x_column} | Y轴: {y_column}
          </div>
          <div className="text-sm text-gray-400 mt-2">
            数据点数: {chartData.length}
          </div>
        </div>
      </div>
    );
  }, [chartData, visualizationConfig]);

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Content className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6">
            <Title level={2} className="mb-2">
              <BarChartOutlined className="mr-2" />
              数据分析
            </Title>
            <Paragraph className="text-gray-600">
              选择数据文件，执行统计分析算法，生成可视化图表
            </Paragraph>
          </div>

          {/* 主要内容 */}
          <Card className="shadow-sm">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              type="card"
            >
              {/* 数据选择 */}
              <TabPane 
                tab={
                  <span>
                    <EyeOutlined />
                    数据选择
                  </span>
                } 
                key="data"
              >
                <div className="space-y-6">
                  {/* 文件选择 */}
                  <Card title="选择数据文件" size="small">
                    <Form layout="vertical">
                      <Form.Item label="数据文件">
                        <Select
                          placeholder="选择要分析的数据文件"
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
                          <Statistic title="数据行数" value={fileInfo.rows} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="数据列数" value={fileInfo.columns.length} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="数据类型" value={Object.keys(fileInfo.column_types).length} suffix="种" />
                        </Col>
                      </Row>
                      
                      <Divider />
                      
                      <div>
                        <Text strong>列信息：</Text>
                        <div className="mt-2 space-y-1">
                          {fileInfo.columns.map(col => (
                            <div key={col} className="flex justify-between items-center">
                              <span>{col}</span>
                              <Tag color={fileInfo.column_types[col] === 'string' ? 'blue' : 
                                         fileInfo.column_types[col] === 'integer' ? 'green' : 
                                         fileInfo.column_types[col] === 'float' ? 'orange' : 'purple'}>
                                {fileInfo.column_types[col]}
                              </Tag>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* 数据预览 */}
                  {previewData.length > 0 && (
                    <Card title="数据预览" size="small">
                      <Table
                        columns={generateTableColumns(previewData)}
                        dataSource={previewData.map((row, index) => ({ ...row, key: index }))}
                        scroll={{ x: 'max-content', y: 300 }}
                        pagination={false}
                        size="small"
                        bordered
                      />
                    </Card>
                  )}
                </div>
              </TabPane>

              {/* 分析配置 */}
              <TabPane 
                tab={
                  <span>
                    <CalculatorOutlined />
                    分析配置
                  </span>
                } 
                key="analysis"
                disabled={!fileInfo}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 算法配置 */}
                  <Card title="算法配置" size="small">
                    <Form layout="vertical">
                      <Form.Item label="分析算法">
                        <Select
                          placeholder="选择分析算法"
                          value={analysisConfig.algorithm}
                          onChange={(value) => setAnalysisConfig(prev => ({ ...prev, algorithm: value }))}
                        >
                          {algorithms.map(alg => (
                            <Option key={alg.name} value={alg.name}>
                              <div>
                                <div>{alg.display_name}</div>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {alg.description}
                                </Text>
                              </div>
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      
                      {fileInfo && (
                        <Form.Item label="分析列">
                          <Select
                            mode="multiple"
                            placeholder="选择要分析的列"
                            value={analysisConfig.columns}
                            onChange={(value) => setAnalysisConfig(prev => ({ ...prev, columns: value }))}
                          >
                            {fileInfo.columns.map(col => (
                              <Option key={col} value={col}>{col}</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      )}
                      
                      {analysisConfig.algorithm && (
                        <Form.Item label="算法参数">
                          <TextArea
                            placeholder='输入JSON格式的参数，例如: {"n_clusters": 3}'
                            value={JSON.stringify(analysisConfig.parameters, null, 2)}
                            onChange={(e) => {
                              try {
                                const params = JSON.parse(e.target.value || '{}');
                                setAnalysisConfig(prev => ({ ...prev, parameters: params }));
                              } catch (error) {
                                // 忽略JSON解析错误
                              }
                            }}
                            rows={4}
                          />
                        </Form.Item>
                      )}
                      
                      <Form.Item>
                        <Button 
                          type="primary" 
                          block
                          loading={loading}
                          onClick={handleAnalysis}
                          icon={<ExperimentOutlined />}
                          disabled={!analysisConfig.algorithm}
                        >
                          开始分析
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>

                  {/* 算法说明 */}
                  <Card title="算法说明" size="small">
                    {analysisConfig.algorithm ? (
                      <div>
                        {algorithms.find(alg => alg.name === analysisConfig.algorithm) && (
                          <div>
                            <Title level={5}>
                              {algorithms.find(alg => alg.name === analysisConfig.algorithm)?.display_name}
                            </Title>
                            <Paragraph>
                              {algorithms.find(alg => alg.name === analysisConfig.algorithm)?.description}
                            </Paragraph>
                            <div>
                              <Text strong>适用场景：</Text>
                              <div className="mt-1">
                                {algorithms.find(alg => alg.name === analysisConfig.algorithm)?.use_cases?.map((useCase: string, index: number) => (
                                  <Tag key={index} className="mb-1">{useCase}</Tag>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CalculatorOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                        <div>选择算法后查看详细说明</div>
                      </div>
                    )}
                  </Card>
                </div>
              </TabPane>

              {/* 分析结果 */}
              <TabPane 
                tab={
                  <span>
                    <FundOutlined />
                    分析结果
                  </span>
                } 
                key="results"
                disabled={!analysisResult}
              >
                {analysisResult && (
                  <div className="space-y-6">
                    {/* 结果概览 */}
                    <Card title="分析概览" size="small">
                      <Row gutter={16}>
                        <Col span={6}>
                          <Statistic title="算法" value={analysisResult.algorithm} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="执行时间" value={analysisResult.execution_time} suffix="秒" precision={3} />
                        </Col>
                        <Col span={6}>
                          <Statistic title="数据点数" value={analysisResult.data_points} />
                        </Col>
                        <Col span={6}>
                          <Button type="primary" icon={<DownloadOutlined />}>
                            导出结果
                          </Button>
                        </Col>
                      </Row>
                      
                      <Divider />
                      
                      <Alert
                        message="分析摘要"
                        description={analysisResult.summary}
                        type="info"
                        showIcon
                      />
                    </Card>

                    {/* 详细结果 */}
                    <Card title="详细结果" size="small">
                      <div className="space-y-4">
                        {Object.entries(analysisResult.results).map(([key, value]) => (
                          <div key={key}>
                            <Text strong>{key}:</Text>
                            <div className="mt-1 p-3 bg-gray-50 rounded">
                              <pre className="text-sm">{JSON.stringify(value, null, 2)}</pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}
              </TabPane>

              {/* 数据可视化 */}
              <TabPane 
                tab={
                  <span>
                    <LineChartOutlined />
                    数据可视化
                  </span>
                } 
                key="visualization"
                disabled={!fileInfo}
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 可视化配置 */}
                  <Card title="图表配置" size="small">
                    <Form layout="vertical">
                      <Form.Item label="图表类型">
                        <Select
                          value={visualizationConfig.chart_type}
                          onChange={(value) => setVisualizationConfig(prev => ({ ...prev, chart_type: value }))}
                        >
                          <Option value="line">
                            <LineChartOutlined /> 折线图
                          </Option>
                          <Option value="bar">
                            <BarChartOutlined /> 柱状图
                          </Option>
                          <Option value="scatter">
                            <BarChartOutlined /> 散点图
                          </Option>
                          <Option value="area">
                            <AreaChartOutlined /> 面积图
                          </Option>
                        </Select>
                      </Form.Item>
                      
                      {fileInfo && (
                        <>
                          <Form.Item label="X轴列">
                            <Select
                              placeholder="选择X轴数据列"
                              value={visualizationConfig.x_column}
                              onChange={(value) => setVisualizationConfig(prev => ({ ...prev, x_column: value }))}
                            >
                              {fileInfo.columns.map(col => (
                                <Option key={col} value={col}>{col}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                          
                          <Form.Item label="Y轴列">
                            <Select
                              placeholder="选择Y轴数据列"
                              value={visualizationConfig.y_column}
                              onChange={(value) => setVisualizationConfig(prev => ({ ...prev, y_column: value }))}
                            >
                              {fileInfo.columns.map(col => (
                                <Option key={col} value={col}>{col}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                          
                          <Form.Item label="分组列（可选）">
                            <Select
                              placeholder="选择分组列"
                              value={visualizationConfig.group_column}
                              onChange={(value) => setVisualizationConfig(prev => ({ ...prev, group_column: value }))}
                              allowClear
                            >
                              {fileInfo.columns.map(col => (
                                <Option key={col} value={col}>{col}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </>
                      )}
                      
                      <Form.Item label="图表标题">
                        <Input
                          placeholder="输入图表标题"
                          value={visualizationConfig.title}
                          onChange={(e) => setVisualizationConfig(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </Form.Item>
                      
                      <Form.Item>
                        <Button 
                          type="primary" 
                          block
                          loading={loading}
                          onClick={handleVisualization}
                          icon={<LineChartOutlined />}
                          disabled={!visualizationConfig.x_column}
                        >
                          生成图表
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>

                  {/* 图表展示 */}
                  <div className="lg:col-span-2">
                    <Card title={visualizationConfig.title || '数据图表'} size="small">
                      <Spin spinning={loading}>
                        {renderChart()}
                      </Spin>
                    </Card>
                  </div>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default DataAnalysis;