// src/types/index.ts
// 项目核心类型定义

/**
 * SDK 分类信息
 */
export interface Category {
  label: string;           // 分类中文名称
  icon: string;            // 分类图标 emoji
  description: string;     // 分类描述
}

/**
 * SDK 库信息
 */
export interface Library {
  id: string;                    // 库唯一标识
  uuid: string;                  // 规则库 UUID
  name: string;                  // 库文件名
  label: string;                 // 库中文标签
  category: string;              // 分类键名
  categoryLabel: string;         // 分类中文名
  categoryIcon: string;          // 分类图标
  categoryDescription?: string;  // 分类描述
  developer: string;             // 开发者
  description: string;           // 功能描述
  sourceLink: string;            // 官网链接
  type: 'native' | 'activity' | 'service' | 'provider' | 'receiver' | 'static' | 'actions';  // 类型
  count?: number;                // 检出次数
  locations?: string[];          // 检测位置
  architectures?: string[];      // 编译架构
  hasMetadata: boolean;          // 是否有元数据
  expanded?: boolean;            // UI 状态：是否展开
}

/**
 * 规则库结构
 */
export interface RulesBundle {
  version: string;               // 版本号
  generatedAt: string;           // 生成时间
  totalRules: number;            // 总规则数
  categories: Record<string, Category>;  // 分类映射
  rules: {
    native: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>;
    activities: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>;
    services: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>;
    providers: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>;
    receivers: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>;
    static: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>;
    actions: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>;
  };
}

/**
 * 解析后的 AndroidManifest 信息
 */
export interface ParsedManifest {
  xmlText: string;               // XML 文本内容
  packageName: string;           // 包名
  versionName: string;           // 版本名
  versionCode: number;           // 版本号
  minSdkVersion?: number;        // 最小 SDK 版本
  targetSdkVersion?: number;     // 目标 SDK 版本
  activities: string[];          // Activity 列表
  services: string[];            // Service 列表
  providers: string[];           // Provider 列表
  receivers: string[];           // Receiver 列表
}

/**
 * APK 分析结果
 */
export interface AnalysisResult {
  basic: {
    packageName: string;
    versionName: string;
    versionCode: number;
    minSdkVersion?: number;
    targetSdkVersion?: number;
  };
  libraries: Library[];          // 识别的库列表
  stats: {
    total: number;               // 总库数
    byCategory: Record<string, number>;  // 按分类统计
    byType: Record<string, number>;      // 按类型统计
  };
  manifestXml: string;           // AndroidManifest.xml 内容
  timestamp: string;             // 分析时间戳
}

/**
 * 分析进度信息
 */
export interface AnalysisProgress {
  stage: 'extracting' | 'parsing' | 'scanning' | 'matching' | 'completed' | 'error';
  message: string;
  progress: number;              // 0-100
  estimatedTime?: number;        // 预计剩余时间（秒）
}

/**
 * 导出报告选项
 */
export interface ExportOptions {
  format: 'html' | 'json';
  filename: string;
  includeTimestamp: boolean;
  prettyPrint: boolean;
}
