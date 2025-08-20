import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// 导入页面组件
import ProjectManagement from '../pages/ProjectManagement';
import Workspace from '../pages/Workspace';
import ExecutionHistory from '../pages/ExecutionHistory';
import DataTransform from '../pages/DataTransform';
import DataAnalysis from '../pages/DataAnalysis';
import DataOutput from '../pages/DataOutput';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 默认路由重定向到项目管理 */}
      <Route path="/" element={<Navigate to="/projects" replace />} />
      
      {/* 项目管理页面 */}
      <Route path="/projects" element={<ProjectManagement />} />
      
      {/* 数据工作区页面 */}
      <Route path="/workspace" element={<Workspace />} />
      
      {/* 带项目ID的数据工作区页面 */}
      <Route path="/workspace/:projectId" element={<Workspace />} />
      
      {/* 执行历史页面 */}
      <Route path="/history" element={<ExecutionHistory />} />
      
      {/* 数据转换页面 */}
        <Route path="/transform" element={<DataTransform />} />
        
        {/* 数据分析页面 */}
        <Route path="/analysis" element={<DataAnalysis />} />
        
        {/* 数据输出页面 */}
        <Route path="/output" element={<DataOutput />} />
        
        {/* 404页面 - 重定向到项目管理 */}
        <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
};

export default AppRouter;