import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'umi';
import { message } from 'antd';

const ADMIN_DENIED_MESSAGE_KEY = 'admin-access-denied';

function AdminDeniedRedirect() {
  useEffect(() => {
    message.open({
      type: 'warning',
      content: '此功能仅限管理员访问',
      key: ADMIN_DENIED_MESSAGE_KEY,
    });
  }, []);

  return <Navigate to="/admin/dashboard" replace />;
}

export default function AdminWrapper() {
  const location = useLocation();
  const redirect = encodeURIComponent(`${location.pathname}${location.search}`);

  try {
    const raw = window.localStorage.getItem('ai_creator_user');
    if (!raw) {
      return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }

    const user = JSON.parse(raw);
    if (!user?.token) {
      window.localStorage.removeItem('ai_creator_user');
      return <Navigate to={`/login?redirect=${redirect}`} replace />;
    }

    if (user.role !== 'admin') {
      return <AdminDeniedRedirect />;
    }

    return <Outlet />;
  } catch {
    window.localStorage.removeItem('ai_creator_user');
    return <Navigate to="/login" replace />;
  }
}
