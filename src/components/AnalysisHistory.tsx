// src/components/AnalysisHistory.tsx
// 分析历史页面 - 支持搜索、排序、删除等功能

import { useState, useMemo } from 'react';
import { AnalysisResult } from '../types';

interface RecentAnalysis {
  id: number;
  fileName: string;
  fileSize: string;
  packageName: string;
  analyzeTime: string;
  result: AnalysisResult;
}

interface AnalysisHistoryProps {
  recentAnalyses: RecentAnalysis[];
  onQuickReanalyze: (record: RecentAnalysis) => void;
  onBackToUpload: () => void;
  onDeleteRecord: (recordId: number) => void;
  onClearAllHistory: () => void;
}

export default function AnalysisHistory({
  recentAnalyses,
  onQuickReanalyze,
  onBackToUpload,
  onDeleteRecord,
  onClearAllHistory,
}: AnalysisHistoryProps) {
  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState('');
  // 删除确认弹窗状态
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
  // 清除所有历史确认状态
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // 排序方式
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, name-asc, size-desc

  // 筛选和排序后的分析记录
  const filteredAndSortedAnalyses = useMemo(() => {
    // 1. 搜索过滤
    let results = recentAnalyses.filter(record => {
      const searchLower = searchKeyword.toLowerCase();
      return (
        record.fileName.toLowerCase().includes(searchLower) ||
        record.packageName.toLowerCase().includes(searchLower)
      );
    });

    // 2. 排序
    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.analyzeTime).getTime() - new Date(a.analyzeTime).getTime();
        case 'date-asc':
          return new Date(a.analyzeTime).getTime() - new Date(b.analyzeTime).getTime();
        case 'name-asc':
          return a.fileName.localeCompare(b.fileName);
        case 'size-desc':
          // 提取大小数字进行比较
          const sizeA = parseInt(a.fileSize) || 0;
          const sizeB = parseInt(b.fileSize) || 0;
          return sizeB - sizeA;
        default:
          return 0;
      }
    });

    return results;
  }, [recentAnalyses, searchKeyword, sortBy]);

  // 按日期分组
  const groupedByDate = useMemo(() => {
    const groups: Record<string, RecentAnalysis[]> = {};

    filteredAndSortedAnalyses.forEach(record => {
      // 提取分析日期（不含时间）
      const dateStr = record.analyzeTime.split(' ')[0];
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(record);
    });

    // 按日期倒序排列
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .reduce((acc, [date, records]) => {
        acc[date] = records;
        return acc;
      }, {} as Record<string, RecentAnalysis[]>);
  }, [filteredAndSortedAnalyses]);

  // 统计数据
  const stats = {
    total: recentAnalyses.length,
    today: recentAnalyses.filter(r => {
      const today = new Date().toLocaleDateString('zh-CN');
      const recordDate = r.analyzeTime.split(' ')[0];
      return recordDate === today;
    }).length,
    thisWeek: recentAnalyses.filter(r => {
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recordDate = new Date(r.analyzeTime);
      return recordDate >= weekAgo;
    }).length,
  };

  // 处理删除记录
  const handleConfirmDelete = (recordId: number) => {
    onDeleteRecord(recordId);
    setDeletingRecordId(null);
  };

  // 处理清除所有历史
  const handleConfirmClear = () => {
    onClearAllHistory();
    setShowClearConfirm(false);
  };

  return (
    <div className="analysis-history">
      {/* 返回按钮和清除操作 */}
      <div className="history-header">
        <div className="header-left">
          <button className="btn btn-back" onClick={onBackToUpload}>
            ← 返回上传
          </button>
        </div>
        <div className="header-right">
          <div className="clear-action">
            <button
              className="btn btn-sm btn-danger"
              onClick={() => setShowClearConfirm(true)}
              disabled={recentAnalyses.length === 0}
              title="清除所有分析历史"
            >
              清除历史
            </button>
            {showClearConfirm && (
              <div className="delete-popup-wrapper">
                <div className="delete-popup-content">
                  <p>确定清除所有分析历史？此操作不可撤销。</p>
                  <div className="confirm-buttons">
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={handleConfirmClear}
                    >
                      清除全部
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowClearConfirm(false)}
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 统计摘要卡片 */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">总分析数</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-label">今日分析</div>
            <div className="stat-value">{stats.today}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-label">本周分析</div>
            <div className="stat-value">{stats.thisWeek}</div>
          </div>
        </div>
      </div>

      {/* 搜索和筛选工具栏 */}
      <div className="history-toolbar">
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="搜索应用名或包名..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="sort-box">
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date-desc">最新优先</option>
            <option value="date-asc">最旧优先</option>
            <option value="name-asc">按名称排序</option>
            <option value="size-desc">按大小排序</option>
          </select>
        </div>
      </div>

      {/* 分析历史列表 */}
      <div className="history-content">
        {Object.keys(groupedByDate).length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>暂无分析记录</h3>
            <p>上传 APK 或 XAPK 文件开始分析吧！</p>
          </div>
        ) : (
          Object.entries(groupedByDate).map(([dateStr, records]) => (
            <div key={dateStr} className="date-group">
              <div className="date-header">
                <h3 className="date-label">📆 {dateStr}</h3>
                <span className="record-count">{records.length} 条记录</span>
              </div>

              <ul className="history-list">
                {records.map((record) => (
                  <li key={record.id} className="history-item">
                    <div className="item-icon">📱</div>
                    <div className="item-main">
                      <div className="item-name">{record.fileName}</div>
                      <div className="item-meta">
                        <span className="meta-package">{record.packageName}</span>
                        <span className="meta-size">{record.fileSize}</span>
                        <span className="meta-time">{record.analyzeTime.split(' ')[1]}</span>
                      </div>
                    </div>
                    <div className="item-actions">
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => onQuickReanalyze(record)}
                        title="查看此 APK 的分析结果"
                      >
                        查看结果
                      </button>
                      <div className="delete-action">
                        <button
                          className="btn btn-icon btn-delete"
                          onClick={() => setDeletingRecordId(record.id)}
                          title="删除此记录"
                        >
                          🗑️
                        </button>
                        {deletingRecordId === record.id && (
                          <div className="delete-popup-wrapper">
                            <div className="delete-popup-content">
                              <p>确定删除此记录？</p>
                              <div className="confirm-delete-info">
                                <div className="delete-info-item">
                                  <span className="info-label">文件名：</span>
                                  <span className="info-value">{record.fileName}</span>
                                </div>
                                <div className="delete-info-item">
                                  <span className="info-label">包名：</span>
                                  <span className="info-value">{record.packageName}</span>
                                </div>
                              </div>
                              <div className="confirm-buttons">
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleConfirmDelete(record.id)}
                                >
                                  删除
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setDeletingRecordId(null)}
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
