// src/utils/fuzzyMatcher.ts
// 模糊匹配算法 - 用于匹配 SDK 库名称
// 采用 7 层级匹配策略，处理各种复杂命名情况

import { Library } from '../types';

/**
 * 模糊匹配库名（增强版，支持 7 层级匹配策略）
 * @param libraryName - 要匹配的库名（如 "libacra-5.9.7.so"）
 * @param rulesMap - 规则库映射 { "libacra.so": {...}, ... }
 * @returns 匹配到的规则对象，如果没有匹配则返回 null
 */
export function fuzzyMatchLibrary(
  libraryName: string,
  rulesMap: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>
): Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'> | null {
  // 优先级 1: 精确匹配
  if (rulesMap[libraryName]) {
    return rulesMap[libraryName];
  }

  // 优先级 2-5: 规范化匹配（多种策略）
  const normalizedNames = generateNormalizedNames(libraryName);
  for (const normalized of normalizedNames) {
    if (rulesMap[normalized]) {
      return rulesMap[normalized];
    }
  }

  // 优先级 6: 子串模糊匹配
  const substringMatch = findSubstringMatch(libraryName, rulesMap);
  if (substringMatch) {
    return substringMatch;
  }

  // 优先级 7: 判断是否为 Hash 名称
  if (isHashName(libraryName)) {
    console.warn(`检测到混淆名称（Hash）: ${libraryName}`);
    return null;
  }

  // 未匹配到
  return null;
}

/**
 * 生成所有可能的规范化名称（优先级 2-5）
 * @param libraryName - 原始库名
 * @returns 规范化后的名称列表
 */
function generateNormalizedNames(libraryName: string): string[] {
  const variants = new Set<string>();

  // 原始名称
  let current = libraryName;

  // 优先级 2: 基础规范化（去 lib、去 .so、转小写）
  current = removeExtension(current);          // 去除 .so
  const withoutLib = removeLibPrefix(current); // 去除 lib 前缀
  const lowercase = current.toLowerCase();     // 转小写
  variants.add(withoutLib);
  variants.add(lowercase);
  variants.add(removeLibPrefix(lowercase));

  // 优先级 3: 去除版本号
  const withoutVersion = removeVersionSuffix(current);
  variants.add(withoutVersion);
  variants.add(withoutVersion + '.so');  // 还原 .so 扩展名
  variants.add('lib' + withoutVersion + '.so');  // 还原 lib 前缀

  // 优先级 4: 去除构建后缀
  const withoutSuffix = removeCommonSuffix(current);
  variants.add(withoutSuffix);
  variants.add(withoutSuffix + '.so');
  variants.add('lib' + withoutSuffix + '.so');

  // 优先级 5: 去除包名前缀
  const withoutPackage = removePackagePrefix(current);
  if (withoutPackage !== current) {
    variants.add(withoutPackage);
    variants.add(withoutPackage + '.so');
    variants.add('lib' + withoutPackage + '.so');
  }

  // 组合策略：去除 lib + 版本号 + 后缀 + 包名
  let fullyNormalized = removePackagePrefix(
    removeCommonSuffix(
      removeVersionSuffix(
        removeLibPrefix(current)
      )
    )
  );
  variants.add(fullyNormalized);
  variants.add(fullyNormalized + '.so');
  variants.add('lib' + fullyNormalized + '.so');

  // 去除所有空字符串和重复项
  return Array.from(variants).filter(name => name && name.length > 0);
}

/**
 * 去除文件扩展名（.so）
 */
function removeExtension(name: string): string {
  return name.replace(/\.so$/i, '');
}

/**
 * 去除 "lib" 前缀
 */
function removeLibPrefix(name: string): string {
  if (name.toLowerCase().startsWith('lib')) {
    return name.substring(3);
  }
  return name;
}

/**
 * 去除版本号后缀（增强版）
 * 支持格式:
 * - libacra-5.9.7.so -> libacra.so
 * - libacra_v2.0.so -> libacra.so
 * - libacra.5.9.so -> libacra.so
 * - libacra-release-1.2.3.so -> libacra.so
 */
function removeVersionSuffix(name: string): string {
  // 正则：匹配各种版本号模式
  return name
    .replace(/[-_.]?v?\d+(\.\d+)+/g, '')  // 匹配 -5.9.7 或 _v2.0 或 .5.9
    .replace(/-release-\d+/g, '')         // 匹配 -release-1.2.3
    .replace(/_\d+$/g, '');               // 匹配末尾的 _123
}

/**
 * 去除常见构建后缀
 * - debug, release, arm64, armeabi, x86, etc.
 */
function removeCommonSuffix(name: string): string {
  const suffixes = [
    '-debug', '-release', '-prod', '-dev',
    '_debug', '_release', '_prod', '_dev',
    '_arm64', '_armeabi', '_x86', '_x86_64',
    '-arm64-v8a', '-armeabi-v7a', '-x86', '-x86_64',
    '_alijtca_plus',  // 特殊后缀（阿里巴巴）
  ];

  let result = name;
  for (const suffix of suffixes) {
    const regex = new RegExp(suffix + '$', 'i');
    result = result.replace(regex, '');
  }

  return result;
}

/**
 * 去除包名前缀（⭐ 新增）
 * 检测并移除 com_example_app_ 或 cn_company_ 等包名模式
 *
 * 例如:
 * - libcom_example_app_native.so -> native.so
 * - libcn_company_sdk_core.so -> core.so
 */
function removePackagePrefix(name: string): string {
  // 检测是否以常见包名前缀开头
  const packagePrefixes = ['com_', 'cn_', 'org_', 'io_', 'net_', 'android_'];

  for (const prefix of packagePrefixes) {
    if (name.toLowerCase().startsWith(prefix)) {
      // 按下划线分割
      const parts = name.split('_');

      // 如果至少有 3 段（如 com_example_app），则认为是包名
      if (parts.length >= 3) {
        // 保留最后一段作为库名
        return parts[parts.length - 1];
      }
    }
  }

  return name;
}

/**
 * 子串模糊匹配（⭐ 新增）
 * 在规则库中查找包含关系
 *
 * 例如:
 * - libalicomphonenumberauthsdk-release_alijtca_plus.so
 * - 可能匹配到规则库中的 libalicomphonenumberauthsdk.so
 *
 * @param libraryName - 待匹配的库名
 * @param rulesMap - 规则库映射
 * @returns 匹配到的规则对象
 */
function findSubstringMatch(
  libraryName: string,
  rulesMap: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>
): Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'> | null {
  const normalizedName = libraryName.toLowerCase();

  // 遍历规则库的所有键
  for (const ruleKey of Object.keys(rulesMap)) {
    const normalizedRuleKey = ruleKey.toLowerCase();

    // 检查规则库键名是否为待匹配库名的子串
    if (normalizedName.includes(normalizedRuleKey.replace(/\.so$/i, ''))) {
      return rulesMap[ruleKey];
    }

    // 检查待匹配库名是否为规则库键名的子串
    if (normalizedRuleKey.includes(normalizedName.replace(/\.so$/i, ''))) {
      return rulesMap[ruleKey];
    }
  }

  return null;
}

/**
 * 判断是否为 Hash 名称（⭐ 新增）
 * 检测库名是否为纯十六进制 Hash（8-16 位）
 *
 * 例如:
 * - lib39285EFA.so → true
 * - libA3AEECD8.so → true
 * - libacra.so → false
 *
 * @param libraryName - 库名
 * @returns 是否为 Hash 名称
 */
function isHashName(libraryName: string): boolean {
  // 去除 lib 前缀和 .so 扩展名
  const coreName = libraryName
    .replace(/^lib/i, '')
    .replace(/\.so$/i, '');

  // 检查是否为纯十六进制，且长度在 8-16 之间
  const hexPattern = /^[0-9A-Fa-f]{8,16}$/;
  return hexPattern.test(coreName);
}

/**
 * 批量模糊匹配
 * @param libraryNames - 库名列表
 * @param rulesMap - 规则库映射
 * @returns 匹配结果数组
 */
export function fuzzyMatchBatch(
  libraryNames: string[],
  rulesMap: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>
): Array<{
  original: string;
  matched: Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'> | null;
}> {
  return libraryNames
    .map(name => ({
      original: name,
      matched: fuzzyMatchLibrary(name, rulesMap),
    }))
    .filter(item => item.matched !== null);
}

/**
 * 匹配结果缓存（性能优化）
 */
const matchCache = new Map<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'> | null>();

/**
 * 带缓存的模糊匹配
 */
export function fuzzyMatchLibraryWithCache(
  libraryName: string,
  rulesMap: Record<string, Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'>>
): Omit<Library, 'count' | 'locations' | 'architectures' | 'hasMetadata' | 'expanded'> | null {
  // 检查缓存
  if (matchCache.has(libraryName)) {
    return matchCache.get(libraryName)!;
  }

  // 执行匹配
  const result = fuzzyMatchLibrary(libraryName, rulesMap);

  // 缓存结果
  matchCache.set(libraryName, result);

  return result;
}

/**
 * 清除匹配缓存
 */
export function clearMatchCache(): void {
  matchCache.clear();
}
