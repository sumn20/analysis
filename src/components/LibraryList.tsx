// src/components/LibraryList.tsx
// SDK 库列表组件 - 分类导航 + 展开/折叠

import { useState } from 'react';
import { Library } from '../types';

interface LibraryListProps {
  libraries: Library[];
  categories: Record<string, { label: string; icon: string }>;
}

export default function LibraryList({ libraries, categories }: LibraryListProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedLibs, setExpandedLibs] = useState<Record<string, boolean>>({});

  // 按分类分组库
  const categorized: Record<string, Library[]> = {};
  const categoryMetadata: Record<string, { label: string; icon: string; description?: string }> = {};

  (libraries || []).forEach((lib) => {
    const cat = lib.category || 'unknown';
    if (!categorized[cat]) {
      categorized[cat] = [];
      // 保存分类的元信息（从第一个库中获取）
      categoryMetadata[cat] = {
        label: lib.categoryLabel || '其他',
        icon: lib.categoryIcon || '📦',
        description: '',
      };
    }
    categorized[cat].push(lib);
  });

  // 获取当前分类的库列表
  const currentLibs = activeCategory === 'all'
    ? (libraries || [])
    : (categorized[activeCategory] || []);

  // 统计总数
  const stats = {
    total: libraries?.length || 0,
  };

  // 切换展开/折叠
  function toggleExpand(libId: string) {
    setExpandedLibs((prev) => ({
      ...prev,
      [libId]: !prev[libId],
    }));
  }

  return (
    <div className="library-list">
      {/* SDK分类 Sub-Tab 导航 */}
      <div className="sdk-category-tabs">
        <button
          className={`sdk-category-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
          title="显示所有SDK"
        >
          全部 ({stats?.total || 0})
        </button>
        {Object.entries(categorized)
          .sort(([keyA], [keyB]) => {
            // 保持other在最后
            if (keyA === 'other') return 1;
            if (keyB === 'other') return -1;
            return keyA.localeCompare(keyB);
          })
          .map(([category, libs]) => {
            const metadata = categoryMetadata[category] || { label: '其他', icon: '📦' };
            return (
              <button
                key={category}
                className={`sdk-category-btn ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
                title={`${metadata.label}SDK`}
              >
                <span className="category-btn-icon">{metadata.icon}</span>
                <span className="category-btn-label">{metadata.label}</span>
                <span className="category-btn-count">({libs.length})</span>
              </button>
            );
          })}
      </div>

      {/* SDK列表内容 */}
      <div className="libraries-list-container">
        {currentLibs && currentLibs.length > 0 ? (
          <div className="libraries-grid">
            {currentLibs
              .filter(lib => lib != null)
              .map((lib) => (
              <div
                key={lib?.id || lib?.uuid || `lib-${lib?.name}`}
                className={`library-item ${expandedLibs[lib?.id] ? 'expanded' : ''}`}
              >
                <div
                  className="lib-header"
                  onClick={() => toggleExpand(lib?.id)}
                >
                  <span className="expand-icon">
                    {expandedLibs[lib?.id] ? '▼' : '▶'}
                  </span>

                  {/* 分类图标 */}
                  <span className="lib-category-icon">{lib?.categoryIcon || '📦'}</span>

                  <span className="lib-name">
                    {/* 显示缺少元数据的标记 */}
                    {!lib?.hasMetadata && (
                      <span className="metadata-badge" title="此库没有匹配到开发者信息">❓</span>
                    )}
                    {lib?.name || 'Unknown'}
                    {lib?.developer && lib?.developer?.trim() !== '' && (
                      <span className="lib-developer">（{lib?.developer}）</span>
                    )}
                  </span>

                  <span className="lib-label">| {lib?.label || 'Unknown'}</span>
                  <span className="lib-count">[检出 {lib?.count || 0}x]</span>
                </div>

                {expandedLibs[lib?.id] && (
                  <div className="lib-details">
                    {/* 功能描述（同行显示） */}
                    {lib?.description && (
                      <div className="detail-row info-line">
                        <span className="detail-label">功能</span>
                        <span className="detail-value">{lib?.description}</span>
                      </div>
                    )}

                    {/* 编译架构（同行显示） */}
                    <div className="detail-row info-line">
                      <span className="detail-label">编译架构</span>
                      <span className="detail-value">
                        {lib?.architectures ? lib?.architectures.join(', ') : 'N/A'}
                      </span>
                    </div>

                    {/* 官网链接（同行显示） */}
                    {lib?.sourceLink && (
                      <div className="detail-row info-line">
                        <span className="detail-label">官网</span>
                        <a href={lib?.sourceLink} target="_blank" rel="noopener noreferrer" className="detail-link">
                          {lib?.sourceLink}
                        </a>
                      </div>
                    )}

                    {/* 检测位置（特殊分组处理） */}
                    {lib?.locations && lib?.locations?.length > 0 && (
                      <div className="detail-row location-group">
                        <span className="detail-label">检测位置</span>
                        <div className="locations-list">
                          {lib?.locations?.map((loc, idx) => (
                            <div key={idx} className="location-item">
                              {loc}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-items-message">
            <p>此分类无SDK检出</p>
          </div>
        )}
      </div>

      {(!libraries || libraries.length === 0) && (
        <div className="no-items-message">
          <p>未检测到任何库</p>
        </div>
      )}
    </div>
  );
}
