import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'umi';
import { message } from 'antd';

const STAFF_DENIED_MESSAGE_KEY = 'staff-access-denied';

function StaffDeniedRedirect() {
  useEffect(() => {
    message.open({
      type: 'warning',
      content: '您没有访问管理后台的权限',
      key: STAFF_DENIED_MESSAGE_KEY,
    });
  }, []);

  return <Navigate to="/index" replace />;
}

export default function StaffWrapper() {
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

    if (!['admin', 'editor'].includes(user.role)) {
      return <StaffDeniedRedirect />;
    }

    return <Outlet />;
  } catch {
    window.localStorage.removeItem('ai_creator_user');
    return <Navigate to="/login" replace />;
  }
}
