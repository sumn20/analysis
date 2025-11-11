// src/main.tsx
// 应用入口文件

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 获取根元素
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('根元素 #root 未找到');
}

// 渲染应用
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
