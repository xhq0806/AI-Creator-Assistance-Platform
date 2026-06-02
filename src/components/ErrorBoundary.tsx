import { Component, type ReactNode } from "react";
import { Alert, Button, Space } from "antd";

type ErrorBoundaryState = {
  hasError: boolean;
  message?: string;
};

function persistError(message: string, stack?: string) {
  try {
    const key = "error_logs";
    const raw = localStorage.getItem(key);
    const logs: { message: string; stack?: string; path: string; timestamp: string }[] = raw
      ? JSON.parse(raw)
      : [];
    logs.push({
      message,
      stack: stack?.slice(0, 500),
      path: location.pathname,
      timestamp: new Date().toISOString(),
    });
    if (logs.length > 30) logs.splice(0, logs.length - 30);
    localStorage.setItem(key, JSON.stringify(logs));
  } catch {
    /* ignore */
  }
}

export function getStoredErrors() {
  try {
    return JSON.parse(localStorage.getItem("error_logs") || "[]");
  } catch {
    return [];
  }
}

export function clearStoredErrors() {
  localStorage.removeItem("error_logs");
}

export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    persistError(error.message, error.stack);
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 600, margin: "60px auto", padding: 24 }}>
          <Alert
            type="error"
            message="页面渲染异常"
            description={
              <div>
                <p style={{ marginBottom: 12 }}>
                  {this.state.message || "未知错误"}
                </p>
                <p style={{ color: "#6b7280", fontSize: 13 }}>
                  错误已记录到本地日志，刷新页面或联系管理员。
                </p>
              </div>
            }
            showIcon
            action={
              <Space>
                <Button size="small" onClick={this.handleReload}>
                  重试
                </Button>
                <Button
                  size="small"
                  onClick={() => (window.location.href = "/index")}
                >
                  返回首页
                </Button>
              </Space>
            }
          />
        </div>
      );
    }

    return this.props.children;
  }
}
