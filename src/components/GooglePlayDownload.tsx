// src/components/GooglePlayDownload.tsx
// Google Play下载组件

import { useState } from 'react';
import { parseGooglePlayUrl, getAPKPureSearchUrl, GooglePlayInfo } from '../services/googlePlayService';

interface GooglePlayDownloadProps {
  onClose: () => void;
}

type DownloadState = 'idle' | 'parsing' | 'success' | 'error';

export default function GooglePlayDownload({ onClose }: GooglePlayDownloadProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [state, setState] = useState<DownloadState>('idle');
  const [playInfo, setPlayInfo] = useState<GooglePlayInfo | null>(null);
  const [searchUrl, setSearchUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 处理URL解析并自动跳转
  const handleSearch = async () => {
    if (!inputUrl.trim()) {
      setError('请输入Google Play URL、应用宝URL或包名');
      return;
    }

    setError(null);
    setState('parsing');

    try {
      // 解析Google Play URL
      const parsed = parseGooglePlayUrl(inputUrl.trim());
      if (!parsed) {
        setError('无法解析URL，请检查格式是否正确');
        setState('error');
        return;
      }

      setPlayInfo(parsed);
      
      // 构建APKPure搜索页面URL
      const apkpureSearchUrl = getAPKPureSearchUrl(parsed.packageName);
      setSearchUrl(apkpureSearchUrl);
      
      // 构建APKPure直接下载链接
      const apkpureDownloadUrl = `https://d.apkpure.com/b/XAPK/${parsed.packageName}?version=latest`;
      setDownloadUrl(apkpureDownloadUrl);
      
      // 自动在新标签页打开APKPure直接下载链接
      window.open(apkpureDownloadUrl, '_blank', 'noopener,noreferrer');
      
      setState('success');
    } catch (err) {
      console.error('解析失败:', err);
      setError(err instanceof Error ? err.message : '解析失败，请重试');
      setState('error');
    }
  };

  // 重置状态
  const handleReset = () => {
    setState('idle');
    setPlayInfo(null);
    setSearchUrl(null);
    setDownloadUrl(null);
    setError(null);
    setInputUrl('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📱 APKPure 下载</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 输入区域 */}
          <div className="form-group">
            <label htmlFor="play-url">Google Play / 应用宝 URL 或包名：</label>
            <div className="input-group">
              <input
                id="play-url"
                type="text"
                className={`form-input ${error ? 'input-error' : ''}`}
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="例如：https://play.google.com/store/apps/details?id=com.android.chrome 或 https://sj.qq.com/appdetail/com.tencent.mobileqq 或 com.android.chrome"
                disabled={state === 'parsing'}
              />
              <button
                className="button button-primary"
                onClick={handleSearch}
                disabled={state === 'parsing' || !inputUrl.trim()}
              >
                {state === 'parsing' ? '解析并跳转中...' : 'APKPure下载(海外推荐)'}
              </button>
            </div>
            <div className="hint-text" style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
              支持格式：
              <ul>
                <li>Google Play 搜索链接</li>
                <li>Google Play 应用详情链接</li>
                <li>应用宝应用详情链接</li>
                <li>直接输入包名</li>
              </ul>
            </div>
            {error && <p className="error-message">{error}</p>}
          </div>

          {/* 操作按钮 */}
          {(state === 'error' || state === 'success') && (
            <div className="form-group">
              <button className="button button-secondary" onClick={handleReset}>
                重新搜索
              </button>
            </div>
          )}

          {/* 解析信息 */}
          {playInfo && (
            <div className="form-group">
              <label>解析信息</label>
              <div className="app-store-info">
                <div className="info-row">
                  <span className="label">包名：</span>
                  <span className="value">{playInfo.packageName}</span>
                </div>
                <div className="info-row">
                  <span className="label">原始URL：</span>
                  <span className="value">{playInfo.originalUrl}</span>
                </div>
              </div>
            </div>
          )}

          {/* APKPure链接信息 */}
          {(downloadUrl || searchUrl) && (
            <div className="form-group">
              <label>APKPure 下载链接</label>
              <div className="app-store-info">
                {downloadUrl && (
                  <div className="info-row">
                    <span className="label">直接下载：</span>
                    <span className="value">
                      <a href={downloadUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none' }}>
                        {downloadUrl}
                      </a>
                    </span>
                  </div>
                )}
                {searchUrl && (
                  <div className="info-row">
                    <span className="label">手动搜索：</span>
                    <span className="value">
                      <a href={searchUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none' }}>
                        {searchUrl}
                      </a>
                    </span>
                  </div>
                )}
              </div>
              <div className="hint-text" style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
                💡 已自动打开直接下载链接，如果无法下载请点击手动搜索链接
              </div>
            </div>
          )}



          {/* 加载状态 */}
          {state === 'parsing' && (
            <div className="form-group">
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div className="loading-spinner" style={{ width: '32px', height: '32px', border: '3px solid #f3f4f6', borderTop: '3px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}></div>
                <p>正在解析URL并打开APKPure下载页面...</p>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}