// src/services/xapkParser.ts
// XAPK 文件解析服务

import JSZip from 'jszip';

export interface XapkInfo {
  mainApk: File;
  configApks: File[];
  originalFileName: string;
}

/**
 * 解析 XAPK 文件，提取其中的 APK 文件
 * @param xapkFile - XAPK 文件
 * @returns XAPK 信息，包含主 APK 和配置 APK
 */
export async function parseXapk(xapkFile: File): Promise<XapkInfo> {
  console.log(`🚀 开始解析 XAPK: ${xapkFile.name}`);

  try {
    // 加载 XAPK 文件（实际上是一个 ZIP 文件）
    const zip = await JSZip.loadAsync(xapkFile);
    console.log('✓ XAPK 文件加载成功');

    // 查找所有 APK 文件
    const apkFiles: { name: string; file: JSZip.JSZipObject }[] = [];
    
    zip.forEach((relativePath, file) => {
      if (relativePath.toLowerCase().endsWith('.apk') && !file.dir) {
        apkFiles.push({ name: relativePath, file });
      }
    });

    if (apkFiles.length === 0) {
      throw new Error('XAPK 文件中未找到 APK 文件');
    }

    console.log(`✓ 找到 ${apkFiles.length} 个 APK 文件:`, apkFiles.map(f => f.name));

    // 识别主 APK 和配置 APK
    let mainApkFile: { name: string; file: JSZip.JSZipObject } | null = null;
    const configApkFiles: { name: string; file: JSZip.JSZipObject }[] = [];

    for (const apkFile of apkFiles) {
      const fileName = apkFile.name.toLowerCase();
      
      // 主 APK 通常是不包含 "config." 前缀的文件，或者是最大的文件
      if (!fileName.includes('config.') && !fileName.includes('split_config.')) {
        mainApkFile = apkFile;
      } else {
        configApkFiles.push(apkFile);
      }
    }

    // 如果没有找到明显的主 APK，选择最大的文件作为主 APK
    if (!mainApkFile && apkFiles.length > 0) {
      // 按文件大小排序，选择最大的作为主 APK
      const sortedApks = [...apkFiles].sort((a, b) => {
        // 这里我们无法直接获取压缩文件的大小，所以使用文件名规则
        // 通常主 APK 的文件名最简单
        return a.name.length - b.name.length;
      });
      
      mainApkFile = sortedApks[0];
      configApkFiles.push(...sortedApks.slice(1));
    }

    if (!mainApkFile) {
      throw new Error('无法识别主 APK 文件');
    }

    console.log(`✓ 主 APK: ${mainApkFile.name}`);
    console.log(`✓ 配置 APK: ${configApkFiles.map(f => f.name).join(', ')}`);

    // 将 JSZip 文件转换为 File 对象
    const mainApkBuffer = await mainApkFile.file.async('arraybuffer');
    const mainApk = new File([mainApkBuffer], mainApkFile.name, { type: 'application/vnd.android.package-archive' });

    const configApks: File[] = [];
    for (const configFile of configApkFiles) {
      const buffer = await configFile.file.async('arraybuffer');
      const file = new File([buffer], configFile.name, { type: 'application/vnd.android.package-archive' });
      configApks.push(file);
    }

    console.log('✅ XAPK 解析完成！');

    return {
      mainApk,
      configApks,
      originalFileName: xapkFile.name,
    };
  } catch (error) {
    console.error('❌ XAPK 解析失败:', error);
    throw new Error(`XAPK 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 检查文件是否为 XAPK 格式
 * @param file - 文件
 * @returns 是否为 XAPK 文件
 */
export function isXapkFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.xapk');
}