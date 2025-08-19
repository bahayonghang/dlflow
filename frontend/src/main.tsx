import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './index.css'
import App from './App.tsx'

// 配置 Ant Design 暗色主题
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#1890ff',
    colorBgContainer: '#1f2937',
    colorBgElevated: '#374151',
    colorBorder: '#4b5563',
    colorText: '#ffffff',
    colorTextSecondary: '#d1d5db',
    colorTextTertiary: '#9ca3af',
    borderRadius: 6,
  },
  components: {
    Layout: {
      bodyBg: '#111827', // 与 Tailwind bg-gray-900 保持一致
      headerBg: '#1f2937',
      siderBg: '#1f2937',
    },
    Menu: {
      darkItemBg: '#1f2937',
      darkItemSelectedBg: '#1890ff',
      darkItemHoverBg: '#374151',
    },
    Card: {
      colorBgContainer: '#1f2937',
    },
    Table: {
      colorBgContainer: '#1f2937',
      headerBg: '#374151',
    },
    Input: {
      colorBgContainer: '#374151',
    },
    Select: {
      colorBgContainer: '#374151',
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={darkTheme} locale={zhCN}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>,
)
