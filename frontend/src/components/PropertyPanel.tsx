import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Space,
  Divider,
  Typography,
  Card,
  Tag,
  Alert,
  Collapse,
  Upload,
  message
} from 'antd';
import {
  SettingOutlined,
  InfoCircleOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  UploadOutlined,
  PlusOutlined
} from '@ant-design/icons';
import type { Node } from 'reactflow';
import FileUploadArea from './FileUploadArea';
import { useFileUpload } from '../hooks/useFileUpload';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface PropertyPanelProps {
  node: Node;
  onUpdate: (updates: any) => void;
  uploadedFiles: any[];
  onFileUploaded?: (fileInfo: any) => void;
}

// 节点类型配置
const nodeTypeConfigs = {
  'data_input': {
    name: '数据输入',
    description: '从上传的文件中读取数据',
    icon: <DatabaseOutlined />,
    color: '#52c41a',
    parameters: {
      file_id: {
        label: '选择文件',
        type: 'file_select',
        default: null
      }
    }
  },
  'data-input': {
    name: '数据输入',
    description: '从文件或数据库读取数据',
    icon: <DatabaseOutlined />,
    color: '#52c41a',
    parameters: {
      source_type: {
        label: '数据源类型',
        type: 'select',
        options: ['file', 'database', 'api'],
        default: 'file'
      },
      file_id: {
        label: '选择文件',
        type: 'file_select',
        default: null
      }
    }
  },
  'time_parser': {
    name: '时间数据解析',
    description: '自动识别和解析时间列（DateTime或tagTime格式）',
    icon: <SettingOutlined />,
    color: '#1890ff',
    parameters: {
      auto_detect: {
        label: '自动检测时间列',
        type: 'boolean',
        default: true
      },
      time_column: {
        label: '时间列',
        type: 'select',
        options: [], // 动态列表
        default: null
      }
    }
  },
  'variable_analysis': {
    name: '多变量分析',
    description: '分析所有变量的类型、分布和相关性',
    icon: <SettingOutlined />,
    color: '#722ed1',
    parameters: {
      include_correlations: {
        label: '计算相关性',
        type: 'boolean',
        default: true
      },
      exclude_time_column: {
        label: '排除时间列',
        type: 'boolean',
        default: true
      }
    }
  },
  'data_statistics': {
    name: '统计分析',
    description: '生成数据的描述性统计信息',
    icon: <SettingOutlined />,
    color: '#fa8c16',
    parameters: {
      include_numeric_only: {
        label: '仅数值列',
        type: 'boolean',
        default: false
      },
      percentiles: {
        label: '百分位数',
        type: 'select',
        options: ['0.25', '0.5', '0.75', '0.9', '0.95'],
        default: ['0.25', '0.5', '0.75']
      }
    }
  },
  'data_visualization': {
    name: '数据可视化',
    description: '生成数据图表',
    icon: <SettingOutlined />,
    color: '#eb2f96',
    parameters: {
      chart_type: {
        label: '图表类型',
        type: 'select',
        options: ['bar', 'line', 'scatter', 'heatmap'],
        default: 'bar'
      },
      x_field: {
        label: 'X轴字段',
        type: 'select',
        options: [], // 动态列表
        default: null
      },
      y_field: {
        label: 'Y轴字段',
        type: 'select',
        options: [], // 动态列表
        default: null
      }
    }
  },
  'data_export': {
    name: '数据导出',
    description: '导出处理后的数据',
    icon: <FileTextOutlined />,
    color: '#52c41a',
    parameters: {
      format: {
        label: '导出格式',
        type: 'select',
        options: ['csv', 'parquet'],
        default: 'csv'
      },
      filename: {
        label: '文件名',
        type: 'text',
        default: 'processed_data'
      }
    }
  },
  'data_filter': {
    name: '数据过滤',
    description: '根据条件过滤数据行',
    icon: <SettingOutlined />,
    color: '#1890ff',
    parameters: {
      filters: {
        label: '过滤条件',
        type: 'text',
        default: ''
      }
    }
  },
  'data-filter': {
    name: '数据过滤',
    description: '根据条件过滤数据行',
    icon: <SettingOutlined />,
    color: '#1890ff',
    parameters: {
      filter_column: {
        label: '过滤列',
        type: 'text',
        default: ''
      },
      filter_operator: {
        label: '操作符',
        type: 'select',
        options: ['>', '<', '>=', '<=', '==', '!=', 'contains', 'startswith', 'endswith'],
        default: '>'
      },
      filter_value: {
        label: '过滤值',
        type: 'text',
        default: ''
      }
    }
  },
  'data-transform': {
    name: '数据转换',
    description: '对数据进行转换处理',
    icon: <SettingOutlined />,
    color: '#722ed1',
    parameters: {
      transform_type: {
        label: '转换类型',
        type: 'select',
        options: ['rename_column', 'add_column', 'drop_column', 'convert_type'],
        default: 'rename_column'
      },
      column_name: {
        label: '列名',
        type: 'text',
        default: ''
      },
      new_value: {
        label: '新值/新名称',
        type: 'text',
        default: ''
      }
    }
  },
  'data_aggregate': {
    name: '数据聚合',
    description: '对数据进行分组聚合操作',
    icon: <SettingOutlined />,
    color: '#fa8c16',
    parameters: {
      group_by: {
        label: '分组字段',
        type: 'text',
        default: ''
      },
      aggregations: {
        label: '聚合操作',
        type: 'text',
        default: ''
      }
    }
  },
  'data-aggregate': {
    name: '数据聚合',
    description: '对数据进行分组聚合',
    icon: <SettingOutlined />,
    color: '#fa8c16',
    parameters: {
      group_by: {
        label: '分组列',
        type: 'text',
        default: ''
      },
      agg_column: {
        label: '聚合列',
        type: 'text',
        default: ''
      },
      agg_function: {
        label: '聚合函数',
        type: 'select',
        options: ['sum', 'mean', 'count', 'min', 'max', 'std'],
        default: 'sum'
      }
    }
  },
  'data-output': {
    name: '数据输出',
    description: '将处理结果输出到文件或数据库',
    icon: <FileTextOutlined />,
    color: '#eb2f96',
    parameters: {
      output_format: {
        label: '输出格式',
        type: 'select',
        options: ['csv', 'parquet', 'json', 'excel'],
        default: 'csv'
      },
      output_filename: {
        label: '输出文件名',
        type: 'text',
        default: 'output'
      }
    }
  }
};

const PropertyPanel: React.FC<PropertyPanelProps> = ({ node, onUpdate, uploadedFiles, onFileUploaded }) => {
  const [form] = Form.useForm();
  const [parameters, setParameters] = useState(node.data.parameters || {});
  const [showFileUpload, setShowFileUpload] = useState(false);
  
  const nodeType = node.data.nodeType || 'default';
  const config = nodeTypeConfigs[nodeType as keyof typeof nodeTypeConfigs];
  
  // 文件上传Hook
  const { uploadFile, isUploading } = useFileUpload({
    onSuccess: (fileInfo) => {
      if (onFileUploaded) {
        onFileUploaded(fileInfo);
      }
      // 自动选择刚上传的文件
      const newParameters = { ...parameters, file_id: fileInfo.id };
      setParameters(newParameters);
      onUpdate({ parameters: newParameters });
      form.setFieldValue('file_id', fileInfo.id);
      setShowFileUpload(false);
      message.success(`文件 ${fileInfo.filename} 上传成功并已选择`);
    },
    onError: (error) => {
      message.error(`文件上传失败: ${error.message}`);
    }
  });

  useEffect(() => {
    // 初始化表单值
    if (config?.parameters) {
      const initialValues: any = {};
      Object.entries(config.parameters).forEach(([key, param]) => {
        initialValues[key] = parameters[key] || param.default;
      });
      form.setFieldsValue(initialValues);
    }
  }, [node, config, form, parameters]);

  // 处理参数更新
  const handleParameterChange = (changedValues: any) => {
    const newParameters = { ...parameters, ...changedValues };
    setParameters(newParameters);
    onUpdate({ parameters: newParameters });
  };

  // 处理节点名称更新
  const handleNameChange = (name: string) => {
    onUpdate({ label: name });
  };

  // 渲染参数输入组件
  const renderParameterInput = (key: string, param: any) => {
    switch (param.type) {
      case 'select':
        return (
          <Select placeholder={`请选择${param.label}`}>
            {param.options.map((option: string) => (
              <Option key={option} value={option}>
                {option}
              </Option>
            ))}
          </Select>
        );
      
      case 'number':
        return (
          <InputNumber 
            placeholder={`请输入${param.label}`}
            style={{ width: '100%' }}
          />
        );
      
      case 'boolean':
        return (
          <Switch />
        );
      
      case 'file_select':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Select 
                placeholder="请选择文件"
                allowClear
                showSearch
                optionFilterProp="children"
                className="flex-1"
                dropdownRender={(menu) => (
                  <div>
                    {menu}
                    {uploadedFiles.length === 0 && (
                      <div className="p-2 text-center text-gray-500">
                        暂无已上传文件
                      </div>
                    )}
                  </div>
                )}
              >
                {uploadedFiles.map((file) => (
                  <Option key={file.id} value={file.id}>
                    <Space>
                      <FileTextOutlined />
                      {file.filename}
                      <Tag>{file.file_type.toUpperCase()}</Tag>
                    </Space>
                  </Option>
                ))}
              </Select>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => setShowFileUpload(!showFileUpload)}
                loading={isUploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {showFileUpload ? '取消' : '上传'}
              </Button>
            </div>
            
            {/* 文件上传区域 */}
            {showFileUpload && (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-800">
                <FileUploadArea
                  onFileUploaded={(fileInfo) => {
                    if (onFileUploaded) {
                      onFileUploaded(fileInfo);
                    }
                    // 自动选择刚上传的文件
                    const newParameters = { ...parameters, file_id: fileInfo.id };
                    setParameters(newParameters);
                    onUpdate({ parameters: newParameters });
                    form.setFieldValue('file_id', fileInfo.id);
                    setShowFileUpload(false);
                    message.success(`文件 ${fileInfo.filename} 上传成功并已选择`);
                  }}
                  acceptedTypes={['.csv', '.parquet']}
                  maxFileSize={100}
                  enablePreview={true}
                />
              </div>
            )}
          </div>
        );
      
      case 'textarea':
        return (
          <TextArea 
            rows={3}
            placeholder={`请输入${param.label}`}
          />
        );
      
      default:
        return (
          <Input placeholder={`请输入${param.label}`} />
        );
    }
  };

  if (!config) {
    return (
      <div className="p-4">
        <Alert
          message="未知节点类型"
          description={`节点类型 "${nodeType}" 暂不支持属性配置`}
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="property-panel">
      {/* 节点基本信息 */}
      <Card 
        size="small" 
        className="mb-4 bg-gray-800 border-gray-700"
        title={
          <Space>
            {config.icon}
            <span className="text-white">{config.name}</span>
          </Space>
        }
      >
        <div className="space-y-3">
          <div>
            <Text className="text-gray-400 text-xs">节点ID</Text>
            <br />
            <Text className="text-white font-mono text-sm">{node.id}</Text>
          </div>
          
          <div>
            <Text className="text-gray-400 text-xs">节点描述</Text>
            <br />
            <Text className="text-gray-300 text-sm">{config.description}</Text>
          </div>
          
          <div>
            <Text className="text-gray-400 text-xs">节点名称</Text>
            <Input
              value={node.data.label}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="请输入节点名称"
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      {/* 参数配置 */}
      {config.parameters && Object.keys(config.parameters).length > 0 && (
        <Card 
          size="small" 
          className="bg-gray-800 border-gray-700"
          title={
            <Space>
              <SettingOutlined />
              <span className="text-white">参数配置</span>
            </Space>
          }
        >
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleParameterChange}
            className="parameter-form"
          >
            {Object.entries(config.parameters).map(([key, param]) => (
              <Form.Item
                key={key}
                name={key}
                label={<span className="text-gray-300">{param.label}</span>}
                className="mb-3"
              >
                {renderParameterInput(key, param)}
              </Form.Item>
            ))}
          </Form>
        </Card>
      )}

      {/* 调试信息 */}
      <Collapse 
        className="mt-4 bg-gray-800 border-gray-700"
        ghost
        items={[
          {
            key: 'debug',
            label: (
              <Space>
                <InfoCircleOutlined />
                <span className="text-gray-400">调试信息</span>
              </Space>
            ),
            children: (
              <div className="space-y-2">
                <div>
                  <Text className="text-gray-400 text-xs">当前参数</Text>
                  <pre className="bg-gray-900 p-2 rounded text-xs text-gray-300 mt-1 overflow-auto">
                    {JSON.stringify(parameters, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <Text className="text-gray-400 text-xs">节点位置</Text>
                  <pre className="bg-gray-900 p-2 rounded text-xs text-gray-300 mt-1">
                    {JSON.stringify(node.position, null, 2)}
                  </pre>
                </div>
              </div>
            )
          }
        ]}
      />
    </div>
  );
};

export default PropertyPanel;