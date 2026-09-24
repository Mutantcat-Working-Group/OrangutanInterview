import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#0f766e',
          colorInfo: '#0f766e',
          colorSuccess: '#4d7c0f',
          colorWarning: '#c2410c',
          colorError: '#be123c',
          colorTextBase: '#1f2a28',
          colorBgLayout: '#f4f5f2',
          borderRadius: 6,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Button: { controlHeight: 36 },
          Input: { controlHeight: 36 },
          InputNumber: { controlHeight: 36 },
          Select: { controlHeight: 36 },
          Table: { headerBg: '#eef1ed', headerColor: '#42504c' },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
