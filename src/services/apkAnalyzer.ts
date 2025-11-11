// src/services/apkAnalyzer.ts
// APK 分析主逻辑 - 整合所有模块

import JSZip from 'jszip';
import { convertAxmlToXml, extractManifestInfo, extractComponents } from '../utils/axmlParser';
import { scanApk, ScanResult } from './sdkScanner';
import { loadRules } from './rulesLoader';
import { fuzzyMatchLibraryWithCache } from '../utils/fuzzyMatcher';
import { AnalysisResult, Library, RulesBundle, AnalysisProgress } from '../types';

/**
 * 分析 APK 文件
 * @param file - APK 文件
 * @param onProgress - 进度回调
 * @returns 分析结果
 */
export async function analyzeApk(
  file: File,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<AnalysisResult> {
  console.log(`🚀 开始分析 APK: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

  try {
    // 阶段 1: 提取 APK 文件
    onProgress?.({
      stage: 'extracting',
      message: '正在提取 APK 文件...',
      progress: 10,
    });

    const zip = await JSZip.loadAsync(file);
    console.log('✓ APK 文件提取成功');

    // 阶段 2: 解析 AndroidManifest.xml
    onProgress?.({
      stage: 'parsing',
      message: '正在解析 AndroidManifest.xml...',
      progress: 30,
    });

    const manifestFile = zip.file('AndroidManifest.xml');
    if (!manifestFile) {
      throw new Error('未找到 AndroidManifest.xml 文件');
    }

    const manifestBuffer = await manifestFile.async('arraybuffer');
    const xmlText = convertAxmlToXml(manifestBuffer);
    const basicInfo = extractManifestInfo(xmlText);
    const components = extractComponents(xmlText);

    const parsedManifest = {
      xmlText,
      ...basicInfo,
      ...components,
    };

    console.log('✓ AndroidManifest.xml 解析成功');
    console.log(`  - 包名: ${basicInfo.packageName}`);
    console.log(`  - 版本: ${basicInfo.versionName} (${basicInfo.versionCode})`);

    // 阶段 3: 扫描 SDK 库和组件
    onProgress?.({
      stage: 'scanning',
      message: '正在扫描 SDK 库和组件...',
      progress: 50,
    });

    const scanResult = await scanApk(zip, parsedManifest);
    console.log('✓ SDK 扫描完成');

    // 阶段 4: 加载规则库
    onProgress?.({
      stage: 'matching',
      message: '正在加载规则库...',
      progress: 60,
    });

    const rules = await loadRules();
    if (!rules) {
      throw new Error('加载规则库失败');
    }

    console.log('✓ 规则库加载成功');
    console.log(`  - 版本: ${rules.version}`);
    console.log(`  - 总规则数: ${rules.totalRules}`);

    // 阶段 5: 匹配规则库
    onProgress?.({
      stage: 'matching',
      message: '正在匹配 SDK 库...',
      progress: 80,
    });

    const libraries = await matchLibraries(scanResult, rules);
    console.log('✓ 规则库匹配完成');
    console.log(`  - 匹配到 ${libraries.length} 个库`);

    // 阶段 6: 生成分析结果
    onProgress?.({
      stage: 'completed',
      message: '分析完成',
      progress: 100,
    });

    const stats = calculateStats(libraries);

    const result: AnalysisResult = {
      basic: basicInfo,
      libraries,
      stats,
      manifestXml: xmlText,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ APK 分析完成！');
    return result;
  } catch (error) {
    console.error('❌ APK 分析失败:', error);
    onProgress?.({
      stage: 'error',
      message: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
      progress: 0,
    });
    throw error;
  }
}

/**
 * 匹配规则库
 */
async function matchLibraries(
  scanResult: ScanResult,
  rules: RulesBundle
): Promise<Library[]> {
  const libraries: Library[] = [];
  const libraryMap = new Map<string, Library>(); // 用于去重

  // 1. 匹配 Native 库
  console.log('🔍 开始匹配 Native 库...');
  for (const libName of scanResult.nativeLibs) {
    const matched = fuzzyMatchLibraryWithCache(libName, rules.rules.native);

    // 获取这个库的详细信息（包含 count、locations、architectures）
    const libInfo = scanResult.nativeLibsMap.get(libName);

    if (matched) {
      // 统一使用 UUID 作为唯一标识，实现跨文件名合并
      const libraryKey = matched.uuid || matched.id;

      // 如果已存在，合并信息
      if (libraryMap.has(libraryKey)) {
        const existing = libraryMap.get(libraryKey)!;

        // 合并检出次数
        if (libInfo) {
          existing.count = (existing.count || 0) + libInfo.count;

          // 合并位置信息
          existing.locations = existing.locations || [];
          existing.locations.push(...libInfo.locations);

          // 合并架构信息
          existing.architectures = existing.architectures || [];
          libInfo.architectures.forEach(arch => {
            if (!existing.architectures!.includes(arch)) {
              existing.architectures!.push(arch);
            }
          });
        }
      } else {
        // 新库，直接使用 libInfo 中的信息
        const library: Library = {
          ...matched,
          count: libInfo?.count || 0,
          locations: libInfo?.locations || [],
          architectures: libInfo?.architectures || [],
          hasMetadata: true,
          expanded: false,
        };

        libraryMap.set(libraryKey, library);
      }
    } else {
      // 未匹配到元数据
      const libraryKey = libName;

      if (!libraryMap.has(libraryKey)) {
        const library: Library = {
          id: libraryKey,
          uuid: '',
          name: libName,
          label: libName,
          category: 'other',
          categoryLabel: '其他',
          categoryIcon: '📦',
          developer: 'Unknown',
          description: '未识别的库',
          sourceLink: '',
          type: 'native',
          count: libInfo?.count || 0,
          locations: libInfo?.locations || [],
          architectures: libInfo?.architectures || [],
          hasMetadata: false,
          expanded: false,
        };

        libraryMap.set(libraryKey, library);
      }
    }
  }

  console.log(`✓ Native 库匹配完成: ${libraryMap.size} 个库`);

  // 2. 匹配 Activity 组件
  console.log('🔍 开始匹配 Activity 组件...');
  for (const activityName of scanResult.activities) {
    const matched = fuzzyMatchLibraryWithCache(activityName, rules.rules.activities);

    if (matched) {
      // 使用 UUID 作为唯一标识，而不是 ID
      // 同一个 SDK 的多个组件会有相同的 UUID
      const libraryKey = matched.uuid || matched.id;

      if (libraryMap.has(libraryKey)) {
        // 已存在，增加检出次数
        const existing = libraryMap.get(libraryKey)!;
        existing.count = (existing.count || 0) + 1;
        // 可以选择记录具体的组件名称到 locations
        if (!existing.locations) existing.locations = [];
        existing.locations.push(`Activity: ${activityName}`);
      } else {
        // 新 SDK
        const library: Library = {
          ...matched,
          count: 1,
          locations: [`Activity: ${activityName}`],
          hasMetadata: true,
          expanded: false,
        };

        libraryMap.set(libraryKey, library);
      }
    }
  }

  // 3. 匹配 Service 组件
  console.log('🔍 开始匹配 Service 组件...');
  for (const serviceName of scanResult.services) {
    const matched = fuzzyMatchLibraryWithCache(serviceName, rules.rules.services);

    if (matched) {
      const libraryKey = matched.uuid || matched.id;

      if (libraryMap.has(libraryKey)) {
        const existing = libraryMap.get(libraryKey)!;
        existing.count = (existing.count || 0) + 1;
        if (!existing.locations) existing.locations = [];
        existing.locations.push(`Service: ${serviceName}`);
      } else {
        const library: Library = {
          ...matched,
          count: 1,
          locations: [`Service: ${serviceName}`],
          hasMetadata: true,
          expanded: false,
        };

        libraryMap.set(libraryKey, library);
      }
    }
  }

  // 4. 匹配 Provider 组件
  console.log('🔍 开始匹配 Provider 组件...');
  for (const providerName of scanResult.providers) {
    const matched = fuzzyMatchLibraryWithCache(providerName, rules.rules.providers);

    if (matched) {
      const libraryKey = matched.uuid || matched.id;

      if (libraryMap.has(libraryKey)) {
        const existing = libraryMap.get(libraryKey)!;
        existing.count = (existing.count || 0) + 1;
        if (!existing.locations) existing.locations = [];
        existing.locations.push(`Provider: ${providerName}`);
      } else {
        const library: Library = {
          ...matched,
          count: 1,
          locations: [`Provider: ${providerName}`],
          hasMetadata: true,
          expanded: false,
        };

        libraryMap.set(libraryKey, library);
      }
    }
  }

  // 5. 匹配 Receiver 组件
  console.log('🔍 开始匹配 Receiver 组件...');
  for (const receiverName of scanResult.receivers) {
    const matched = fuzzyMatchLibraryWithCache(receiverName, rules.rules.receivers);

    if (matched) {
      const libraryKey = matched.uuid || matched.id;

      if (libraryMap.has(libraryKey)) {
        const existing = libraryMap.get(libraryKey)!;
        existing.count = (existing.count || 0) + 1;
        if (!existing.locations) existing.locations = [];
        existing.locations.push(`Receiver: ${receiverName}`);
      } else {
        const library: Library = {
          ...matched,
          count: 1,
          locations: [`Receiver: ${receiverName}`],
          hasMetadata: true,
          expanded: false,
        };

        libraryMap.set(libraryKey, library);
      }
    }
  }

  // 转换为数组并排序
  libraries.push(...Array.from(libraryMap.values()));
  libraries.sort((a, b) => a.label.localeCompare(b.label));

  return libraries;
}

/**
 * 计算统计信息
 */
function calculateStats(libraries: Library[]): AnalysisResult['stats'] {
  const byCategory: Record<string, number> = {};
  const byType: Record<string, number> = {};

  libraries.forEach(lib => {
    // 按分类统计
    byCategory[lib.category] = (byCategory[lib.category] || 0) + 1;

    // 按类型统计
    byType[lib.type] = (byType[lib.type] || 0) + 1;
  });

  return {
    total: libraries.length,
    byCategory,
    byType,
  };
}
