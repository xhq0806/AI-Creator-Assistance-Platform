import React from 'react';
import { Alert } from 'antd';

type State = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return <Alert type="error" message="页面渲染失败" description={this.state.message} showIcon />;
    }

    return this.props.children;
  }
}
