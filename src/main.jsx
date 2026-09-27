// OrangutanInterview — 由异猫工作群（mutantcat.org）发行
// GitHub: https://github.com/Mutantcat-Working-Group
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
          colorPrimary: '#c2410c',
          colorInfo: '#3d6472',
          colorSuccess: '#4d7c0f',
          colorWarning: '#d97706',
          colorError: '#be123c',
          colorTextBase: '#211d17',
          colorBgLayout: '#f5f3ee',
          borderRadius: 6,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Button: { controlHeight: 36 },
          Input: { controlHeight: 36 },
          InputNumber: { controlHeight: 36 },
          Select: { controlHeight: 36 },
          Table: { headerBg: '#faf8f4', headerColor: '#5c554a', borderColor: '#e6e1d6' },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
