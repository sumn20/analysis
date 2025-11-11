// src/services/sdkScanner.ts
// SDK 扫描模块 - 扫描 APK 中的 Native 库和组件

import JSZip from 'jszip';
import { ParsedManifest } from '../types';

/**
 * 库信息（带位置和架构）
 */
export interface LibraryInfo {
  name: string;                  // 库名称
  count: number;                 // 检出次数
  locations: string[];           // 所有检出位置
  architectures: string[];       // 涉及的架构（仅 Native 库）
}

/**
 * 扫描结果
 */
export interface ScanResult {
  nativeLibs: string[];          // Native 库列表（已去重）
  nativeLibsMap: Map<string, LibraryInfo>;  // Native 库详细信息（按名称）
  activities: string[];          // Activity 列表
  services: string[];            // Service 列表
  providers: string[];           // Provider 列表
  receivers: string[];           // Receiver 列表
}

/**
 * 扫描 APK 中的 SDK 库和组件
 * @param zip - JSZip 对象
 * @param manifest - 解析后的 Manifest 信息
 * @returns 扫描结果
 */
export async function scanApk(zip: JSZip, manifest: ParsedManifest): Promise<ScanResult> {
  console.log('🔍 开始扫描 SDK 库和组件...');

  // 1. 扫描 Native 库
  const { nativeLibs, nativeLibsMap } = await scanNativeLibraries(zip);
  console.log(`✓ 扫描到 ${nativeLibs.length} 个 Native 库`);

  // 2. 从 Manifest 提取组件
  const { activities, services, providers, receivers } = manifest;
  console.log(`✓ 扫描到 ${activities.length} 个 Activity`);
  console.log(`✓ 扫描到 ${services.length} 个 Service`);
  console.log(`✓ 扫描到 ${providers.length} 个 Provider`);
  console.log(`✓ 扫描到 ${receivers.length} 个 Receiver`);

  return {
    nativeLibs,
    nativeLibsMap,
    activities,
    services,
    providers,
    receivers,
  };
}

/**
 * 扫描 Native 库（lib/ 目录下的 .so 文件）
 * 实现去重合并：同一个库在不同架构下会合并为一个条目，记录所有位置和架构
 */
async function scanNativeLibraries(zip: JSZip): Promise<{
  nativeLibs: string[];
  nativeLibsMap: Map<string, LibraryInfo>;
}> {
  const nativeLibsMap = new Map<string, LibraryInfo>();

  // 遍历所有文件
  zip.forEach((relativePath, file) => {
    // 只处理 lib/ 目录下的 .so 文件
    if (relativePath.startsWith('lib/') && relativePath.endsWith('.so') && !file.dir) {
      // 提取架构和文件名
      // 例如: lib/arm64-v8a/libacra-5.9.7.so
      const parts = relativePath.split('/');
      if (parts.length === 3) {
        const architecture = parts[1];  // arm64-v8a
        const fileName = parts[2];      // libacra-5.9.7.so

        // 获取或创建库信息
        if (!nativeLibsMap.has(fileName)) {
          nativeLibsMap.set(fileName, {
            name: fileName,
            count: 0,
            locations: [],
            architectures: [],
          });
        }

        const libInfo = nativeLibsMap.get(fileName)!;

        // 增加检出次数
        libInfo.count++;

        // 添加位置（完整路径）
        libInfo.locations.push(relativePath);

        // 添加架构（去重）
        if (!libInfo.architectures.includes(architecture)) {
          libInfo.architectures.push(architecture);
        }
      }
    }
  });

  // 提取所有库名并排序
  const nativeLibs = Array.from(nativeLibsMap.keys()).sort();

  // 对每个库的架构和位置进行排序
  nativeLibsMap.forEach((libInfo) => {
    libInfo.architectures.sort();
    libInfo.locations.sort();
  });

  // 统计信息
  const architecturesSet = new Set<string>();
  nativeLibsMap.forEach((libInfo) => {
    libInfo.architectures.forEach(arch => architecturesSet.add(arch));
  });

  console.log(`✓ 扫描到的架构: ${Array.from(architecturesSet).sort().join(', ')}`);
  console.log(`✓ Native 库去重后: ${nativeLibs.length} 个`);

  // 统计每个架构的库数量
  const archCounts = new Map<string, number>();
  nativeLibsMap.forEach((libInfo) => {
    libInfo.architectures.forEach(arch => {
      archCounts.set(arch, (archCounts.get(arch) || 0) + 1);
    });
  });

  for (const [arch, count] of Array.from(archCounts.entries()).sort()) {
    console.log(`  - ${arch}: ${count} 个库`);
  }

  return { nativeLibs, nativeLibsMap };
}

/**
 * 去重组件列表
 */
export function deduplicateComponents(components: string[]): string[] {
  return Array.from(new Set(components)).sort();
}

/**
 * 按包名分组组件
 */
export function groupComponentsByPackage(components: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  components.forEach(component => {
    // 提取包名（最后一个点之前的部分）
    const lastDotIndex = component.lastIndexOf('.');
    const packageName = lastDotIndex > 0 ? component.substring(0, lastDotIndex) : 'default';

    if (!groups.has(packageName)) {
      groups.set(packageName, []);
    }
    groups.get(packageName)!.push(component);
  });

  return groups;
}

/**
 * 统计扫描结果
 */
export function getScanStats(scanResult: ScanResult): {
  totalLibraries: number;
  totalComponents: number;
  architectures: string[];
  byArchitecture: Map<string, number>;
} {
  const totalLibraries = scanResult.nativeLibs.length;
  const totalComponents =
    scanResult.activities.length +
    scanResult.services.length +
    scanResult.providers.length +
    scanResult.receivers.length;

  // 提取所有架构
  const architecturesSet = new Set<string>();
  const byArchitecture = new Map<string, number>();

  scanResult.nativeLibsMap.forEach((libInfo) => {
    libInfo.architectures.forEach(arch => {
      architecturesSet.add(arch);
      byArchitecture.set(arch, (byArchitecture.get(arch) || 0) + 1);
    });
  });

  const architectures = Array.from(architecturesSet).sort();

  return {
    totalLibraries,
    totalComponents,
    architectures,
    byArchitecture,
  };
}
