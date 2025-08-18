import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Statistic, Row, Col, Tag, Spin, Empty, Tabs, Space } from 'antd';
import {
  TableOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface ColumnInfo {
  name: string;
  type: string;
  null_count: number;
  unique_count: number;
  sample_values?: any[];
}

interface DataPreviewProps {
  fileId: string;
  height?: number;
}

interface PreviewData {
  columns: ColumnInfo[];
  preview_data: Record<string, any>[];
  total_rows: number;
  file_info: {
    filename: string;
    size: number;
    file_type: string;
  };
  statistics?: Record<string, any>;
}

const DataPreview: React.FC<DataPreviewProps> = ({ fileId, height = 400 }) => {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (fileId) {
      fetchPreviewData();
    }
  }, [fileId]);

  const fetchPreviewData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/files/${fileId}/preview`);
      if (response.ok) {
        const previewData = await response.json();
        setData(previewData);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '获取数据预览失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 生成表格列配置
  const generateTableColumns = (): ColumnsType<any> => {
    if (!data?.columns) return [];

    return data.columns.map((col) => ({
      title: (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Text className="font-medium text-white">{col.name}</Text>
            <Tag 
              color={getTypeColor(col.type)}
              className="text-xs"
            >
              {col.type}
            </Tag>
          </div>
          <div className="text-xs text-gray-400">
            空值: {col.null_count} | 唯一值: {col.unique_count}
          </div>
        </div>
      ),
      dataIndex: col.name,
      key: col.name,
      width: 150,
      ellipsis: true,
      render: (value: any) => (
        <Text className="text-gray-300">
          {value === null || value === undefined ? (
            <span className="text-gray-500 italic">null</span>
          ) : (
            String(value)
          )}
        </Text>
      ),
    }));
  };

  // 获取数据类型颜色
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'int64':
      case 'int32':
      case 'integer':
        return 'blue';
      case 'float64':
      case 'float32':
      case 'float':
        return 'cyan';
      case 'string':
      case 'object':
        return 'green';
      case 'datetime':
      case 'date':
        return 'purple';
      case 'boolean':
        return 'orange';
      default:
        return 'default';
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <div className="flex items-center justify-center" style={{ height }}>
          <Spin size="large" />
          <Text className="ml-3 text-gray-400">正在加载数据预览...</Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <div className="flex items-center justify-center" style={{ height }}>
          <Empty
            description={
              <Text className="text-gray-400">{error}</Text>
            }
          />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <div className="flex items-center justify-center" style={{ height }}>
          <Empty
            description={
              <Text className="text-gray-400">请选择文件查看预览</Text>
            }
          />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div className="flex items-center space-x-2">
          <FileTextOutlined className="text-blue-400" />
          <span className="text-white">{data.file_info.filename}</span>
          <Tag color="blue">{data.file_info.file_type.toUpperCase()}</Tag>
        </div>
      }
      className="bg-gray-800 border-gray-700"
    >
      <Tabs defaultActiveKey="preview" className="dark-tabs">
        {/* 数据预览 */}
        <TabPane 
          tab={
            <span className="flex items-center space-x-2">
              <TableOutlined />
              <span>数据预览</span>
            </span>
          } 
          key="preview"
        >
          <div className="space-y-4">
            {/* 基本信息 */}
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title={<Text className="text-gray-400">总行数</Text>}
                  value={data.total_rows}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={<Text className="text-gray-400">列数</Text>}
                  value={data.columns.length}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={<Text className="text-gray-400">文件大小</Text>}
                  value={formatFileSize(data.file_info.size)}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title={<Text className="text-gray-400">预览行数</Text>}
                  value={data.preview_data.length}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Col>
            </Row>

            {/* 数据表格 */}
            <Table
              columns={generateTableColumns()}
              dataSource={data.preview_data.map((row, index) => ({
                ...row,
                key: index
              }))}
              pagination={false}
              scroll={{ x: 'max-content', y: height - 200 }}
              size="small"
              className="dark-table"
              bordered
            />
          </div>
        </TabPane>

        {/* 列信息 */}
        <TabPane 
          tab={
            <span className="flex items-center space-x-2">
              <InfoCircleOutlined />
              <span>列信息</span>
            </span>
          } 
          key="columns"
        >
          <div className="space-y-3">
            {data.columns.map((col, index) => (
              <Card 
                key={col.name}
                size="small"
                className="bg-gray-700 border-gray-600"
              >
                <Row gutter={16} align="middle">
                  <Col span={6}>
                    <div className="space-y-1">
                      <Text className="text-white font-medium">{col.name}</Text>
                      <div>
                        <Tag color={getTypeColor(col.type)}>
                          {col.type}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title={<Text className="text-gray-400 text-xs">空值数量</Text>}
                      value={col.null_count}
                      valueStyle={{ color: '#ff4d4f', fontSize: '14px' }}
                    />
                  </Col>
                  <Col span={4}>
                    <Statistic
                      title={<Text className="text-gray-400 text-xs">唯一值</Text>}
                      value={col.unique_count}
                      valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                    />
                  </Col>
                  <Col span={10}>
                    {col.sample_values && col.sample_values.length > 0 && (
                      <div className="space-y-1">
                        <Text className="text-gray-400 text-xs">示例值:</Text>
                        <div className="flex flex-wrap gap-1">
                          {col.sample_values.slice(0, 5).map((value, idx) => (
                            <Tag key={idx} className="text-xs">
                              {String(value)}
                            </Tag>
                          ))}
                          {col.sample_values.length > 5 && (
                            <Text className="text-gray-500 text-xs">...</Text>
                          )}
                        </div>
                      </div>
                    )}
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        </TabPane>

        {/* 统计信息 */}
        {data.statistics && (
          <TabPane 
            tab={
              <span className="flex items-center space-x-2">
                <BarChartOutlined />
                <span>统计信息</span>
              </span>
            } 
            key="statistics"
          >
            <div className="space-y-4">
              {Object.entries(data.statistics).map(([colName, stats]: [string, any]) => (
                <Card 
                  key={colName}
                  title={<Text className="text-white">{colName}</Text>}
                  size="small"
                  className="bg-gray-700 border-gray-600"
                >
                  <Row gutter={16}>
                    {Object.entries(stats).map(([statName, value]: [string, any]) => (
                      <Col span={6} key={statName}>
                        <Statistic
                          title={<Text className="text-gray-400 text-xs capitalize">{statName}</Text>}
                          value={typeof value === 'number' ? value.toFixed(2) : String(value)}
                          valueStyle={{ color: '#1890ff', fontSize: '14px' }}
                        />
                      </Col>
                    ))}
                  </Row>
                </Card>
              ))}
            </div>
          </TabPane>
        )}
      </Tabs>
    </Card>
  );
};

export default DataPreview;