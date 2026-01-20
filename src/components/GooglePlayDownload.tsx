// src/components/GooglePlayDownload.tsx
// Google Play下载组件

import { useState } from 'react';
import { parseGooglePlayUrl, getAPKPureDownloadUrl, GooglePlayInfo } from '../services/googlePlayService';

interface GooglePlayDownloadProps {
  onClose: () => void;
}

type DownloadState = 'idle' | 'parsing' | 'searching' | 'success' | 'error';

export default function GooglePlayDownload({ onClose }: GooglePlayDownloadProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [state, setState] = useState<DownloadState>('idle');
  const [playInfo, setPlayInfo] = useState<GooglePlayInfo | null>(null);
  const [downloadPageUrl, setDownloadPageUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 处理URL解析和搜索
  const handleSearch = async () => {
    if (!inputUrl.trim()) {
      setError('请输入Google Play URL或包名');
      return;
    }

    setError(null);
    setState('parsing');

    try {
      // 第一步：解析Google Play URL
      const parsed = parseGooglePlayUrl(inputUrl.trim());
      if (!parsed) {
        setError('无法解析URL，请检查格式是否正确');
        setState('error');
        return;
      }

      setPlayInfo(parsed);
      setState('searching');

      // 第二步：直接构建APKPure下载页面URL并获取下载地址
      const result = await getAPKPureDownloadUrl(parsed.packageName);
      
      if (result.error) {
        setError(result.error);
        setState('error');
        return;
      }

      if (result.downloadPageUrl && result.downloadUrl) {
        setDownloadPageUrl(result.downloadPageUrl);
        setDownloadUrl(result.downloadUrl);
        setState('success');
      } else {
        setError('无法获取下载地址');
        setState('error');
      }
    } catch (err) {
      console.error('搜索失败:', err);
      setError(err instanceof Error ? err.message : '搜索失败，请重试');
      setState('error');
    }
  };

  // 处理下载
  const handleDownload = () => {
    if (downloadUrl) {
      // 在新标签页打开下载链接
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // 重置状态
  const handleReset = () => {
    setState('idle');
    setPlayInfo(null);
    setDownloadPageUrl(null);
    setDownloadUrl(null);
    setError(null);
    setInputUrl('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content google-play-download" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📱 Google Play 应用下载</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 输入区域 */}
          <div className="input-section">
            <label htmlFor="play-url">Google Play URL 或包名：</label>
            <input
              id="play-url"
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="例如：https://play.google.com/store/search?q=com.purpur.ohio 或 com.purpur.ohio"
              className="url-input"
              disabled={state === 'parsing' || state === 'searching'}
            />
            <div className="input-help">
              支持格式：
              <ul>
                <li>Google Play 搜索链接</li>
                <li>Google Play 应用详情链接</li>
                <li>直接输入包名</li>
              </ul>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="action-buttons">
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={state === 'parsing' || state === 'searching' || !inputUrl.trim()}
            >
              {state === 'parsing' && '解析中...'}
              {state === 'searching' && '搜索中...'}
              {(state === 'idle' || state === 'error' || state === 'success') && '搜索应用'}
            </button>
            
            {(state === 'error' || state === 'success') && (
              <button className="btn btn-secondary" onClick={handleReset}>
                重新搜索
              </button>
            )}
          </div>

          {/* 解析信息 */}
          {playInfo && (
            <div className="parse-info">
              <h3>📋 解析信息</h3>
              <div className="info-item">
                <span className="info-label">包名：</span>
                <span className="info-value">{playInfo.packageName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">原始URL：</span>
                <span className="info-value">{playInfo.originalUrl}</span>
              </div>
            </div>
          )}

          {/* 下载页面信息 */}
          {downloadPageUrl && (
            <div className="download-page-info">
              <h3>🔗 下载页面</h3>
              <div className="info-item">
                <span className="info-label">APKPure页面：</span>
                <span className="info-value">
                  <a href={downloadPageUrl} target="_blank" rel="noopener noreferrer">
                    {downloadPageUrl}
                  </a>
                </span>
              </div>
            </div>
          )}

          {/* 下载区域 */}
          {state === 'success' && downloadUrl && (
            <div className="download-section">
              <h3>⬇️ 下载</h3>
              <div className="download-info">
                <p>已找到下载地址，点击下载按钮开始下载。</p>
                <button className="btn btn-success download-btn" onClick={handleDownload}>
                  📥 立即下载
                </button>
              </div>
              <div className="download-note">
                <p>💡 提示：</p>
                <ul>
                  <li>下载的文件可能是 APK 或 XAPK 格式</li>
                  <li>下载完成后可以直接上传到本工具进行分析</li>
                  <li>请确保从可信来源下载应用</li>
                </ul>
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="error-section">
              <div className="alert alert-error">
                <span>❌</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {(state === 'parsing' || state === 'searching') && (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>
                {state === 'parsing' && '正在解析URL...'}
                {state === 'searching' && '正在构建APKPure下载页面...'}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-note">
            <p>🔒 隐私说明：所有操作均通过代理服务完成，不会直接访问Google Play或APKPure</p>
          </div>
        </div>
      </div>
    </div>
  );
}