// src/components/AnalysisProgress.tsx
// 进度展示组件

import { useState, useEffect } from 'react';
import { AnalysisProgress } from '../types';

interface AnalysisProgressProps {
  progress: AnalysisProgress;
}

export default function AnalysisProgressComponent({ progress }: AnalysisProgressProps) {
  // 计时器状态 - 用于显示已耗时间
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // 使用 useEffect 实现实时计时
  useEffect(() => {
    // 设置定时器,每 100ms 更新一次已耗时间(平衡性能和精度)
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime; // 保存为毫秒
      setElapsedTime(elapsed);
    }, 100); // 优化: 从50ms改为100ms,减少CPU占用

    // 清理定时器
    return () => clearInterval(timer);
  }, [startTime]);

  // 格式化时间为 "MM:SS.mmm" 格式(包含毫秒)
  function formatTime(milliseconds: number) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const ms = milliseconds % 1000;
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  return (
    <div className="analysis-progress">
      <div className="progress-header">
        <div className="progress-header-top">
          <h2>分析进行中...</h2>
          <div className="first-time-tip">
            💡 首次分析会较慢,请耐心等待...
          </div>
        </div>
        <p className="progress-message">{progress.message || '准备分析...'}</p>
        {/* 已耗时间统计 */}
        <div className="elapsed-time-display">
          ⏱️ 已进行中 <span className="elapsed-time-value">{formatTime(elapsedTime)}</span>
        </div>
      </div>

      {/* 总体进度条 */}
      <div className="progress-section">
        <div className="progress-label">总体进度</div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress.progress || 0}%` }}
          />
        </div>
        <div className="progress-percent">{progress.progress || 0}%</div>
      </div>

      {/* 详细步骤 */}
      <div className="progress-steps">
        <div className="steps-label">分析步骤详情</div>
        <div className={`step ${progress.stage === 'extracting' ? 'active' : ''}`}>
          <span className="step-icon">{progress.stage === 'extracting' ? '→' : progress.progress > 10 ? '✓' : '○'}</span>
          <span className="step-name">提取 APK 文件</span>
          <span className="step-status">{progress.stage === 'extracting' ? '处理中...' : progress.progress > 10 ? '完成' : '等待中...'}</span>
        </div>
        <div className={`step ${progress.stage === 'parsing' ? 'active' : ''}`}>
          <span className="step-icon">{progress.stage === 'parsing' ? '→' : progress.progress > 30 ? '✓' : '○'}</span>
          <span className="step-name">解析 AndroidManifest</span>
          <span className="step-status">{progress.stage === 'parsing' ? '处理中...' : progress.progress > 30 ? '完成' : '等待中...'}</span>
        </div>
        <div className={`step ${progress.stage === 'scanning' ? 'active' : ''}`}>
          <span className="step-icon">{progress.stage === 'scanning' ? '→' : progress.progress > 50 ? '✓' : '○'}</span>
          <span className="step-name">扫描 SDK 库</span>
          <span className="step-status">{progress.stage === 'scanning' ? '处理中...' : progress.progress > 50 ? '完成' : '等待中...'}</span>
        </div>
        <div className={`step ${progress.stage === 'matching' ? 'active' : ''}`}>
          <span className="step-icon">{progress.stage === 'matching' ? '→' : progress.progress > 80 ? '✓' : '○'}</span>
          <span className="step-name">匹配规则库</span>
          <span className="step-status">{progress.stage === 'matching' ? '处理中...' : progress.progress > 80 ? '完成' : '等待中...'}</span>
        </div>
      </div>

      <div className="progress-info">
        <p>此过程可能需要 10-30 秒,请耐心等待...</p>
      </div>
    </div>
  );
}
