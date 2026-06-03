import { Button, Dropdown, Input } from "antd";
import type { MenuProps } from "antd";
import { DownOutlined, SearchOutlined } from "@ant-design/icons";
import { Link, Outlet, history, useLocation, useModel } from "umi";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CreationIcon from "@/assets/Creation.png";
import styles from "./index.less";

export default function Layout() {
  const { currentUser, signOut } = useModel("auth");
  const location = useLocation();
  const isIndexPage =
    location.pathname === "/index" || location.pathname === "/";
  const isLoginPage = location.pathname === "/login";
  const isCreatorPage = location.pathname.startsWith("/creator");
  const isWorkspacePage = location.pathname.startsWith("/workspace");
  const isAdminPage = location.pathname.startsWith("/admin");
  const isFullBleedPage = isLoginPage || isAdminPage;
  const shellClassName = [
    styles.shell,
    isIndexPage ? styles.indexShell : "",
    isLoginPage ? styles.loginShell : "",
    isCreatorPage ? styles.creatorShell : "",
    isWorkspacePage ? styles.workspaceShell : "",
  ]
    .filter(Boolean)
    .join(" ");
  const userMenuItems: MenuProps["items"] = [
    { key: "settings", label: "账号设置" },
    { key: "password", label: "修改密码" },
    { key: "nickname", label: "昵称设置" },
    { key: "likes", label: "我的点赞" },
    { key: "favorites", label: "我的收藏" },
    { key: "works", label: "个人作品" },
    ...(currentUser && ['admin', 'editor'].includes(currentUser.role)
      ? [{ type: "divider" as const }, { key: "/admin", label: "🔧 管理后台" }]
      : []),
    { type: "divider" },
    { key: "/audit", label: "审核管理" },
    { type: "divider" },
    { key: "switch", label: "切换账号" },
    { key: "logout", label: "退出登录", danger: true },
  ];

  function handleUserMenuClick({ key }: { key: string }) {
    if (key === "switch" || key === "logout") {
      signOut();
      return;
    }

    if (key.startsWith("/")) {
      history.push(key);
      return;
    }

    history.push(`/profile/${key}`);
  }

  return (
    <div className={shellClassName}>
      <header className={styles.header}>
        <Link to="/index" className={styles.brand}>
          <img src={CreationIcon} className={styles.brandIcon} alt="logo" />
          AI Creator Platform
        </Link>
        <nav className={styles.nav}>
          <Link to="/index" className={isIndexPage ? styles.activeNavLink : ""}>
            爆文发现
          </Link>
          <Link
            to="/creator"
            className={isCreatorPage ? styles.activeNavLink : ""}
          >
            创作工作台
          </Link>
          <Link
            to="/workspace"
            className={
              location.pathname.startsWith("/workspace")
                ? styles.activeNavLink
                : ""
            }
          >
            资源工作台
          </Link>
        </nav>
        <Input.Search
          className={styles.searchBar}
          placeholder="搜索文章..."
          prefix={<SearchOutlined />}
          allowClear
          onSearch={(value) => {
            if (value.trim()) {
              history.push(`/search?q=${encodeURIComponent(value.trim())}`);
            }
          }}
        />
        {currentUser ? (
          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
            overlayClassName={styles.profileDropdown}
          >
            <Button className={styles.signOutButton} type="link">
              个人中心 {currentUser.username} <DownOutlined />
            </Button>
          </Dropdown>
        ) : (
          <Link to="/login">登录</Link>
        )}
      </header>
      <main
        className={`${styles.main} ${
          isFullBleedPage ? styles.fullBleedMain : ""
        }`}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
