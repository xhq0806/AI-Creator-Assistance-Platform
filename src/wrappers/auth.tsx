import { Navigate, Outlet, useLocation } from 'umi';

export default function AuthWrapper() {
  const location = useLocation();

  try {
    const raw = window.localStorage.getItem('ai_creator_user');
    if (!raw) {
      return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    }

    const user = JSON.parse(raw);
    if (!user?.token) {
      window.localStorage.removeItem('ai_creator_user');
      return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    }

    return <Outlet />;
  } catch {
    window.localStorage.removeItem('ai_creator_user');
    return <Navigate to="/login" replace />;
  }
}
