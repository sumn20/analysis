// src/components/AppStoreDownload.tsx
// 应用宝下载对话框组件

import { useState } from 'react';

interface AppStoreDownloadProps {
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

export default function AppStoreDownload({ onClose }: AppStoreDownloadProps) {
  const [appStoreUrl, setAppStoreUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appInfo, setAppInfo] = useState<AppStoreInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  // 验证应用宝链接格式或包名
  const validateAndProcessInput = (input: string): { isValid: boolean; url: string } => {
    // 检查是否是完整的应用宝链接
    const urlPattern = /^https:\/\/sj\.qq\.com\/appdetail\/[a-zA-Z0-9._]+$/;
    if (urlPattern.test(input)) {
      return { isValid: true, url: input };
    }
    
    // 检查是否是包名格式（简单判断：包含点号且不是URL）
    if (input.includes('.') && !input.startsWith('http')) {
      // 构建应用宝链接
      const url = `https://sj.qq.com/appdetail/${input}`;
      return { isValid: true, url };
    }
    
    return { isValid: false, url: '' };
  };

  // CORS 代理服务列表（已测试成功的排在前面）
  const corsProxies = [
    'https://api.allorigins.win/get?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://crossorigin.me/',
    'https://cors.bridged.cc/',
    'https://proxy.cors.sh/',
    'https://cors-proxy.htmldriven.com/p/',
    'https://cors.io/?',
    'https://api.proxify.io/?url=',
    'https://yacdn.org/proxy/',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/',
    'https://api.1forge.com/cors/?url=',
  ];

  // 单个代理请求函数
  const fetchWithProxy = async (proxy: string, url: string, index: number): Promise<string> => {
    let proxyUrl: string;
    let html: string;
    
    if (proxy.includes('allorigins')) {
      // allorigins 返回 JSON 格式
      proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`代理服务 ${index + 1} 请求失败: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.contents) {
        throw new Error(`代理服务 ${index + 1} 返回数据为空`);
      }
      html = data.contents;
    } else if (proxy.includes('codetabs') || proxy.includes('proxify')) {
      // codetabs 和 proxify 使用 quest/url 参数
      proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`代理服务 ${index + 1} 请求失败: HTTP ${response.status}`);
      }
      
      html = await response.text();
    } else if (proxy.includes('cors.io') || proxy.includes('1forge')) {
      // cors.io 和 1forge 使用 url 参数
      proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`代理服务 ${index + 1} 请求失败: HTTP ${response.status}`);
      }
      
      html = await response.text();
    } else if (proxy.includes('thingproxy')) {
      // thingproxy 直接拼接URL
      proxyUrl = `${proxy}${url}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`代理服务 ${index + 1} 请求失败: HTTP ${response.status}`);
      }
      
      html = await response.text();
    } else {
      // 其他代理直接拼接URL
      proxyUrl = `${proxy}${url}`;
      const response = await fetch(proxyUrl, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      if (!response.ok) {
        throw new Error(`代理服务 ${index + 1} 请求失败: HTTP ${response.status}`);
      }
      
      html = await response.text();
    }
    
    if (!html || html.length === 0) {
      throw new Error(`代理服务 ${index + 1} 返回空内容`);
    }
    
    console.log(`✅ 代理服务 ${index + 1} 成功返回内容`);
    return html;
  };

  // 从应用宝页面提取应用信息（使用并发 CORS 代理提升速度）
  const fetchAppInfo = async (url: string): Promise<AppStoreInfo> => {
    console.log('🚀 开始并发请求多个代理服务...');
    
    // 创建所有代理的并发请求，包装成统一的Promise格式
    const proxyPromises = corsProxies.map((proxy, index) => 
      fetchWithProxy(proxy, url, index)
        .then(html => ({ success: true, html, index }))
        .catch(error => {
          console.warn(`⚠️ 代理服务 ${index + 1} 失败:`, error);
          return { success: false, error, index };
        })
    );
    
    try {
      // 等待所有请求完成
      const results = await Promise.all(proxyPromises);
      
      // 找到第一个成功的结果
      const successResult = results.find(result => result.success);
      
      if (successResult && 'html' in successResult) {
        console.log(`🎉 代理服务 ${successResult.index + 1} 首先成功返回，开始解析页面内容`);
        return parseAppStoreHtml(successResult.html, url);
      }
      
      // 所有代理都失败了
      console.error('❌ 所有代理服务都失败了');
      throw new Error(`所有代理服务都不可用，无法访问应用宝页面。请检查网络连接或稍后重试。`);
    } catch (error) {
      console.error('❌ 请求过程中发生错误:', error);
      throw new Error(`所有代理服务都不可用，无法访问应用宝页面。请检查网络连接或稍后重试。`);
    }
  };

  // 解析应用宝 HTML 页面内容
  const parseAppStoreHtml = (html: string, url: string): AppStoreInfo => {
    
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
      setError('请输入应用宝链接或包名');
      return;
    }

    const validation = validateAndProcessInput(appStoreUrl.trim());
    if (!validation.isValid) {
      setError('请输入有效的应用宝链接或包名格式');
      return;
    }

    setLoading(true);
    setError('');
    setAppInfo(null);

    try {
      const info = await fetchAppInfo(validation.url);
      setAppInfo(info);
    } catch (err) {
      console.error('获取应用信息失败:', err);
      setError(err instanceof Error ? err.message : '获取应用信息失败，请检查输入是否正确');
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

    } catch (err) {
      console.error('下载失败:', err);
      setError('下载失败，请重试');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay">
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
          {/* 应用宝链接或包名输入 */}
          <div className="form-group">
            <label htmlFor="appstore-url">应用宝链接或包名</label>
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
                placeholder="https://sj.qq.com/appdetail/com.tencent.mobileqq 或 com.tencent.mobileqq"
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
            <div className="hint-text" style={{ marginTop: '8px', fontSize: '12px', color: '#6c757d' }}>
              💡 提示：支持输入应用宝链接或直接输入包名
              <br />
              ⚠️ 由于浏览器安全限制，使用代理服务获取数据，可能需要稍等片刻
            </div>
            {error && <p className="error-message">{error}</p>}
            <p className="hint-text">
              请输入应用宝的应用详情页链接或包名，例如：https://sj.qq.com/appdetail/com.tencent.mobileqq 或 com.tencent.mobileqq
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
              {downloading ? '下载中...' : '下载 APP'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}