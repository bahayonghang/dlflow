import React, { useState, useEffect } from 'react';
import { Collapse, Card, Typography, Space, Input, Tag } from 'antd';
import {
  DatabaseOutlined,
  FilterOutlined,
  FunctionOutlined,
  BarChartOutlined,
  ExportOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  LineChartOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Search } = Input;

interface NodeType {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: any[];
}

interface NodeCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
  nodes: NodeType[];
}

const NodeLibrary: React.FC = () => {
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // 获取节点类型
  useEffect(() => {
    const fetchNodeTypes = async () => {
      try {
        const response = await fetch('/api/node-types');
        const data = await response.json();
        setNodeTypes(data.node_types || []);
      } catch (error) {
        console.error('Error fetching node types:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNodeTypes();
  }, []);

  // 拖拽开始
  const onDragStart = (event: React.DragEvent, nodeType: string, nodeLabel: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', nodeLabel);
    event.dataTransfer.effectAllowed = 'move';
  };

  // 获取节点图标
  const getNodeIcon = (nodeId: string) => {
    switch (nodeId) {
      case 'data_input':
        return <DatabaseOutlined />;
      case 'time_parser':
        return <ClockCircleOutlined />;
      case 'data_filter':
        return <FilterOutlined />;
      case 'data_aggregate':
        return <FunctionOutlined />;
      case 'variable_analysis':
        return <LineChartOutlined />;
      case 'data_visualization':
        return <BarChartOutlined />;
      case 'data_export':
        return <ExportOutlined />;
      case 'data_statistics':
        return <FunctionOutlined />;
      default:
        return <FunctionOutlined />;
    }
  };

  // 获取分类颜色
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'input':
        return '#52c41a';
      case 'transform':
        return '#1890ff';
      case 'analysis':
        return '#722ed1';
      case 'output':
        return '#fa8c16';
      default:
        return '#666';
    }
  };

  // 过滤节点
  const filteredNodes = nodeTypes.filter(node =>
    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    node.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 按分类分组节点
  const nodeCategories: NodeCategory[] = [
    {
      key: 'input',
      label: '数据输入',
      icon: <DatabaseOutlined />,
      nodes: filteredNodes.filter(node => node.category === 'input')
    },
    {
      key: 'transform',
      label: '数据转换',
      icon: <FunctionOutlined />,
      nodes: filteredNodes.filter(node => node.category === 'transform')
    },
    {
      key: 'analysis',
      label: '数据分析',
      icon: <LineChartOutlined />,
      nodes: filteredNodes.filter(node => node.category === 'analysis')
    },
    {
      key: 'output',
      label: '数据输出',
      icon: <ExportOutlined />,
      nodes: filteredNodes.filter(node => node.category === 'output')
    }
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-700 rounded-lg p-3 animate-pulse">
            <div className="h-4 bg-gray-600 rounded mb-2"></div>
            <div className="h-3 bg-gray-600 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <Search
        placeholder="搜索节点..."
        prefix={<SearchOutlined />}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="dark-input"
      />

      {/* 节点分类 */}
      <Collapse
        defaultActiveKey={['input', 'transform', 'analysis', 'output']}
        ghost
        className="dark-collapse"
        items={nodeCategories.map(category => ({
          key: category.key,
          label: (
            <div className="flex items-center space-x-2">
              <span className="text-blue-400">{category.icon}</span>
              <span className="text-white font-medium">{category.label}</span>
              <Tag className="ml-auto">
                {category.nodes.length}
              </Tag>
            </div>
          ),
          className: "border-gray-700",
          children: (
            <div className="space-y-2">
              {category.nodes.map(node => (
                <Card
                  key={node.id}
                  size="small"
                  className="bg-gray-700 border-gray-600 hover:border-blue-500 cursor-grab active:cursor-grabbing transition-all duration-200"
                  draggable
                  onDragStart={(e) => onDragStart(e, node.id, node.name)}
                >
                  <div className="space-y-2">
                    {/* 节点标题 */}
                    <div className="flex items-center space-x-2">
                      <span 
                        className="text-lg"
                        style={{ color: getCategoryColor(node.category) }}
                      >
                        {getNodeIcon(node.id)}
                      </span>
                      <Text className="text-white font-medium text-sm">
                        {node.name}
                      </Text>
                    </div>

                    {/* 节点描述 */}
                    <Text className="text-gray-400 text-xs leading-relaxed">
                      {node.description}
                    </Text>

                    {/* 参数数量 */}
                    {node.parameters && node.parameters.length > 0 && (
                      <div className="flex items-center justify-between">
                        <Tag color={getCategoryColor(node.category)}>
                          {node.parameters.length} 个参数
                        </Tag>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              
              {category.nodes.length === 0 && (
                <div className="text-center py-4">
                  <Text className="text-gray-500 text-sm">
                    {searchTerm ? '没有找到匹配的节点' : '暂无节点'}
                  </Text>
                </div>
              )}
            </div>
          )
        }))}
      />

      {/* 使用提示 */}
      <Card size="small" className="bg-blue-900 border-blue-700">
        <div className="space-y-2">
          <Text className="text-blue-200 text-xs font-medium">
            💡 使用提示
          </Text>
          <Text className="text-blue-300 text-xs leading-relaxed">
            拖拽节点到画布中创建数据处理流程。连接节点形成完整的数据处理管道。
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default NodeLibrary;