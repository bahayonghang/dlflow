import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Typography, Avatar, Dropdown, Space, Button, theme } from 'antd';
import {
  ProjectOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

// 导入路由组件
import AppRouter from './components/AppRouter';

// 导入样式
import './App.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

// 菜单项配置
const menuItems: MenuItem[] = [
  {
    key: 'projects',
    icon: <ProjectOutlined />,
    label: '项目管理',
  },
  {
    key: 'workspace',
    icon: <AppstoreOutlined />,
    label: '数据工作区',
  },
  {
    key: 'history',
    icon: <HistoryOutlined />,
    label: '执行历史',
  },
];

// 用户菜单
const userMenuItems: MenuProps['items'] = [
  {
    key: 'profile',
    icon: <UserOutlined />,
    label: '个人资料',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: '系统设置',
  },
  {
    type: 'divider',
  },
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: '退出登录',
    danger: true,
  },
];

// 内部组件，用于访问路由信息
const AppContent: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // 根据当前路径确定选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/workspace')) {
      return 'workspace';
    } else if (path.startsWith('/history')) {
      return 'history';
    } else {
      return 'projects';
    }
  };

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'projects':
        navigate('/projects');
        break;
      case 'workspace':
        navigate('/workspace');
        break;
      case 'history':
        navigate('/history');
        break;
    }
  };

  // 处理用户菜单点击
  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'profile':
        console.log('打开个人资料');
        break;
      case 'settings':
        console.log('打开系统设置');
        break;
      case 'logout':
        console.log('退出登录');
        break;
    }
  };

  const selectedKey = getSelectedKey();
  
  // 获取当前页面标题
  const getCurrentPageTitle = () => {
    const item = menuItems.find(item => item?.key === selectedKey);
    return item && 'label' in item ? item.label : '';
  };

  return (
    <Layout className="min-h-screen">
      {/* 侧边栏 */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="bg-gray-900 border-r border-gray-700"
        width={240}
      >
        {/* Logo区域 */}
        <div className="h-16 flex items-center justify-center border-b border-gray-700">
          {collapsed ? (
            <ExperimentOutlined className="text-2xl text-blue-400" />
          ) : (
            <div className="flex items-center space-x-2">
              <ExperimentOutlined className="text-2xl text-blue-400" />
              <Title level={4} className="text-white m-0">
                DLFlow
              </Title>
            </div>
          )}
        </div>

        {/* 导航菜单 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          className="bg-gray-900 border-r-0"
        />

        {/* 底部信息 */}
        {!collapsed && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <Text className="text-gray-400 text-xs">
                科学数据处理平台
              </Text>
              <br />
              <Text className="text-gray-500 text-xs">
                v1.0.0
              </Text>
            </div>
          </div>
        )}
      </Sider>

      <Layout>
        {/* 顶部导航栏 */}
        <Header 
          className="bg-gray-800 border-b border-gray-700 px-4 flex items-center justify-between"
          style={{ padding: '0 16px' }}
        >
          {/* 左侧：折叠按钮和面包屑 */}
          <div className="flex items-center space-x-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-white hover:text-blue-400"
            />
            
            <div className="flex items-center space-x-2">
              <Text className="text-gray-400">当前页面:</Text>
              <Text className="text-white font-medium">
                {getCurrentPageTitle()}
              </Text>
            </div>
          </div>

          {/* 右侧：用户信息 */}
          <div className="flex items-center space-x-4">
            {/* 系统状态指示器 */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <Text className="text-gray-400 text-sm">系统正常</Text>
            </div>

            {/* 用户菜单 */}
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 px-3 py-2 rounded">
                <Avatar 
                  size="small" 
                  icon={<UserOutlined />} 
                  className="bg-blue-600"
                />
                <div className="flex flex-col">
                  <Text className="text-white text-sm font-medium">管理员</Text>
                  <Text className="text-gray-400 text-xs">admin@dlflow.com</Text>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* 主内容区域 */}
        <Content
          className="bg-gray-900 overflow-auto"
          style={{
            margin: 0,
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <AppRouter />
        </Content>
      </Layout>
    </Layout>
  );
};

// 主App组件
const App: React.FC = () => {
  return <AppContent />;
};

export default App;