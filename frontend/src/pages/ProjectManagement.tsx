import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  Dropdown,
  App,
  Empty,
  Spin
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'draft';
  created_at: string;
  updated_at: string;
  metadata?: {
    tags?: string[];
    category?: string;
  };
}

interface ProjectFormData {
  name: string;
  description?: string;
  tags?: string[];
  category?: string;
}

const ProjectManagement: React.FC = () => {
  const { message } = App.useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // 获取项目列表
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects/');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      message.error('获取项目列表失败');
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // 创建或更新项目
  const handleSubmit = async (values: ProjectFormData) => {
    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects/';
      const method = editingProject ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          description: values.description || '',
          metadata: {
            tags: values.tags || [],
            category: values.category || 'general'
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        message.success(editingProject ? '项目更新成功' : '项目创建成功');
        setModalVisible(false);
        setEditingProject(null);
        form.resetFields();
        fetchProjects();
      } else {
        message.error(result.message || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
      console.error('Error saving project:', error);
    }
  };

  // 删除项目
  const handleDelete = async (projectId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除项目将无法恢复，确定要删除吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE',
          });
          
          const result = await response.json();
          
          if (result.success) {
            message.success('项目删除成功');
            fetchProjects();
          } else {
            message.error(result.message || '删除失败');
          }
        } catch (error) {
          message.error('删除失败');
          console.error('Error deleting project:', error);
        }
      },
    });
  };

  // 打开编辑模态框
  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue({
      name: project.name,
      description: project.description,
      tags: project.metadata?.tags || [],
      category: project.metadata?.category || 'general'
    });
    setModalVisible(true);
  };

  // 进入项目工作区
  const handleEnterWorkspace = (projectId: string) => {
    navigate(`/workspace/${projectId}`);
  };

  // 获取状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'archived':
        return 'default';
      case 'draft':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃';
      case 'archived':
        return '已归档';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  };

  // 项目操作菜单
  const getProjectMenuItems = (project: Project): MenuProps['items'] => [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
      onClick: () => handleEdit(project),
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete(project.id),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Title level={2} className="text-white mb-2">
              项目管理
            </Title>
            <Text className="text-gray-400">
              管理您的数据处理项目，创建新的分析流程
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProject(null);
              form.resetFields();
              setModalVisible(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 border-blue-600"
          >
            创建项目
          </Button>
        </div>

        {/* 项目列表 */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Empty
              description="暂无项目"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingProject(null);
                  form.resetFields();
                  setModalVisible(true);
                }}
              >
                创建第一个项目
              </Button>
            </Empty>
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {projects.map((project) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
                <Card
                  className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-all duration-300"
                  hoverable
                  actions={[
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleEnterWorkspace(project.id)}
                      className="bg-blue-600 hover:bg-blue-700 border-blue-600"
                    >
                      进入工作区
                    </Button>,
                    <Dropdown
                      menu={{ items: getProjectMenuItems(project) }}
                      trigger={['click']}
                    >
                      <Button
                        type="text"
                        icon={<MoreOutlined />}
                        className="text-gray-400 hover:text-white"
                      />
                    </Dropdown>,
                  ]}
                >
                  <div className="space-y-3">
                    {/* 项目图标和状态 */}
                    <div className="flex justify-between items-start">
                      <FolderOutlined className="text-2xl text-blue-400" />
                      <Tag color={getStatusColor(project.status)}>
                        {getStatusText(project.status)}
                      </Tag>
                    </div>

                    {/* 项目名称 */}
                    <Title level={4} className="text-white mb-2 line-clamp-2">
                      {project.name}
                    </Title>

                    {/* 项目描述 */}
                    {project.description && (
                      <Text className="text-gray-400 text-sm line-clamp-3">
                        {project.description}
                      </Text>
                    )}

                    {/* 标签 */}
                    {project.metadata?.tags && project.metadata.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.metadata.tags.slice(0, 3).map((tag) => (
                          <Tag key={tag} className="text-xs">
                            {tag}
                          </Tag>
                        ))}
                        {project.metadata.tags.length > 3 && (
                          <Tag className="text-xs">
                            +{project.metadata.tags.length - 3}
                          </Tag>
                        )}
                      </div>
                    )}

                    {/* 时间信息 */}
                    <div className="flex items-center text-gray-500 text-xs">
                      <ClockCircleOutlined className="mr-1" />
                      更新于 {new Date(project.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* 创建/编辑项目模态框 */}
        <Modal
          title={editingProject ? '编辑项目' : '创建项目'}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            setEditingProject(null);
            form.resetFields();
          }}
          footer={null}
          className="dark-modal"
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="mt-4"
          >
            <Form.Item
              name="name"
              label="项目名称"
              rules={[{ required: true, message: '请输入项目名称' }]}
            >
              <Input placeholder="输入项目名称" />
            </Form.Item>

            <Form.Item name="description" label="项目描述">
              <TextArea
                rows={3}
                placeholder="输入项目描述（可选）"
              />
            </Form.Item>

            <Form.Item name="category" label="项目分类">
              <Select placeholder="选择项目分类">
                <Option value="general">通用分析</Option>
                <Option value="business">业务分析</Option>
                <Option value="research">研究分析</Option>
                <Option value="experiment">实验分析</Option>
              </Select>
            </Form.Item>

            <Form.Item name="tags" label="标签">
              <Select
                mode="tags"
                placeholder="添加标签"
                tokenSeparators={[',']}
              >
                <Option value="数据清洗">数据清洗</Option>
                <Option value="可视化">可视化</Option>
                <Option value="统计分析">统计分析</Option>
                <Option value="机器学习">机器学习</Option>
              </Select>
            </Form.Item>

            <Form.Item className="mb-0">
              <Space className="w-full justify-end">
                <Button
                  onClick={() => {
                    setModalVisible(false);
                    setEditingProject(null);
                    form.resetFields();
                  }}
                >
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  {editingProject ? '更新' : '创建'}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
};

export default ProjectManagement;