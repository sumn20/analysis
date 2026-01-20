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
  const [error, setError] = useState<string | null>(null);

  // 处理URL解析并自动跳转
  const handleSearch = async () => {
    if (!inputUrl.trim()) {
      setError('请输入Google Play URL或包名');
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
      
      // 构建APKPure搜索页面URL并自动打开
      const apkpureSearchUrl = getAPKPureSearchUrl(parsed.packageName);
      setSearchUrl(apkpureSearchUrl);
      
      // 自动在新标签页打开APKPure搜索页面
      window.open(apkpureSearchUrl, '_blank', 'noopener,noreferrer');
      
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
              disabled={state === 'parsing'}
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
              disabled={state === 'parsing' || !inputUrl.trim()}
            >
              {state === 'parsing' && '解析并跳转中...'}
              {(state === 'idle' || state === 'error' || state === 'success') && '解析并自动跳转'}
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

          {/* APKPure搜索页面信息 */}
          {searchUrl && (
            <div className="search-page-info">
              <h3>🔗 APKPure搜索页面</h3>
              <div className="info-item">
                <span className="info-label">搜索页面：</span>
                <span className="info-value">
                  <a href={searchUrl} target="_blank" rel="noopener noreferrer">
                    {searchUrl}
                  </a>
                </span>
              </div>
            </div>
          )}

          {/* 成功跳转提示 */}
          {state === 'success' && searchUrl && (
            <div className="success-section">
              <h3>✅ 跳转成功</h3>
              <div className="success-info">
                <p>已自动在新标签页打开APKPure搜索页面。</p>
                <p>如果页面没有自动打开，请点击下面的链接：</p>
                <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="search-link">
                  🔗 手动打开APKPure搜索页面
                </a>
              </div>
              <div className="success-note">
                <p>💡 接下来：</p>
                <ul>
                  <li>在APKPure搜索结果中找到对应的应用</li>
                  <li>下载APK或XAPK文件</li>
                  <li>将下载的文件上传到本工具进行分析</li>
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
          {state === 'parsing' && (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>正在解析URL并打开APKPure搜索页面...</p>
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