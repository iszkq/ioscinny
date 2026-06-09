import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';
import './styles.css';

type StartupErrorBoundaryState = {
  error?: Error;
};

class StartupErrorBoundary extends Component<{ children: ReactNode }, StartupErrorBoundaryState> {
  state: StartupErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): StartupErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Startup render failed:', error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div
        style={{
          minHeight: '100dvh',
          padding: '24px 20px',
          display: 'grid',
          alignContent: 'center',
          gap: '12px',
          color: '#172033',
          background: '#eef2f5',
        }}
      >
        <div
          style={{
            maxWidth: '640px',
            padding: '20px',
            border: '1px solid #f2c7c7',
            borderRadius: '12px',
            background: '#fff7f7',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
          }}
        >
          <p style={{ margin: 0, color: '#b42318', fontSize: '12px', fontWeight: 800 }}>Startup Error</p>
          <h1 style={{ margin: '6px 0 10px', fontSize: '22px' }}>页面启动失败</h1>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            {this.state.error.message || '应用在初始化阶段抛出了一个未知错误。'}
          </p>
        </div>
      </div>
    );
  }
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Missing root element.');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <StartupErrorBoundary>
      <App />
    </StartupErrorBoundary>
  </React.StrictMode>
);
