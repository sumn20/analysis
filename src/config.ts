/**
 * 应用配置管理
 * 从 public/config.json 加载配置项
 */

export interface AppConfig {
  // 应用基本信息
  app: {
    name: string;
    description: string;
    version: string;
  };

  // 页脚配置
  footer: {
    // GitHub 项目地址
    projectUrl: string;
    projectLabel: string;

    // ICP 备案信息
    icp?: {
      enabled: boolean;
      number: string;
      url: string;
      label: string;
    };

    // 其他链接
    links?: Array<{
      label: string;
      url: string;
      icon?: string;
    }>;

    // 版权信息
    copyright?: string;
  };

  // SDK 规则库配置
  rules?: {
    bundleUrl?: string;
    updateCheckInterval?: number; // 毫秒
  };
}

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
  app: {
    name: 'APK SDK 分析工具',
    description: '快速识别 Android 应用中的 SDK 和第三方库',
    version: '1.0.0',
  },
  footer: {
    projectUrl: 'https://github.com/LibChecker/LibChecker-Rules',
    projectLabel: '规则库',
    copyright: '© 2025 APK Analyzer. All rights reserved.',
  },
};

let cachedConfig: AppConfig | null = null;

/**
 * 加载配置文件
 * @returns 应用配置
 */
export async function loadConfig(): Promise<AppConfig> {
  // 如果已经缓存，直接返回
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const response = await fetch('/config.json');

    if (!response.ok) {
      console.warn(`Failed to load config: ${response.status} ${response.statusText}, using default config`);
      cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }

    const config = await response.json();
    cachedConfig = mergeConfig(DEFAULT_CONFIG, config);
    return cachedConfig;
  } catch (error) {
    console.warn('Failed to load /config.json:', error);
    console.warn('Using default config');
    cachedConfig = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  }
}

/**
 * 获取缓存的配置（不加载新配置）
 * @returns 应用配置或 null
 */
export function getConfig(): AppConfig | null {
  return cachedConfig;
}

/**
 * 检查值是否为空（null、undefined、空字符串）
 */
function isEmpty(value: any): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/**
 * 合并配置：深度合并用户配置和默认配置
 * @param defaults 默认配置
 * @param overrides 用户配置
 * @returns 合并后的配置
 */
function mergeConfig(defaults: AppConfig, overrides: Partial<AppConfig>): AppConfig {
  // 过滤掉空值的 footer 配置
  const footerOverrides = overrides.footer || {};
  const cleanedFooter: any = {};

  // 只保留非空的值
  if (!isEmpty(footerOverrides.projectUrl)) cleanedFooter.projectUrl = footerOverrides.projectUrl;
  if (!isEmpty(footerOverrides.projectLabel)) cleanedFooter.projectLabel = footerOverrides.projectLabel;
  if (!isEmpty(footerOverrides.copyright)) cleanedFooter.copyright = footerOverrides.copyright;

  // 处理 ICP 配置
  if (footerOverrides.icp) {
    const icpConfig: any = {};
    if (footerOverrides.icp.enabled !== undefined) icpConfig.enabled = footerOverrides.icp.enabled;
    if (!isEmpty(footerOverrides.icp.number)) icpConfig.number = footerOverrides.icp.number;
    if (!isEmpty(footerOverrides.icp.url)) icpConfig.url = footerOverrides.icp.url;
    if (!isEmpty(footerOverrides.icp.label)) icpConfig.label = footerOverrides.icp.label;

    // 只有当有实际值时才合并 ICP 配置
    if (Object.keys(icpConfig).length > 0) {
      cleanedFooter.icp = {
        ...defaults.footer.icp,
        ...icpConfig,
      };
    }
  }

  return {
    app: {
      ...defaults.app,
      ...(overrides.app || {}),
    },
    footer: {
      ...defaults.footer,
      ...cleanedFooter,
    },
    rules: {
      ...defaults.rules,
      ...(overrides.rules || {}),
    },
  };
}
