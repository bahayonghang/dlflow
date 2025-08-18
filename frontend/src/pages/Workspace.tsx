import React, { useState, useCallback, useRef } from 'react';
import {
  Layout,
  Button,
  Upload,
  message,
  Drawer,
  Card,
  Typography,
  Space,
  Divider,
  Tag,
  Progress
} from 'antd';
import {
  UploadOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  SettingOutlined,
  FileTextOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  ReactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useParams } from 'react-router-dom';

import NodeLibrary from '../components/NodeLibrary';
import PropertyPanel from '../components/PropertyPanel';
import FileUploadArea from '../components/FileUploadArea';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

// 自定义节点样式
const nodeTypes = {
  // 可以在这里定义自定义节点类型
};

// 初始节点
const initialNodes: Node[] = [];

// 初始边
const initialEdges: Edge[] = [];

const Workspace: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [uploadDrawerVisible, setUploadDrawerVisible] = useState(false);
  const [propertyDrawerVisible, setPropertyDrawerVisible] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // 连接节点
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // 节点选择
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setPropertyDrawerVisible(true);
  }, []);

  // 拖拽添加节点
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow-label');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'default',
        position,
        data: {
          label: label || type,
          nodeType: type,
          parameters: {}
        },
        style: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: '1px solid #4f46e5',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // 保存工作流
  const handleSaveWorkflow = async () => {
    try {
      const workflow = {
        name: `工作流-${new Date().toLocaleString()}`,
        description: '通过可视化界面创建的数据处理工作流',
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.data.nodeType,
          name: node.data.label,
          parameters: node.data.parameters || {},
          position: node.position
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          source_handle: edge.sourceHandle,
          target_handle: edge.targetHandle
        }))
      };

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workflow),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success('工作流保存成功');
      } else {
        message.error('工作流保存失败');
      }
    } catch (error) {
      message.error('保存失败');
      console.error('Error saving workflow:', error);
    }
  };

  // 执行工作流
  const handleExecuteWorkflow = async () => {
    if (nodes.length === 0) {
      message.warning('请先添加处理节点');
      return;
    }

    try {
      setIsExecuting(true);
      setExecutionProgress(0);

      // 首先保存工作流
      await handleSaveWorkflow();

      // 模拟执行进度
      const progressInterval = setInterval(() => {
        setExecutionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      // TODO: 实际执行工作流的逻辑
      setTimeout(() => {
        setExecutionProgress(100);
        setIsExecuting(false);
        message.success('工作流执行完成');
      }, 5000);

    } catch (error) {
      setIsExecuting(false);
      setExecutionProgress(0);
      message.error('执行失败');
      console.error('Error executing workflow:', error);
    }
  };

  // 文件上传成功回调
  const handleFileUploaded = (fileInfo: any) => {
    setUploadedFiles(prev => [...prev, fileInfo]);
    message.success(`文件 ${fileInfo.filename} 上传成功`);
  };

  // 更新节点属性
  const handleNodeUpdate = (nodeId: string, updates: any) => {
    setNodes(nds => 
      nds.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
  };

  return (
    <ReactFlowProvider>
      <Layout className="h-screen bg-gray-900">
        {/* 左侧节点库 */}
        <Sider width={280} className="bg-gray-800 border-r border-gray-700">
          <div className="p-4">
            <Title level={4} className="text-white mb-4">
              节点库
            </Title>
            <NodeLibrary />
          </div>
        </Sider>

        {/* 主工作区 */}
        <Layout>
          {/* 顶部工具栏 */}
          <div className="bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <Title level={4} className="text-white mb-0">
                  数据处理工作区
                </Title>
                {projectId && (
                  <Tag color="blue">项目: {projectId}</Tag>
                )}
              </div>
              
              <Space>
                <Button
                  icon={<UploadOutlined />}
                  onClick={() => setUploadDrawerVisible(true)}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  上传文件
                </Button>
                
                <Button
                  icon={<SaveOutlined />}
                  onClick={handleSaveWorkflow}
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  保存工作流
                </Button>
                
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleExecuteWorkflow}
                  loading={isExecuting}
                  className="bg-blue-600 hover:bg-blue-700 border-blue-600"
                >
                  {isExecuting ? '执行中...' : '执行工作流'}
                </Button>
              </Space>
            </div>
            
            {/* 执行进度 */}
            {isExecuting && (
              <div className="mt-3">
                <Progress 
                  percent={executionProgress} 
                  status={executionProgress === 100 ? 'success' : 'active'}
                  strokeColor="#1890ff"
                />
              </div>
            )}
          </div>

          {/* 流程图画布 */}
          <Content className="relative">
            <div className="w-full h-full" ref={reactFlowWrapper}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                className="bg-gray-900"
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              >
                <Background 
                  color="#374151" 
                  gap={20} 
                  size={1}
                />
                <Controls className="bg-gray-800 border-gray-700" />
                <MiniMap 
                  className="bg-gray-800 border-gray-700"
                  nodeColor="#4f46e5"
                  maskColor="rgba(0, 0, 0, 0.2)"
                />
              </ReactFlow>
            </div>
          </Content>
        </Layout>

        {/* 右侧属性面板 */}
        <Drawer
          title="节点属性"
          placement="right"
          width={400}
          open={propertyDrawerVisible}
          onClose={() => setPropertyDrawerVisible(false)}
          className="dark-drawer"
        >
          {selectedNode && (
            <PropertyPanel
              node={selectedNode}
              onUpdate={(updates) => handleNodeUpdate(selectedNode.id, updates)}
              uploadedFiles={uploadedFiles}
            />
          )}
        </Drawer>

        {/* 文件上传抽屉 */}
        <Drawer
          title="文件上传"
          placement="right"
          width={500}
          open={uploadDrawerVisible}
          onClose={() => setUploadDrawerVisible(false)}
          className="dark-drawer"
        >
          <FileUploadArea onFileUploaded={handleFileUploaded} />
          
          {/* 已上传文件列表 */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <Divider orientation="left">已上传文件</Divider>
              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <Card key={file.id} size="small" className="bg-gray-800 border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileTextOutlined className="text-blue-400" />
                        <div>
                          <Text className="text-white font-medium">{file.filename}</Text>
                          <br />
                          <Text className="text-gray-400 text-xs">
                            {file.file_type.toUpperCase()} • {(file.file_size / 1024 / 1024).toFixed(2)} MB
                          </Text>
                        </div>
                      </div>
                      <Button
                        type="text"
                        icon={<DatabaseOutlined />}
                        className="text-gray-400 hover:text-white"
                        onClick={() => {
                          // TODO: 预览文件数据
                          message.info('数据预览功能开发中');
                        }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </Drawer>
      </Layout>
    </ReactFlowProvider>
  );
};

export default Workspace;