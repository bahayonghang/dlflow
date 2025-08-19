import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Typography, Tabs, Statistic, Row, Col, Tag, Alert, Spin, Empty } from 'antd';
import {
  FileTextOutlined,
  BarChartOutlined,
  TableOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface DataPreviewProps {
  fileId: string;
  height?: number;
  showTabs?: boolean;
}

interface PreviewData {
  columns: string[];
  dtypes: Record<string, string>;
  shape: [number, number];
  head: Record<string, any>[];
  summary: {
    total_rows: number;
    total_columns: number;
    null_counts: Record<string, number>;
    memory_usage: number;
  };
}

interface ValidationResult {
  is_valid: boolean;
  severity: string;
  code: string;
  message: string;
  field?: string;
  expected?: string;
  actual?: string;
  suggestions?: string[];
}

interface ValidationReport {
  file_path: string;
  file_size: number;
  file_type: string;
  encoding?: string;
  is_valid: boolean;
  validation_results: ValidationResult[];
  metadata: Record<string, any>;
}

const DataPreview: React.FC<DataPreviewProps> = ({ 
  fileId, 
  height = 500, 
  showTabs = true 
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [activeTab, setActiveTab] = useState<string>('data');

  // 获取预览数据
  useEffect(() => {
    const fetchPreview = async () => {
      if (!fileId) return;
      
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch(`/api/files/${fileId}/preview`);
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || '获取预览数据失败');
        }
        
        if (result.success) {
          setPreviewData(result.data.preview);
          setValidationReport(result.data.validation);
        } else {
          throw new Error(result.error || '获取预览数据失败');
        }
      } catch (err) {
        console.error('获取预览数据失败:', err);
        setError(err instanceof Error ? err.message : '获取预览数据失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPreview();
  }, [fileId]);

  // 生成表格列配置
  const tableColumns: ColumnsType<Record<string, any>> = useMemo(() => {
    if (!previewData?.columns) return [];
    
    return previewData.columns.map((column, index) => ({
      title: (
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium">{column}</span>
          <Tag 
            color={getDataTypeColor(previewData.dtypes[column])}
            className="text-xs"
          >
            {previewData.dtypes[column]}
          </Tag>
        </div>
      ),
      dataIndex: column,
      key: column,
      width: 150,
      ellipsis: true,
      render: (value: any) => (
        <span className="text-gray-300">
          {value === null || value === undefined ? (
            <span className="text-gray-500 italic">null</span>
          ) : (
            String(value)
          )}
        </span>
      )
    }));
  }, [previewData]);

  // 获取数据类型颜色
  const getDataTypeColor = (dtype: string): string => {
    if (dtype.includes('int') || dtype.includes('float')) return 'blue';
    if (dtype.includes('object') || dtype.includes('string')) return 'green';
    if (dtype.includes('datetime') || dtype.includes('timestamp')) return 'orange';
    if (dtype.includes('bool')) return 'purple';
    return 'default';
  };

  // 获取验证结果颜色
  const getValidationColor = (severity: string): string => {
    switch (severity) {
      case 'error': return 'red';
      case 'warning': return 'orange';
      case 'info': return 'blue';
      default: return 'default';
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 渲染数据表格
  const renderDataTable = () => {
    if (!previewData?.head) {
      return <Empty description="暂无数据" />;
    }

    return (
      <div className="overflow-auto" style={{ height: height - 100 }}>
        <Table
          columns={tableColumns}
          dataSource={previewData.head.map((row, index) => ({ ...row, key: index }))}
          pagination={false}
          size="small"
          className="dark-table"
          scroll={{ x: 'max-content' }}
        />
      </div>
    );
  };

  // 渲染统计信息
  const renderStatistics = () => {
    if (!previewData?.summary) {
      return <Empty description="暂无统计信息" />;
    }

    const { summary } = previewData;
    
    return (
      <div className="space-y-6">
        {/* 基本统计 */}
        <Card className="bg-gray-800 border-gray-700">
          <Title level={5} className="text-white mb-4">基本信息</Title>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title={<span className="text-gray-400">总行数</span>}
                value={summary.total_rows}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={<span className="text-gray-400">总列数</span>}
                value={summary.total_columns}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={<span className="text-gray-400">内存使用</span>}
                value={formatFileSize(summary.memory_usage)}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title={<span className="text-gray-400">数据形状</span>}
                value={`${previewData.shape[0]} × ${previewData.shape[1]}`}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
          </Row>
        </Card>

        {/* 列信息 */}
        <Card className="bg-gray-800 border-gray-700">
          <Title level={5} className="text-white mb-4">列信息</Title>
          <div className="space-y-3 max-h-64 overflow-auto">
            {previewData.columns.map((column, index) => {
              const nullCount = summary.null_counts[column] || 0;
              const nullPercentage = ((nullCount / summary.total_rows) * 100).toFixed(1);
              
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-medium">{column}</span>
                    <Tag color={getDataTypeColor(previewData.dtypes[column])}>
                      {previewData.dtypes[column]}
                    </Tag>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-400 text-sm">
                      空值: {nullCount} ({nullPercentage}%)
                    </span>
                    {parseFloat(nullPercentage) > 50 && (
                      <Tag color="red">高空值率</Tag>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  // 渲染验证结果
  const renderValidation = () => {
    if (!validationReport) {
      return <Empty description="暂无验证信息" />;
    }

    const { validation_results, metadata } = validationReport;
    
    return (
      <div className="space-y-4">
        {/* 验证概览 */}
        <Card className="bg-gray-800 border-gray-700">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              {validationReport.is_valid ? (
                <Tag color="green" icon={<InfoCircleOutlined />}>验证通过</Tag>
              ) : (
                <Tag color="red" icon={<ExclamationCircleOutlined />}>验证失败</Tag>
              )}
            </div>
            <Text className="text-gray-400">
              文件类型: {validationReport.file_type.toUpperCase()}
            </Text>
            {validationReport.encoding && (
              <Text className="text-gray-400">
                编码: {validationReport.encoding}
              </Text>
            )}
          </div>
          
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Statistic
                title={<span className="text-gray-400">文件大小</span>}
                value={formatFileSize(validationReport.file_size)}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={<span className="text-gray-400">错误数量</span>}
                value={validation_results.filter(r => r.severity === 'error').length}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title={<span className="text-gray-400">警告数量</span>}
                value={validation_results.filter(r => r.severity === 'warning').length}
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        </Card>

        {/* 验证详情 */}
        {validation_results.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <Title level={5} className="text-white mb-4">验证详情</Title>
            <div className="space-y-3 max-h-64 overflow-auto">
              {validation_results.map((result, index) => (
                <Alert
                  key={index}
                  message={
                    <div className="flex items-center space-x-2">
                      <Tag color={getValidationColor(result.severity)}>
                        {result.severity.toUpperCase()}
                      </Tag>
                      <span className="text-white">{result.message}</span>
                    </div>
                  }
                  description={
                    <div className="space-y-1">
                      {result.field && (
                        <div className="text-gray-400 text-sm">
                          字段: {result.field}
                        </div>
                      )}
                      {result.expected && (
                        <div className="text-gray-400 text-sm">
                          期望: {result.expected}
                        </div>
                      )}
                      {result.actual && (
                        <div className="text-gray-400 text-sm">
                          实际: {result.actual}
                        </div>
                      )}
                      {result.suggestions && result.suggestions.length > 0 && (
                        <div className="text-gray-400 text-sm">
                          建议: {result.suggestions.join('; ')}
                        </div>
                      )}
                    </div>
                  }
                  type={result.severity === 'error' ? 'error' : result.severity === 'warning' ? 'warning' : 'info'}
                  className={`${
                    result.severity === 'error' 
                      ? 'bg-red-900 border-red-600' 
                      : result.severity === 'warning'
                      ? 'bg-orange-900 border-orange-600'
                      : 'bg-blue-900 border-blue-600'
                  }`}
                />
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Spin size="large" />
        <Text className="ml-3 text-gray-400">正在加载预览数据...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Alert
          message="加载失败"
          description={error}
          type="error"
          showIcon
          className="bg-red-900 border-red-600"
        />
      </div>
    );
  }

  if (!showTabs) {
    return (
      <div style={{ height }}>
        {renderDataTable()}
      </div>
    );
  }

  return (
    <div style={{ height }}>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className="dark-tabs"
      >
        <TabPane 
          tab={
            <span className="flex items-center space-x-2">
              <TableOutlined />
              <span>数据预览</span>
            </span>
          } 
          key="data"
        >
          {renderDataTable()}
        </TabPane>
        
        <TabPane 
          tab={
            <span className="flex items-center space-x-2">
              <BarChartOutlined />
              <span>统计信息</span>
            </span>
          } 
          key="stats"
        >
          {renderStatistics()}
        </TabPane>
        
        <TabPane 
          tab={
            <span className="flex items-center space-x-2">
              <FileTextOutlined />
              <span>验证结果</span>
            </span>
          } 
          key="validation"
        >
          {renderValidation()}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default DataPreview;