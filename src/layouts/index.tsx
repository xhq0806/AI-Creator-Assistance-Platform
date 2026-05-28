import { Button } from "antd";
import { Link, Outlet, useLocation, useModel } from "umi";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import styles from "./index.less";

export default function Layout() {
  const { currentUser, signOut } = useModel("auth");
  const location = useLocation();
  const isIndexPage =
    location.pathname === "/index" || location.pathname === "/";
  const isLoginPage = location.pathname === "/login";
  const isCreatorPage = location.pathname.startsWith("/creator");
  const isFullBleedPage = isLoginPage;
  const shellClassName = [
    styles.shell,
    isIndexPage ? styles.indexShell : "",
    isLoginPage ? styles.loginShell : "",
    isCreatorPage ? styles.creatorShell : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      <header className={styles.header}>
        <Link to="/index" className={styles.brand}>
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
        </nav>
        {currentUser ? (
          <Button
            className={styles.signOutButton}
            type="link"
            onClick={signOut}
          >
            退出 {currentUser.username}
          </Button>
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
