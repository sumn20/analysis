// src/components/AppStoreDownload.tsx
// 应用宝下载对话框组件

import { useState } from 'react';
import { AnalysisResult } from '../types';

interface AppStoreDownloadProps {
  result: AnalysisResult;
  onClose: () => void;
}

interface AppStoreInfo {
  name: string;
  package: string;
  version: string;
  md5: string;
  downloadUrl: string;
  detailUrl: string;
  developer: string;
  downloads: string;
  tags: string;
}

export default function AppStoreDownload({ result, onClose }: AppStoreDownloadProps) {
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appInfo, setAppInfo] = useState<AppStoreInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  // 验证应用宝链接格式
  const validateAppStoreUrl = (url: string): boolean => {
    const pattern = /^https:\/\/sj\.qq\.com\/appdetail\/[a-zA-Z0-9._]+$/;
    return pattern.test(url);
  };

  // 从应用宝页面提取应用信息（基于你的 Python 代码逻辑）
  const fetchAppInfo = async (url: string): Promise<AppStoreInfo> => {
    const response = await fetch(url, {
      mode: 'cors',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    
    // 使用 DOMParser 解析 HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 提取应用名称
    const nameElement = doc.querySelector('h1.GameCard_name___MG5g');
    const name = nameElement?.textContent?.trim() || '未知应用';

    // 提取包名（从 URL）
    const packageName = url.split('/').pop() || '';

    // 提取标签
    const tagElement = doc.querySelector('a.TagList_tagName__Gf5n2.TagList_tagName-0__frHI7');
    const tags = tagElement?.textContent?.trim() || '';

    // 提取下载量
    const downloadsElement = doc.querySelector('p.GameCard_starDownloadNumber__ch88u');
    const downloads = downloadsElement?.textContent?.trim() || '';

    // 提取开发者信息
    let developer = '未知开发者';
    const devInfoElement = doc.querySelector('div.AppInfo_info__kxhxQ');
    if (devInfoElement) {
      const pTags = devInfoElement.querySelectorAll('p');
      for (let i = 0; i < pTags.length - 1; i++) {
        if (pTags[i].textContent?.trim() === '开发者：') {
          developer = pTags[i + 1].textContent?.trim() || '未知开发者';
          break;
        }
      }
    }

    // 提取 JSON 数据（包含版本号和 MD5）
    const scriptElement = doc.querySelector('script#__NEXT_DATA__');
    if (!scriptElement?.textContent) {
      throw new Error('无法找到应用详细信息');
    }

    const jsonData = JSON.parse(scriptElement.textContent);
    const appData = jsonData.props?.pageProps?.dynamicCardResponse?.data?.components?.[1]?.data?.itemData?.[0];
    
    if (!appData) {
      throw new Error('无法解析应用信息');
    }

    const version = appData.version_name || '';
    const md5 = appData.md_5 || '';

    if (!version || !md5) {
      throw new Error('无法获取版本号或 MD5');
    }

    // 构建下载链接（基于你的 Python 代码逻辑）
    const downloadUrl = `https://imtt2.dd.qq.com/sjy.00008/sjy.00004/16891/apk/${md5}.apk?fsname=${packageName}_${version}.apk`;

    return {
      name,
      package: packageName,
      version,
      md5,
      downloadUrl,
      detailUrl: url,
      developer,
      downloads,
      tags
    };
  };

  // 处理获取应用信息
  const handleFetchInfo = async () => {
    if (!appStoreUrl.trim()) {
      setError('请输入应用宝链接');
      return;
    }

    if (!validateAppStoreUrl(appStoreUrl.trim())) {
      setError('请输入有效的应用宝链接格式：https://sj.qq.com/appdetail/包名');
      return;
    }

    setLoading(true);
    setError('');
    setAppInfo(null);

    try {
      const info = await fetchAppInfo(appStoreUrl.trim());
      setAppInfo(info);
    } catch (err) {
      console.error('获取应用信息失败:', err);
      setError(err instanceof Error ? err.message : '获取应用信息失败，请检查链接是否正确');
    } finally {
      setLoading(false);
    }
  };

  // 处理下载 APK
  const handleDownload = async () => {
    if (!appInfo) return;

    setDownloading(true);
    try {
      // 创建下载链接
      const link = document.createElement('a');
      link.href = appInfo.downloadUrl;
      link.download = `${appInfo.package}_${appInfo.version}.apk`;
      link.target = '_blank';
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 显示成功提示
      alert(`开始下载 ${appInfo.name} v${appInfo.version}`);
    } catch (err) {
      console.error('下载失败:', err);
      setError('下载失败，请重试');
    } finally {
      setDownloading(false);
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
          <h2>📱 应用宝下载</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 表单内容 */}
        <div className="modal-body">
          {/* 当前应用信息 */}
          <div className="form-group">
            <label>当前分析的应用</label>
            <div className="app-info-card">
              <div className="app-info-item">
                <span className="label">应用名称:</span>
                <span className="value">未知</span>
              </div>
              <div className="app-info-item">
                <span className="label">包名:</span>
                <span className="value">{result.basic.packageName}</span>
              </div>
              <div className="app-info-item">
                <span className="label">版本:</span>
                <span className="value">{result.basic.versionName} ({result.basic.versionCode})</span>
              </div>
            </div>
          </div>

          {/* 应用宝链接输入 */}
          <div className="form-group">
            <label htmlFor="appstore-url">应用宝链接</label>
            <div className="input-group">
              <input
                id="appstore-url"
                type="text"
                className={`form-input ${error ? 'input-error' : ''}`}
                value={appStoreUrl}
                onChange={(e) => {
                  setAppStoreUrl(e.target.value);
                  setError('');
                }}
                placeholder="https://sj.qq.com/appdetail/com.tencent.mobileqq"
                disabled={loading}
              />
              <button 
                className="button button-primary"
                onClick={handleFetchInfo}
                disabled={loading || !appStoreUrl.trim()}
              >
                {loading ? '获取中...' : '获取信息'}
              </button>
            </div>
            {error && <p className="error-message">{error}</p>}
            <p className="hint-text">
              请输入应用宝的应用详情页链接，例如：https://sj.qq.com/appdetail/com.tencent.mobileqq
            </p>
          </div>

          {/* 应用信息显示 */}
          {appInfo && (
            <div className="form-group">
              <label>应用信息</label>
              <div className="app-store-info">
                <div className="info-row">
                  <span className="label">应用名称:</span>
                  <span className="value">{appInfo.name}</span>
                </div>
                <div className="info-row">
                  <span className="label">包名:</span>
                  <span className="value">{appInfo.package}</span>
                </div>
                <div className="info-row">
                  <span className="label">版本:</span>
                  <span className="value">{appInfo.version}</span>
                </div>
                <div className="info-row">
                  <span className="label">开发者:</span>
                  <span className="value">{appInfo.developer}</span>
                </div>
                <div className="info-row">
                  <span className="label">下载量:</span>
                  <span className="value">{appInfo.downloads}</span>
                </div>
                <div className="info-row">
                  <span className="label">标签:</span>
                  <span className="value">{appInfo.tags}</span>
                </div>
                <div className="info-row">
                  <span className="label">MD5:</span>
                  <span className="value" style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
                    {appInfo.md5}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="modal-footer">
          <button className="button button-secondary" onClick={onClose}>
            关闭
          </button>
          {appInfo && (
            <button 
              className="button button-primary"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? '下载中...' : '下载 APK'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}