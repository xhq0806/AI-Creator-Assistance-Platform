import React from 'react';
import { Navigate } from 'umi';
import { message } from 'antd';

export default function StaffWrapper({ children }: { children: React.ReactNode }) {
  try {
    const raw = window.localStorage.getItem('ai_creator_user');
    if (!raw) {
      return <Navigate to="/login" replace />;
    }

    const user = JSON.parse(raw);
    if (!['admin', 'editor'].includes(user.role)) {
      message.warning('您没有访问管理后台的权限');
      return <Navigate to="/index" replace />;
    }

    return <>{children}</>;
  } catch {
    return <Navigate to="/login" replace />;
  }
}
