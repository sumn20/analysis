// src/components/ResultTabs.tsx
// 结果 Tab 容器

import { useState } from 'react';
import { AnalysisResult } from '../types';
import LibraryList from './LibraryList';
import XmlViewer from './XmlViewer';

interface ResultTabsProps {
  result: AnalysisResult;
  onExport: () => void;
  onReset: () => void;
}

export default function ResultTabs({ result, onExport, onReset }: ResultTabsProps) {
  const [activeTab, setActiveTab] = useState<'libraries' | 'manifest'>('libraries');

  return (
    <div className="result-tabs">
      {/* 结果头部 */}
      <div className="result-header">
        <div className="result-title">
          <h2>{result.basic.packageName}</h2>
          <p className="result-subtitle">
            版本: {result.basic.versionName} ({result.basic.versionCode})
            {' • '}
            分析时间: {new Date(result.timestamp).toLocaleString('zh-CN')}
          </p>
          {result.basic.minSdkVersion && result.basic.targetSdkVersion && (
            <p className="result-subtitle">
              SDK 版本: {result.basic.minSdkVersion} - {result.basic.targetSdkVersion}
            </p>
          )}
        </div>
      </div>

      {/* 统计卡片 - 超紧凑单行展示 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '10px 20px',
        background: 'white',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '3px',
          fontSize: '11px',
          fontWeight: '500'
        }}>
          <span style={{ opacity: 0.9 }}>识别的库</span>
          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {result.stats.total}
          </span>
        </div>

        {Object.entries(result.stats.byCategory).map(([category, count]) => {
          const lib = result.libraries.find(l => l.category === category);
          return (
            <div
              key={category}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '11px',
                fontWeight: '500'
              }}
            >
              <span style={{ opacity: 0.9 }}>
                {lib?.categoryIcon} {lib?.categoryLabel || category}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tab 导航 */}
      <div className="tabs-nav">
        <button
          className={`tab-button ${activeTab === 'libraries' ? 'active' : ''}`}
          onClick={() => setActiveTab('libraries')}
        >
          📚 SDK & 库
        </button>
        <button
          className={`tab-button ${activeTab === 'manifest' ? 'active' : ''}`}
          onClick={() => setActiveTab('manifest')}
        >
          📋 Manifest XML
        </button>
      </div>

      {/* Tab 内容 */}
      <div className="tabs-content">
        {activeTab === 'libraries' && (
          <TabPanel>
            <LibraryList
              libraries={result.libraries}
              categories={getCategoriesFromResult(result)}
            />
          </TabPanel>
        )}

        {activeTab === 'manifest' && (
          <TabPanel>
            <XmlViewer
              xmlContent={result.manifestXml}
              filename={result.basic.packageName}
            />
          </TabPanel>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="result-actions">
        <button className="btn btn-secondary" onClick={onReset}>
          ← 返回上传
        </button>
      </div>
    </div>
  );
}

// TabPanel 组件 - 用于包裹每个 Tab 的内容
function TabPanel({ children }: { children: React.ReactNode }) {
  return <div className="tab-panel">{children}</div>;
}

// 辅助函数：从结果中提取分类信息
function getCategoriesFromResult(result: AnalysisResult): Record<string, { label: string; icon: string }> {
  const categories: Record<string, { label: string; icon: string }> = {};

  result.libraries.forEach(lib => {
    if (!categories[lib.category]) {
      categories[lib.category] = {
        label: lib.categoryLabel,
        icon: lib.categoryIcon,
      };
    }
  });

  return categories;
}
