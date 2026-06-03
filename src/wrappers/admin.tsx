import React from 'react';
import { Navigate } from 'umi';
import { message } from 'antd';

export default function AdminWrapper({ children }: { children: React.ReactNode }) {
  try {
    const raw = window.localStorage.getItem('ai_creator_user');
    if (!raw) {
      return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(raw);
    if (user.role !== 'admin') {
      message.warning('此功能仅限管理员访问');
      return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
  } catch {
    return <Navigate to="/login" replace />;
  }
}
