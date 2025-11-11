// src/components/ReportExport.tsx
// 报告导出对话框组件

import { useState } from 'react';
import { AnalysisResult } from '../types';
import { exportReport } from '../utils/reportGenerator';

interface ReportExportProps {
  result: AnalysisResult;
  onClose: () => void;
}

export default function ReportExport({ result, onClose }: ReportExportProps) {
  // 默认文件名：包名 + 时间戳
  const defaultFilename = `${result.basic.packageName.replace(/\./g, '_')}_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  const [filename, setFilename] = useState(defaultFilename);
  const [format, setFormat] = useState<'html' | 'json'>('html');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);
  const [prettyPrint, setPrettyPrint] = useState(true);

  // 处理导出
  const handleExport = () => {
    try {
      exportReport(result, {
        format,
        filename: filename || defaultFilename,
        includeTimestamp,
        prettyPrint: format === 'json' ? prettyPrint : true,
      });
      onClose();
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  // 点击遮罩层关闭
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="modal-header">
          <h2>📊 导出报告</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 表单内容 */}
        <div className="modal-body">
          {/* 文件名 */}
          <div className="form-group">
            <label htmlFor="filename">文件名</label>
            <input
              id="filename"
              type="text"
              className="form-input"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="请输入文件名"
            />
          </div>

          {/* 导出格式 */}
          <div className="form-group">
            <label>导出格式</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="format"
                  value="html"
                  checked={format === 'html'}
                  onChange={(e) => setFormat(e.target.value as 'html')}
                />
                <span>HTML (完整报告 + 样式)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as 'json')}
                />
                <span>JSON (原始数据)</span>
              </label>
            </div>
          </div>

          {/* 选项 */}
          <div className="form-group">
            <label>选项</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeTimestamp}
                  onChange={(e) => setIncludeTimestamp(e.target.checked)}
                />
                <span>包含时间戳</span>
              </label>
              {format === 'json' && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={prettyPrint}
                    onChange={(e) => setPrettyPrint(e.target.checked)}
                  />
                  <span>美化输出</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            取消
          </button>
          <button className="button" onClick={handleExport}>
            导出
          </button>
        </div>
      </div>
    </div>
  );
}
