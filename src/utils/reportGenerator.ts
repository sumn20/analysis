// src/utils/reportGenerator.ts
// 报告生成器 - 生成 HTML 和 JSON 格式的分析报告

import { AnalysisResult, ExportOptions } from '../types';

/**
 * 导出分析报告
 * @param result - 分析结果
 * @param options - 导出选项
 */
export function exportReport(result: AnalysisResult, options: ExportOptions): void {
  if (options.format === 'html') {
    exportHtmlReport(result, options);
  } else if (options.format === 'json') {
    exportJsonReport(result, options);
  }
}

/**
 * 导出 HTML 报告
 */
function exportHtmlReport(result: AnalysisResult, options: ExportOptions): void {
  const html = generateHtmlReport(result);
  const filename = options.includeTimestamp
    ? `${options.filename}_${formatTimestamp(result.timestamp)}.html`
    : `${options.filename}.html`;

  downloadFile(html, filename, 'text/html');
}

/**
 * 导出 JSON 报告
 */
function exportJsonReport(result: AnalysisResult, options: ExportOptions): void {
  // 创建副本并移除 manifestXml 字段
  const reportData = {
    ...result,
    manifestXml: undefined, // 不包含完整的 XML 内容
  };

  const json = options.prettyPrint
    ? JSON.stringify(reportData, null, 2)
    : JSON.stringify(reportData);

  const filename = options.includeTimestamp
    ? `${options.filename}_${formatTimestamp(result.timestamp)}.json`
    : `${options.filename}.json`;

  downloadFile(json, filename, 'application/json');
}

/**
 * 生成 HTML 报告
 */
function generateHtmlReport(result: AnalysisResult): string {
  const { basic, libraries, stats, timestamp } = result;

  // 按分类分组库
  const librariesByCategory: Record<string, typeof libraries> = {};
  libraries.forEach(lib => {
    if (!librariesByCategory[lib.category]) {
      librariesByCategory[lib.category] = [];
    }
    librariesByCategory[lib.category].push(lib);
  });

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APK 分析报告 - ${basic.packageName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 30px;
    }

    h1 {
      font-size: 28px;
      color: #1a1a1a;
      margin-bottom: 10px;
      border-bottom: 3px solid #007aff;
      padding-bottom: 10px;
    }

    h2 {
      font-size: 22px;
      color: #333;
      margin-top: 30px;
      margin-bottom: 15px;
      border-left: 4px solid #007aff;
      padding-left: 12px;
    }

    h3 {
      font-size: 18px;
      color: #555;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    .meta-info {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 20px;
    }

    .meta-info p {
      margin: 5px 0;
      font-size: 14px;
    }

    .meta-info strong {
      color: #007aff;
      min-width: 120px;
      display: inline-block;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }

    .stat-card h3 {
      color: white;
      margin: 0;
      font-size: 16px;
      opacity: 0.9;
    }

    .stat-card .number {
      font-size: 36px;
      font-weight: bold;
      margin-top: 10px;
    }

    .library-section {
      margin: 30px 0;
    }

    .library-item {
      background: #f8f9fa;
      border-left: 4px solid #007aff;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }

    .library-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .library-icon {
      font-size: 24px;
    }

    .library-name {
      font-size: 16px;
      font-weight: bold;
      color: #1a1a1a;
    }

    .library-label {
      font-size: 14px;
      color: #666;
    }

    .library-badge {
      background: #007aff;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin-left: auto;
    }

    .library-details {
      margin-top: 10px;
      font-size: 14px;
      color: #555;
    }

    .library-details p {
      margin: 5px 0;
    }

    .library-details a {
      color: #007aff;
      text-decoration: none;
    }

    .library-details a:hover {
      text-decoration: underline;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      color: #999;
      font-size: 14px;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 APK 分析报告</h1>

    <div class="meta-info">
      <p><strong>包名:</strong> ${basic.packageName}</p>
      <p><strong>版本:</strong> ${basic.versionName} (${basic.versionCode})</p>
      ${basic.minSdkVersion ? `<p><strong>最小 SDK 版本:</strong> ${basic.minSdkVersion}</p>` : ''}
      ${basic.targetSdkVersion ? `<p><strong>目标 SDK 版本:</strong> ${basic.targetSdkVersion}</p>` : ''}
      <p><strong>分析时间:</strong> ${formatDateTime(timestamp)}</p>
    </div>

    <h2>📊 统计信息</h2>
    <div class="stats">
      <div class="stat-card">
        <h3>识别的库</h3>
        <div class="number">${stats.total}</div>
      </div>
      ${Object.entries(stats.byCategory).map(([category, count]) => `
        <div class="stat-card">
          <h3>${getCategoryLabel(category, result)}</h3>
          <div class="number">${count}</div>
        </div>
      `).join('')}
    </div>

    <h2>📚 SDK 库列表</h2>
    ${Object.entries(librariesByCategory).map(([category, libs]) => `
      <div class="library-section">
        <h3>${getCategoryIcon(category, result)} ${getCategoryLabel(category, result)} (${libs.length})</h3>
        ${libs.map(lib => `
          <div class="library-item">
            <div class="library-header">
              <span class="library-icon">${lib.categoryIcon}</span>
              <div>
                <div class="library-name">${lib.label}</div>
                <div class="library-label">${lib.name}</div>
              </div>
              ${lib.count ? `<span class="library-badge">检出 ${lib.count}x</span>` : ''}
            </div>
            ${lib.hasMetadata ? `
              <div class="library-details">
                ${lib.description ? `<p><strong>功能:</strong> ${lib.description}</p>` : ''}
                ${lib.developer ? `<p><strong>开发者:</strong> ${lib.developer}</p>` : ''}
                ${lib.architectures && lib.architectures.length > 0 ? `<p><strong>架构:</strong> ${lib.architectures.join(', ')}</p>` : ''}
                ${lib.sourceLink ? `<p><strong>官网:</strong> <a href="${lib.sourceLink}" target="_blank">${lib.sourceLink}</a></p>` : ''}
                ${lib.locations && lib.locations.length > 0 ? `<p><strong>检测位置:</strong><br>${lib.locations.map(loc => `&nbsp;&nbsp;• ${loc}`).join('<br>')}</p>` : ''}
              </div>
            ` : '<div class="library-details"><p>未识别的库（无元数据）</p></div>'}
          </div>
        `).join('')}
      </div>
    `).join('')}

    <div class="footer">
      <p>本报告由 APK SDK 分析工具生成 | ${formatDateTime(timestamp)}</p>
      <p style="margin-top: 10px; color: #bbb;">提示: 导出报告不包含完整的 AndroidManifest.xml 内容,如需查看请在应用内切换到 Manifest XML 标签页</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * 下载文件
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 获取分类标签
 */
function getCategoryLabel(category: string, result: AnalysisResult): string {
  const lib = result.libraries.find(l => l.category === category);
  return lib?.categoryLabel || category;
}

/**
 * 获取分类图标
 */
function getCategoryIcon(category: string, result: AnalysisResult): string {
  const lib = result.libraries.find(l => l.category === category);
  return lib?.categoryIcon || '📦';
}

/**
 * 转义 HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
