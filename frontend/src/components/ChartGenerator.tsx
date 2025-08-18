import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, Space, Typography, Row, Col, Spin, message } from 'antd';
import { BarChartOutlined, LineChartOutlined, DotChartOutlined, HeatMapOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';

const { Text, Title } = Typography;
const { Option } = Select;

interface ChartGeneratorProps {
  fileId?: string;
  onChartGenerated?: (chartConfig: any) => void;
}

interface ColumnInfo {
  name: string;
  type: string;
  null_count: number;
  unique_count: number;
}

interface ChartConfig {
  chart_type: string;
  x_axis: string;
  y_axis?: string;
  config?: any;
}

const ChartGenerator: React.FC<ChartGeneratorProps> = ({ fileId, onChartGenerated }) => {
  const [form] = Form.useForm();
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [chartOption, setChartOption] = useState<any>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);

  // 图表类型选项
  const chartTypes = [
    { value: 'bar', label: '柱状图', icon: <BarChartOutlined /> },
    { value: 'line', label: '折线图', icon: <LineChartOutlined /> },
    { value: 'scatter', label: '散点图', icon: <DotChartOutlined /> },
    { value: 'heatmap', label: '热力图', icon: <HeatMapOutlined /> }
  ];

  useEffect(() => {
    if (fileId) {
      fetchFileColumns();
    }
  }, [fileId]);

  // 获取文件列信息
  const fetchFileColumns = async () => {
    if (!fileId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/files/${fileId}/preview`);
      if (response.ok) {
        const data = await response.json();
        setColumns(data.columns || []);
      } else {
        message.error('获取文件列信息失败');
      }
    } catch (error) {
      message.error('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 生成图表
  const handleGenerateChart = async (values: any) => {
    if (!fileId) {
      message.error('请先选择数据文件');
      return;
    }

    try {
      setGenerating(true);
      
      const requestData: ChartConfig = {
        chart_type: values.chart_type,
        x_axis: values.x_axis,
        y_axis: values.y_axis,
        config: {
          title: values.title || '',
          theme: 'dark'
        }
      };

      const response = await fetch('/api/charts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_id: fileId,
          ...requestData
        })
      });

      if (response.ok) {
        const result = await response.json();
        setChartOption(result.chart_config);
        setChartConfig(requestData);
        onChartGenerated?.(result);
        message.success('图表生成成功');
      } else {
        const errorData = await response.json();
        message.error(errorData.detail || '图表生成失败');
      }
    } catch (error) {
      message.error('网络错误，请稍后重试');
    } finally {
      setGenerating(false);
    }
  };

  // 获取数值列
  const getNumericColumns = () => {
    return columns.filter(col => 
      ['int64', 'int32', 'float64', 'float32', 'integer', 'float'].includes(col.type.toLowerCase())
    );
  };

  // 获取分类列
  const getCategoricalColumns = () => {
    return columns.filter(col => 
      ['string', 'object', 'category'].includes(col.type.toLowerCase()) || 
      col.unique_count < 50
    );
  };

  // 获取时间列
  const getTimeColumns = () => {
    return columns.filter(col => 
      ['datetime', 'date', 'timestamp'].includes(col.type.toLowerCase())
    );
  };

  // 根据图表类型获取可用的X轴列
  const getAvailableXColumns = (chartType: string) => {
    switch (chartType) {
      case 'bar':
      case 'line':
        return [...getCategoricalColumns(), ...getTimeColumns()];
      case 'scatter':
      case 'heatmap':
        return getNumericColumns();
      default:
        return columns;
    }
  };

  // 根据图表类型获取可用的Y轴列
  const getAvailableYColumns = (chartType: string) => {
    switch (chartType) {
      case 'bar':
      case 'line':
      case 'scatter':
        return getNumericColumns();
      case 'heatmap':
        return getNumericColumns();
      default:
        return columns;
    }
  };

  // 监听图表类型变化
  const handleChartTypeChange = (chartType: string) => {
    form.setFieldsValue({ x_axis: undefined, y_axis: undefined });
  };

  if (!fileId) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <div className="text-center py-8">
          <Text className="text-gray-400">请先选择数据文件</Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 图表配置 */}
      <Card 
        title={
          <div className="flex items-center space-x-2">
            <BarChartOutlined className="text-blue-400" />
            <span className="text-white">图表生成器</span>
          </div>
        }
        className="bg-gray-800 border-gray-700"
      >
        <Spin spinning={loading}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleGenerateChart}
            className="space-y-4"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="chart_type"
                  label={<Text className="text-gray-300">图表类型</Text>}
                  rules={[{ required: true, message: '请选择图表类型' }]}
                >
                  <Select
                    placeholder="选择图表类型"
                    onChange={handleChartTypeChange}
                    className="dark-select"
                  >
                    {chartTypes.map(type => (
                      <Option key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          {type.icon}
                          <span>{type.label}</span>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="title"
                  label={<Text className="text-gray-300">图表标题</Text>}
                >
                  <Select
                    placeholder="输入图表标题（可选）"
                    className="dark-select"
                    mode="tags"
                    maxTagCount={1}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="x_axis"
                  label={<Text className="text-gray-300">X轴字段</Text>}
                  rules={[{ required: true, message: '请选择X轴字段' }]}
                >
                  <Select
                    placeholder="选择X轴字段"
                    className="dark-select"
                    disabled={!form.getFieldValue('chart_type')}
                  >
                    {getAvailableXColumns(form.getFieldValue('chart_type')).map(col => (
                      <Option key={col.name} value={col.name}>
                        <div className="flex items-center justify-between">
                          <span>{col.name}</span>
                          <Text className="text-gray-400 text-xs">{col.type}</Text>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="y_axis"
                  label={<Text className="text-gray-300">Y轴字段</Text>}
                  rules={[{ required: true, message: '请选择Y轴字段' }]}
                >
                  <Select
                    placeholder="选择Y轴字段"
                    className="dark-select"
                    disabled={!form.getFieldValue('chart_type')}
                  >
                    {getAvailableYColumns(form.getFieldValue('chart_type')).map(col => (
                      <Option key={col.name} value={col.name}>
                        <div className="flex items-center justify-between">
                          <span>{col.name}</span>
                          <Text className="text-gray-400 text-xs">{col.type}</Text>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={generating}
                  icon={<BarChartOutlined />}
                >
                  生成图表
                </Button>
                <Button 
                  onClick={() => {
                    form.resetFields();
                    setChartOption(null);
                    setChartConfig(null);
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </Card>

      {/* 图表预览 */}
      {chartOption && (
        <Card 
          title={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChartOutlined className="text-blue-400" />
                <span className="text-white">图表预览</span>
                {chartConfig && (
                  <Text className="text-gray-400 text-sm">
                    {chartTypes.find(t => t.value === chartConfig.chart_type)?.label}
                  </Text>
                )}
              </div>
              <Button 
                type="primary" 
                size="small"
                onClick={() => {
                  // 这里可以添加保存图表的逻辑
                  message.success('图表已保存到工作流');
                }}
              >
                保存图表
              </Button>
            </div>
          }
          className="bg-gray-800 border-gray-700"
        >
          <div className="bg-gray-900 p-4 rounded">
            <ReactECharts
              option={chartOption}
              style={{ height: '400px', width: '100%' }}
              theme="dark"
            />
          </div>
          
          {/* 图表配置信息 */}
          {chartConfig && (
            <div className="mt-4 p-3 bg-gray-700 rounded">
              <Text className="text-gray-300 text-sm">
                <strong>配置:</strong> X轴: {chartConfig.x_axis}, Y轴: {chartConfig.y_axis}
              </Text>
            </div>
          )}
        </Card>
      )}

      {/* 使用提示 */}
      <Card size="small" className="bg-blue-900 border-blue-700">
        <div className="space-y-2">
          <Text className="text-blue-200 text-xs font-medium">
            💡 使用提示
          </Text>
          <ul className="text-blue-300 text-xs space-y-1">
            <li>• 柱状图和折线图适合展示分类数据的趋势</li>
            <li>• 散点图适合展示两个数值变量的关系</li>
            <li>• 热力图适合展示数据的分布密度</li>
            <li>• 生成的图表可以保存到工作流中重复使用</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default ChartGenerator;