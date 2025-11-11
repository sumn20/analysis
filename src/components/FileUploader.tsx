// src/components/FileUploader.tsx
// 文件上传组件 - 支持拖拽和点击上传，包含最近分析列表

import { useState, useRef, useEffect } from 'react';
import { AnalysisResult } from '../types';
import { useTextOverflowDetection } from '../hooks/useTextOverflowDetection';

interface RecentAnalysis {
  id: number;
  fileName: string;
  fileSize: string;
  packageName: string;
  analyzeTime: string;
  result: AnalysisResult;
}

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  recentAnalyses?: RecentAnalysis[];
  onQuickReanalyze?: (record: RecentAnalysis) => void;
  onViewHistory?: () => void;
  onDeleteRecord?: (recordId: number) => void;
  fileValidationError?: string | null;
  onValidationError?: (error: string) => void;
  deletingRecordId?: number | null;
  onSetDeletingRecordId?: (id: number | null) => void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MIN_FILE_SIZE = 1024; // 1KB

export default function FileUploader({
  onFileSelect,
  disabled = false,
  recentAnalyses = [],
  onQuickReanalyze,
  onViewHistory,
  onDeleteRecord,
  fileValidationError,
  onValidationError,
  deletingRecordId,
  onSetDeletingRecordId,
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自动检测上传区域文字是否被遮挡，并自动调整容器高度
  useTextOverflowDetection({
    containerSelector: '.upload-zone',
    textSelector: '.upload-info',
    minPaddingBottom: 20,
    minPaddingTop: 16,
    checkInterval: 500,
    adjustHeight: true,  // 启用自动高度调整
    debug: false, // 设为 true 可在控制台查看调试信息
  });

  // 当删除弹窗打开时，禁用滚动
  useEffect(() => {
    if (deletingRecordId) {
      const scrollContainer = document.querySelector('.upload-analyze-container') as HTMLElement | null;
      if (scrollContainer) {
        const originalOverflow = scrollContainer.style.overflow;
        scrollContainer.style.overflow = 'hidden';
        return () => {
          scrollContainer.style.overflow = originalOverflow;
        };
      }
    }
  }, [deletingRecordId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  // 验证并处理文件
  const validateAndProcessFile = (file: File) => {
    // 重置错误信息
    onValidationError?.('');

    // 检查文件格式（支持大小写 .apk）
    const fileExtension = file.name.toLowerCase().slice(-4);
    if (fileExtension !== '.apk') {
      const error = '请选择 APK 文件';
      onValidationError?.(error);
      return;
    }

    // 检查文件大小：太小
    if (file.size < MIN_FILE_SIZE) {
      const error = '文件太小，请选择有效的 APK 文件';
      onValidationError?.(error);
      return;
    }

    // 检查文件大小：超过限制
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      const error = `文件过大 (${sizeMB}MB)，最大支持 500MB`;
      onValidationError?.(error);
      return;
    }

    // 文件验证通过
    onFileSelect(file);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleConfirmDelete = (recordId: number) => {
    onDeleteRecord?.(recordId);
  };

  return (
    <div className="file-uploader">
      {/* 顶部蓝色条 */}
      <header className="file-uploader-header">
        <div className="header-content">
          <div>
            <h1>🔍 APK SDK 分析工具</h1>
            <p className="subtitle">快速识别 Android 应用中的 SDK 和第三方库</p>
          </div>
        </div>
      </header>

      {/* 上传区域 - 整个区域都可点击 */}
      <div
        className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="upload-content">
          <div className="upload-icon">⬆️</div>
          <h3 className="upload-title">
            {disabled ? '正在分析...' : '拖拽 APK 文件到此处'}
          </h3>
          <p className="upload-subtitle">
            或<button
              className="link-button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >点击选择文件</button>
          </p>
          <p className="upload-info">支持的文件格式: .apk | 最大文件大小: 500MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".apk"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            disabled={disabled}
          />
        </div>
      </div>

      {/* 文件验证错误提示 */}
      {fileValidationError && (
        <div className="alert alert-error">
          <span>❌</span>
          <span>{fileValidationError}</span>
        </div>
      )}

      {/* 隐私保护提示框 */}
      <div className="privacy-alert">
        <div className="alert-icon">ℹ️</div>
        <div className="alert-content">
          <h4 className="alert-title">隐私保护</h4>
          <p className="alert-text">所有分析均在浏览器本地完成，不上传任何文件或数据到服务器</p>
        </div>
      </div>

      {/* 最近分析列表 */}
      {recentAnalyses && recentAnalyses.length > 0 && (
        <div className="recent-analyses">
          <div className="recent-header">
            <h3 className="recent-title">最近分析 <span className="analysis-count">({recentAnalyses.length})</span></h3>
            {onViewHistory && (
              <button className="link-button view-all-link" onClick={onViewHistory}>
                查看全部 →
              </button>
            )}
          </div>
          <ul className="analyses-list">
            {recentAnalyses.map((record) => (
              <li key={record.id} className="analysis-item">
                <div className="item-info">
                  <div className="item-name">📱 {record.fileName}</div>
                  <div className="item-details">
                    <span className="item-package">{record.packageName}</span>
                    <span className="item-size">{record.fileSize}</span>
                    <span className="item-time">{record.analyzeTime}</span>
                  </div>
                </div>
                <div className="item-actions">
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => onQuickReanalyze?.(record)}
                  >
                    重新分析
                  </button>
                  <div className="delete-action">
                    <button
                      className="btn btn-icon btn-delete"
                      onClick={() => onSetDeletingRecordId?.(record.id)}
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
                              onClick={() => onSetDeletingRecordId?.(null)}
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
      )}

      {/* 底部说明区域 */}
      <div className="footer-info">
        <h4>为什么选择本工具？</h4>
        <ul className="info-list">
          <li>🚀 纯前端实现，无需安装其他软件，开箱即用</li>
          <li>🔒 完全离线运行，保护您的隐私和数据安全</li>
          <li>⚡ 实时分析，秒级完成复杂的 APK 解析</li>
          <li>📊 详细报告，权限、SDK、证书等完整信息</li>
        </ul>
      </div>
    </div>
  );
}
