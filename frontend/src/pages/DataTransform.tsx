import React, { useState, useCallback } from 'react';
import {
  Layout,
  Card,
  Upload,
  Button,
  Select,
  Form,
  Input,
  Switch,
  Table,
  message,
  Progress,
  Tabs,
  Space,
  Typography,
  Divider,
  Alert,
  Tag,
  Spin
} from 'antd';
import {
  UploadOutlined,
  FileTextOutlined,
  SettingOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { UploadProps, TableColumnsType } from 'antd';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface FileInfo {
  filename: string;
  size: number;
  format: string;
  rows?: number;
  columns?: number;
  column_names?: string[];
  column_types?: string[];
}

interface TransformConfig {
  source_format: string;
  target_format: string;
  delimiter?: string;
  encoding?: string;
  has_header?: boolean;
}

interface CleanConfig {
  remove_duplicates: boolean;
  handle_missing: string;
  fill_value?: string;
  remove_outliers: boolean;
  standardize_columns: boolean;
  date_columns?: string[];
  numeric_columns?: string[];
}

const DataTransform: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [transformConfig, setTransformConfig] = useState<TransformConfig>({
    source_format: 'csv',
    target_format: 'json',
    delimiter: ',',
    encoding: 'utf-8',
    has_header: true
  });
  const [cleanConfig, setCleanConfig] = useState<CleanConfig>({
    remove_duplicates: false,
    handle_missing: 'keep',
    remove_outliers: false,
    standardize_columns: false
  });
  const [transformResult, setTransformResult] = useState<any>(null);
  const [cleanResult, setCleanResult] = useState<any>(null);

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.csv,.json,.xml,.xlsx,.xls',
    beforeUpload: (file) => {
      const isValidType = [
        'text/csv',
        'application/json',
        'application/xml',
        'text/xml',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ].includes(file.type) || file.name.match(/\.(csv|json|xml|xlsx|xls)$/i);
      
      if (!isValidType) {
        message.error('只支持 CSV, JSON, XML, Excel 格式的文件!');
        return false;
      }
      
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB!');
        return false;
      }
      
      return false; // 阻止自动上传
    },
    onChange: (info) => {
      if (info.fileList.length > 0) {
        setUploadedFile(info.fileList[0]);
      }
    }
  };

  // 上传文件到服务器
  const handleUpload = useCallback(async () => {
    if (!uploadedFile) {
      message.error('请先选择文件');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.originFileObj);
      formData.append('project_id', 'default-project'); // 临时项目ID

      const response = await fetch('/api/transform/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('文件上传失败');
      }

      const result = await response.json();
      setFileInfo(result.file_info);
      setPreviewData(result.preview_data || []);
      setActiveTab('preview');
      message.success('文件上传成功!');
    } catch (error) {
      message.error('文件上传失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [uploadedFile]);

  // 格式转换
  const handleTransform = useCallback(async () => {
    if (!fileInfo) {
      message.error('请先上传文件');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/transform/convert/${uploadedFile.uid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transformConfig)
      });

      if (!response.ok) {
        throw new Error('格式转换失败');
      }

      const result = await response.json();
      setTransformResult(result);
      setPreviewData(result.preview_data || []);
      message.success('格式转换成功!');
    } catch (error) {
      message.error('格式转换失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fileInfo, transformConfig, uploadedFile]);

  // 数据清洗
  const handleClean = useCallback(async () => {
    if (!fileInfo) {
      message.error('请先上传文件');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/transform/clean/${uploadedFile.uid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanConfig)
      });

      if (!response.ok) {
        throw new Error('数据清洗失败');
      }

      const result = await response.json();
      setCleanResult(result);
      setPreviewData(result.preview_data || []);
      message.success('数据清洗成功!');
    } catch (error) {
      message.error('数据清洗失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [fileInfo, cleanConfig, uploadedFile]);

  // 生成表格列配置
  const generateTableColumns = useCallback((data: any[]): TableColumnsType<any> => {
    if (!data || data.length === 0) return [];
    
    const firstRow = data[0];
    return Object.keys(firstRow).map(key => ({
      title: key,
      dataIndex: key,
      key,
      ellipsis: true,
      width: 150,
      render: (value: any) => {
        if (value === null || value === undefined) {
          return <Text type="secondary">NULL</Text>;
        }
        return String(value);
      }
    }));
  }, []);

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Content className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="mb-6">
            <Title level={2} className="mb-2">
              <FileTextOutlined className="mr-2" />
              数据转换
            </Title>
            <Paragraph className="text-gray-600">
              上传数据文件，进行格式转换和数据清洗处理
            </Paragraph>
          </div>

          {/* 主要内容 */}
          <Card className="shadow-sm">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              type="card"
            >
              {/* 文件上传 */}
              <TabPane 
                tab={
                  <span>
                    <UploadOutlined />
                    文件上传
                  </span>
                } 
                key="upload"
              >
                <div className="text-center py-8">
                  <Upload.Dragger {...uploadProps} className="mb-4">
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                    </p>
                    <p className="ant-upload-text text-lg font-medium">
                      点击或拖拽文件到此区域上传
                    </p>
                    <p className="ant-upload-hint text-gray-500">
                      支持 CSV, JSON, XML, Excel 格式，文件大小不超过 50MB
                    </p>
                  </Upload.Dragger>
                  
                  {uploadedFile && (
                    <div className="mt-4">
                      <Alert
                        message="文件已选择"
                        description={`${uploadedFile.name} (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)`}
                        type="info"
                        showIcon
                        className="mb-4"
                      />
                      <Button 
                        type="primary" 
                        size="large"
                        loading={loading}
                        onClick={handleUpload}
                        icon={<UploadOutlined />}
                      >
                        上传文件
                      </Button>
                    </div>
                  )}
                </div>
              </TabPane>

              {/* 数据预览 */}
              <TabPane 
                tab={
                  <span>
                    <FileTextOutlined />
                    数据预览
                  </span>
                } 
                key="preview"
                disabled={!fileInfo}
              >
                {fileInfo && (
                  <div>
                    {/* 文件信息 */}
                    <Card size="small" className="mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Text type="secondary">文件名</Text>
                          <div className="font-medium">{fileInfo.filename}</div>
                        </div>
                        <div>
                          <Text type="secondary">格式</Text>
                          <div>
                            <Tag color="blue">{fileInfo.format.toUpperCase()}</Tag>
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">行数</Text>
                          <div className="font-medium">{fileInfo.rows?.toLocaleString()}</div>
                        </div>
                        <div>
                          <Text type="secondary">列数</Text>
                          <div className="font-medium">{fileInfo.columns}</div>
                        </div>
                      </div>
                    </Card>

                    {/* 数据表格 */}
                    <Table
                      columns={generateTableColumns(previewData)}
                      dataSource={previewData.map((row, index) => ({ ...row, key: index }))}
                      scroll={{ x: 'max-content', y: 400 }}
                      pagination={false}
                      size="small"
                      bordered
                    />
                  </div>
                )}
              </TabPane>

              {/* 格式转换 */}
              <TabPane 
                tab={
                  <span>
                    <SyncOutlined />
                    格式转换
                  </span>
                } 
                key="transform"
                disabled={!fileInfo}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 转换配置 */}
                  <Card title="转换配置" size="small">
                    <Form layout="vertical">
                      <Form.Item label="源格式">
                        <Select
                          value={transformConfig.source_format}
                          onChange={(value) => setTransformConfig(prev => ({ ...prev, source_format: value }))}
                        >
                          <Option value="csv">CSV</Option>
                          <Option value="json">JSON</Option>
                          <Option value="xml">XML</Option>
                        </Select>
                      </Form.Item>
                      
                      <Form.Item label="目标格式">
                        <Select
                          value={transformConfig.target_format}
                          onChange={(value) => setTransformConfig(prev => ({ ...prev, target_format: value }))}
                        >
                          <Option value="csv">CSV</Option>
                          <Option value="json">JSON</Option>
                          <Option value="xml">XML</Option>
                        </Select>
                      </Form.Item>
                      
                      {transformConfig.target_format === 'csv' && (
                        <Form.Item label="分隔符">
                          <Input
                            value={transformConfig.delimiter}
                            onChange={(e) => setTransformConfig(prev => ({ ...prev, delimiter: e.target.value }))}
                            placeholder=","
                          />
                        </Form.Item>
                      )}
                      
                      <Form.Item label="编码">
                        <Select
                          value={transformConfig.encoding}
                          onChange={(value) => setTransformConfig(prev => ({ ...prev, encoding: value }))}
                        >
                          <Option value="utf-8">UTF-8</Option>
                          <Option value="gbk">GBK</Option>
                          <Option value="ascii">ASCII</Option>
                        </Select>
                      </Form.Item>
                      
                      <Form.Item>
                        <Switch
                          checked={transformConfig.has_header}
                          onChange={(checked) => setTransformConfig(prev => ({ ...prev, has_header: checked }))}
                        />
                        <span className="ml-2">包含表头</span>
                      </Form.Item>
                      
                      <Form.Item>
                        <Button 
                          type="primary" 
                          block
                          loading={loading}
                          onClick={handleTransform}
                          icon={<SyncOutlined />}
                        >
                          开始转换
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>

                  {/* 转换结果 */}
                  <Card title="转换结果" size="small">
                    {transformResult ? (
                      <div>
                        <Alert
                          message="转换成功"
                          description={transformResult.message}
                          type="success"
                          showIcon
                          className="mb-4"
                        />
                        <div className="space-y-2">
                          <div>
                            <Text type="secondary">原始格式：</Text>
                            <Tag>{transformResult.file_info?.original_format?.toUpperCase()}</Tag>
                          </div>
                          <div>
                            <Text type="secondary">目标格式：</Text>
                            <Tag color="green">{transformResult.file_info?.target_format?.toUpperCase()}</Tag>
                          </div>
                          <div>
                            <Text type="secondary">数据行数：</Text>
                            <span className="font-medium">{transformResult.file_info?.rows?.toLocaleString()}</span>
                          </div>
                          <div>
                            <Text type="secondary">数据列数：</Text>
                            <span className="font-medium">{transformResult.file_info?.columns}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <SyncOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                        <div>配置转换参数后点击开始转换</div>
                      </div>
                    )}
                  </Card>
                </div>
              </TabPane>

              {/* 数据清洗 */}
              <TabPane 
                tab={
                  <span>
                    <SettingOutlined />
                    数据清洗
                  </span>
                } 
                key="clean"
                disabled={!fileInfo}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 清洗配置 */}
                  <Card title="清洗配置" size="small">
                    <Form layout="vertical">
                      <Form.Item>
                        <Switch
                          checked={cleanConfig.remove_duplicates}
                          onChange={(checked) => setCleanConfig(prev => ({ ...prev, remove_duplicates: checked }))}
                        />
                        <span className="ml-2">移除重复行</span>
                      </Form.Item>
                      
                      <Form.Item label="缺失值处理">
                        <Select
                          value={cleanConfig.handle_missing}
                          onChange={(value) => setCleanConfig(prev => ({ ...prev, handle_missing: value }))}
                        >
                          <Option value="keep">保留</Option>
                          <Option value="drop">删除</Option>
                          <Option value="fill">填充</Option>
                        </Select>
                      </Form.Item>
                      
                      {cleanConfig.handle_missing === 'fill' && (
                        <Form.Item label="填充值">
                          <Input
                            value={cleanConfig.fill_value}
                            onChange={(e) => setCleanConfig(prev => ({ ...prev, fill_value: e.target.value }))}
                            placeholder="填充值"
                          />
                        </Form.Item>
                      )}
                      
                      <Form.Item>
                        <Switch
                          checked={cleanConfig.remove_outliers}
                          onChange={(checked) => setCleanConfig(prev => ({ ...prev, remove_outliers: checked }))}
                        />
                        <span className="ml-2">移除异常值</span>
                      </Form.Item>
                      
                      <Form.Item>
                        <Switch
                          checked={cleanConfig.standardize_columns}
                          onChange={(checked) => setCleanConfig(prev => ({ ...prev, standardize_columns: checked }))}
                        />
                        <span className="ml-2">标准化列名</span>
                      </Form.Item>
                      
                      <Form.Item>
                        <Button 
                          type="primary" 
                          block
                          loading={loading}
                          onClick={handleClean}
                          icon={<SettingOutlined />}
                        >
                          开始清洗
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>

                  {/* 清洗结果 */}
                  <Card title="清洗结果" size="small">
                    {cleanResult ? (
                      <div>
                        <Alert
                          message="清洗成功"
                          description={cleanResult.message}
                          type="success"
                          showIcon
                          className="mb-4"
                        />
                        <div className="space-y-2">
                          <div>
                            <Text type="secondary">原始行数：</Text>
                            <span className="font-medium">{cleanResult.file_info?.original_rows?.toLocaleString()}</span>
                          </div>
                          <div>
                            <Text type="secondary">清洗后行数：</Text>
                            <span className="font-medium">{cleanResult.file_info?.cleaned_rows?.toLocaleString()}</span>
                          </div>
                          <div>
                            <Text type="secondary">移除行数：</Text>
                            <span className="font-medium text-red-600">{cleanResult.file_info?.removed_rows?.toLocaleString()}</span>
                          </div>
                          <div>
                            <Text type="secondary">数据列数：</Text>
                            <span className="font-medium">{cleanResult.file_info?.columns}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <SettingOutlined style={{ fontSize: 48, marginBottom: 16 }} />
                        <div>配置清洗参数后点击开始清洗</div>
                      </div>
                    )}
                  </Card>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </div>
      </Content>
    </Layout>
  );
};

export default DataTransform;