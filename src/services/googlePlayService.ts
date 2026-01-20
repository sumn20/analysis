// src/services/googlePlayService.ts
// Google Play URL解析和APKPure下载服务

export interface GooglePlayInfo {
  packageName: string;
  originalUrl: string;
}

export interface APKPureSearchResult {
  title: string;
  packageName: string;
  downloadUrl: string;
  iconUrl?: string;
}

/**
 * 从Google Play URL中提取包名
 * @param url - Google Play URL
 * @returns 包名信息
 */
export function parseGooglePlayUrl(url: string): GooglePlayInfo | null {
  try {
    // 支持多种Google Play URL格式
    const patterns = [
      // https://play.google.com/store/search?q=com.purpur.ohio&c=apps&hl=zh-CN
      /[?&]q=([a-zA-Z0-9._]+)/,
      // https://play.google.com/store/apps/details?id=com.purpur.ohio
      /[?&]id=([a-zA-Z0-9._]+)/,
      // 直接包名格式
      /^([a-zA-Z0-9._]+)$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        const packageName = match[1];
        // 验证包名格式
        if (isValidPackageName(packageName)) {
          return {
            packageName,
            originalUrl: url
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('解析Google Play URL失败:', error);
    return null;
  }
}

/**
 * 验证包名格式
 * @param packageName - 包名
 * @returns 是否有效
 */
function isValidPackageName(packageName: string): boolean {
  // Android包名格式：至少包含一个点，由字母、数字、下划线组成
  const pattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
  return pattern.test(packageName);
}

/**
 * 通过包名直接构建APKPure下载页面URL并获取下载地址
 * @param packageName - 应用包名
 * @returns 下载信息
 */
export async function getAPKPureDownloadUrl(packageName: string): Promise<{
  downloadPageUrl: string;
  downloadUrl: string | null;
  error?: string;
}> {
  console.log(`🔍 直接访问APKPure下载页面: ${packageName}`);

  try {
    // 构建APKPure下载页面URL
    // 格式: https://apkpure.com/{app-name}/{package-name}/download
    // 由于我们不知道app-name，先尝试用包名的最后一部分
    const appName = packageName.split('.').pop() || packageName;
    const downloadPageUrl = `https://apkpure.com/${appName}/${packageName}/download`;
    
    console.log(`📱 尝试下载页面: ${downloadPageUrl}`);

    // 获取下载页面内容
    const downloadUrl = await fetchAPKPureDownloadUrl(downloadPageUrl);
    
    if (downloadUrl) {
      return {
        downloadPageUrl,
        downloadUrl
      };
    } else {
      // 如果直接构建的URL失败，尝试搜索方式
      console.log('🔄 直接URL失败，尝试搜索方式...');
      const searchResult = await searchAndGetDownloadUrl(packageName);
      return searchResult;
    }
  } catch (error) {
    console.error('获取APKPure下载地址失败:', error);
    return {
      downloadPageUrl: '',
      downloadUrl: null,
      error: error instanceof Error ? error.message : '获取下载地址失败'
    };
  }
}

/**
 * 通过搜索方式获取下载地址（备用方案）
 * @param packageName - 包名
 * @returns 下载信息
 */
async function searchAndGetDownloadUrl(packageName: string): Promise<{
  downloadPageUrl: string;
  downloadUrl: string | null;
  error?: string;
}> {
  try {
    // 第一步：搜索应用
    const searchResult = await searchAPKPure(packageName);
    if (!searchResult) {
      return {
        downloadPageUrl: '',
        downloadUrl: null,
        error: '未在APKPure找到该应用'
      };
    }

    console.log(`✓ 找到应用: ${searchResult.title}`);

    // 构建下载页面URL
    const downloadPageUrl = searchResult.downloadUrl.endsWith('/download') 
      ? searchResult.downloadUrl 
      : `${searchResult.downloadUrl}/download`;

    // 第二步：获取下载地址
    const downloadUrl = await fetchAPKPureDownloadUrl(downloadPageUrl);
    
    return {
      downloadPageUrl,
      downloadUrl,
      error: downloadUrl ? undefined : '无法获取下载地址'
    };
  } catch (error) {
    return {
      downloadPageUrl: '',
      downloadUrl: null,
      error: error instanceof Error ? error.message : '搜索失败'
    };
  }
}

/**
 * 从APKPure下载页面获取实际下载地址
 * @param downloadPageUrl - 下载页面URL
 * @returns 下载地址
 */
async function fetchAPKPureDownloadUrl(downloadPageUrl: string): Promise<string | null> {
  const proxyServices = [
    'https://api.allorigins.win/get?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  for (const proxy of proxyServices) {
    try {
      console.log(`🌐 使用代理获取下载页面: ${proxy}`);
      const response = await fetch(proxy + encodeURIComponent(downloadPageUrl), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        console.warn(`代理 ${proxy} 响应失败: ${response.status}`);
        continue;
      }

      let html: string;
      if (proxy.includes('allorigins')) {
        const data = await response.json();
        html = data.contents;
      } else {
        html = await response.text();
      }

      // 解析下载地址
      const downloadUrl = parseAPKPureDownloadPage(html);
      if (downloadUrl) {
        console.log(`✓ 成功获取下载地址`);
        return downloadUrl;
      }
    } catch (error) {
      console.warn(`代理 ${proxy} 请求失败:`, error);
      continue;
    }
  }

  return null;
}

/**
 * 在APKPure搜索应用
 * @param packageName - 包名
 * @returns 搜索结果
 */
async function searchAPKPure(packageName: string): Promise<APKPureSearchResult | null> {
  const searchUrl = `https://apkpure.com/search?q=${encodeURIComponent(packageName)}`;
  
  // 使用多个代理服务尝试
  const proxyServices = [
    'https://api.allorigins.win/get?url=',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest='
  ];

  for (const proxy of proxyServices) {
    try {
      console.log(`尝试代理: ${proxy}`);
      const response = await fetch(proxy + encodeURIComponent(searchUrl), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        console.warn(`代理 ${proxy} 响应失败: ${response.status}`);
        continue;
      }

      let html: string;
      if (proxy.includes('allorigins')) {
        const data = await response.json();
        html = data.contents;
      } else {
        html = await response.text();
      }

      // 解析搜索结果
      const result = parseAPKPureSearchResults(html, packageName);
      if (result) {
        return result;
      }
    } catch (error) {
      console.warn(`代理 ${proxy} 请求失败:`, error);
      continue;
    }
  }

  return null;
}

/**
 * 解析APKPure搜索结果页面
 * @param html - 页面HTML
 * @param packageName - 目标包名
 * @returns 解析结果
 */
function parseAPKPureSearchResults(html: string, packageName: string): APKPureSearchResult | null {
  try {
    // 创建临时DOM解析器
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 查找搜索结果项
    const searchItems = doc.querySelectorAll('.search-dl, .category-template, .first-info');
    
    for (const item of searchItems) {
      // 查找包含目标包名的链接
      const links = item.querySelectorAll('a[href*="' + packageName + '"]');
      
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && href.includes(packageName)) {
          // 提取应用信息
          const titleElement = link.querySelector('.p1, .title, h3') || link;
          const title = titleElement.textContent?.trim() || packageName;
          
          // 构建完整的下载页面URL
          const downloadUrl = href.startsWith('http') ? href : `https://apkpure.com${href}`;
          
          // 查找图标
          const iconElement = item.querySelector('img');
          const iconUrl = iconElement?.getAttribute('src') || iconElement?.getAttribute('data-src');

          return {
            title,
            packageName,
            downloadUrl,
            iconUrl: iconUrl ? (iconUrl.startsWith('http') ? iconUrl : `https://apkpure.com${iconUrl}`) : undefined
          };
        }
      }
    }

    // 如果没有找到精确匹配，尝试构建直接URL
    const directUrl = `https://apkpure.com/${packageName.split('.').pop()}/${packageName}`;
    return {
      title: packageName,
      packageName,
      downloadUrl: directUrl
    };
  } catch (error) {
    console.error('解析APKPure搜索结果失败:', error);
    return null;
  }
}



/**
 * 解析APKPure下载页面，提取下载地址
 * @param html - 页面HTML
 * @returns 下载地址
 */
function parseAPKPureDownloadPage(html: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 查找下载按钮或链接
    const downloadSelectors = [
      'a[href*=".xapk"]',
      'a[href*=".apk"]',
      '.download-btn[href*=".xapk"]',
      '.download-btn[href*=".apk"]',
      '#download_link',
      '.da[href*="download"]'
    ];

    for (const selector of downloadSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const href = element.getAttribute('href');
        if (href) {
          // 构建完整URL
          const downloadUrl = href.startsWith('http') ? href : `https://apkpure.com${href}`;
          console.log(`找到下载地址: ${downloadUrl}`);
          return downloadUrl;
        }
      }
    }

    // 如果没有找到直接下载链接，查找下载页面链接
    const downloadPageLink = doc.querySelector('a[href*="/download"]');
    if (downloadPageLink) {
      const href = downloadPageLink.getAttribute('href');
      if (href) {
        const downloadPageUrl = href.startsWith('http') ? href : `https://apkpure.com${href}`;
        console.log(`找到下载页面链接: ${downloadPageUrl}`);
        return downloadPageUrl;
      }
    }

    return null;
  } catch (error) {
    console.error('解析下载页面失败:', error);
    return null;
  }
}