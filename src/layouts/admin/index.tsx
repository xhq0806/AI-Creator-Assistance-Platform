import { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Dropdown,
  Avatar,
  Typography,
  message,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { Outlet, Navigate, history, useLocation } from 'umi';
import styles from './index.less';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface CurrentUser {
  id: number;
  username: string;
  role: 'user' | 'editor' | 'admin';
  token?: string;
}

function getUser(): CurrentUser | null {
  try {
    const raw = window.localStorage.getItem('ai_creator_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const allMenuItems: Record<string, { key: string; label: string; icon: React.ReactNode; roles: string[] }> = {
  dashboard: { key: '/admin/dashboard', label: '仪表盘', icon: <DashboardOutlined />, roles: ['admin', 'editor'] },
  users: { key: '/admin/users', label: '用户管理', icon: <UserOutlined />, roles: ['admin'] },
  articles: { key: '/admin/articles', label: '文章管理', icon: <FileTextOutlined />, roles: ['admin', 'editor'] },
  prompts: { key: '/admin/prompts', label: 'Prompt 管理', icon: <AppstoreOutlined />, roles: ['admin', 'editor'] },
  materials: { key: '/admin/materials', label: '素材管理', icon: <PictureOutlined />, roles: ['admin', 'editor'] },
  audit: { key: '/admin/audit', label: '审核管理', icon: <SafetyCertificateOutlined />, roles: ['admin', 'editor'] },
  system: { key: '/admin/system', label: '系统配置', icon: <SettingOutlined />, roles: ['admin'] },
};

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const user = getUser();

  // ── Auth check (replaces @/wrappers/auth) ─────────────────
  if (!user?.token) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // ── Staff check (replaces @/wrappers/staff) ────────────────
  if (!['admin', 'editor'].includes(user.role)) {
    message.warning('您没有访问管理后台的权限');
    return <Navigate to="/index" replace />;
  }

  // ── Admin-only route guard (replaces @/wrappers/admin on users/system) ─
  const adminOnlyPaths = ['/admin/users', '/admin/system'];
  if (adminOnlyPaths.some((p) => location.pathname.startsWith(p)) && user?.role !== 'admin') {
    message.warning('此功能仅限管理员访问');
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Build menu items based on user role
  const menuItems: MenuProps['items'] = Object.values(allMenuItems)
    .filter((item) => user && item.roles.includes(user.role))
    .map((item) => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
    }));

  const selectedKey = Object.values(allMenuItems).find(
    (item) => location.pathname.startsWith(item.key)
  )?.key || '/admin/dashboard';

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', label: `${user?.username || ''} (${user?.role === 'admin' ? '管理员' : '编辑'})`, disabled: true },
    { type: 'divider' },
    { key: 'back', label: '← 返回创作平台', icon: <RollbackOutlined /> },
    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true },
  ];

  function handleUserMenuClick({ key }: { key: string }) {
    if (key === 'logout') {
      window.localStorage.removeItem('ai_creator_user');
      history.push('/login');
    } else if (key === 'back') {
      history.push('/index');
    }
  }

  return (
    <Layout className={styles.adminLayout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className={styles.sider}
        width={220}
      >
        <div className={styles.logo}>
          {!collapsed ? '灵感创作后台管理' : '后台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => history.push(key)}
        />
        <div className={styles.siderFooter}>
          <Button
            type="text"
            icon={<RollbackOutlined />}
            onClick={() => history.push('/index')}
            className={styles.backBtn}
          >
            {!collapsed && '返回平台'}
          </Button>
        </div>
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className={styles.trigger}
          />
          <div className={styles.headerRight}>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
            >
              <div className={styles.userInfo}>
                <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                <Text className={styles.username}>{user?.username}</Text>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
