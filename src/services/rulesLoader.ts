// src/services/rulesLoader.ts
// 规则库加载管理 - IndexedDB 缓存 + 自动更新

import { RulesBundle } from '../types';

const DB_NAME = 'apk_analyzer_db';
const DB_VERSION = 1;
const STORE_NAME = 'rules_bundle';
const LOCAL_VERSION_KEY = 'rules_local_version';

/**
 * 加载规则库
 * 优先从 IndexedDB 加载，如果不存在则从 public/ 目录加载
 */
export async function loadRules(): Promise<RulesBundle | null> {
  console.log('📂 开始加载规则库...');

  try {
    // 1. 尝试从 IndexedDB 加载
    const cachedRules = await loadRulesFromIndexedDB();
    if (cachedRules) {
      console.log(`✓ 从 IndexedDB 加载规则库成功 (版本: ${cachedRules.version})`);
      return cachedRules;
    }

    // 2. 从 public/ 目录加载
    console.log('⬇️  从服务器加载规则库...');
    const response = await fetch('/rules-bundle.json');
    if (!response.ok) {
      throw new Error(`加载失败: ${response.status} ${response.statusText}`);
    }

    const rules: RulesBundle = await response.json();
    console.log(`✓ 从服务器加载规则库成功 (版本: ${rules.version})`);

    // 3. 存储到 IndexedDB
    await saveRulesToIndexedDB(rules);
    localStorage.setItem(LOCAL_VERSION_KEY, rules.version);

    return rules;
  } catch (error) {
    console.error('❌ 加载规则库失败:', error);
    return null;
  }
}

/**
 * 从 IndexedDB 加载规则库
 */
async function loadRulesFromIndexedDB(): Promise<RulesBundle | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('IndexedDB 打开失败:', request.error);
      resolve(null);
    };

    request.onsuccess = () => {
      const db = request.result;

      // 检查对象存储是否存在
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        resolve(null);
        return;
      }

      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get('bundle');

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result.data);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => {
        console.warn('IndexedDB 读取失败:', getRequest.error);
        resolve(null);
      };
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 保存规则库到 IndexedDB
 */
async function saveRulesToIndexedDB(rules: RulesBundle): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // 清空旧数据
      store.clear();

      // 存储新数据
      store.put({ id: 'bundle', data: rules });

      transaction.oncomplete = () => {
        console.log('✓ 规则库已缓存到 IndexedDB');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 检查并更新规则库（可选功能）
 * 如果部署了云端版本，可以启用此功能
 */
export async function checkAndUpdateRules(
  versionUrl: string = '/rules-version.json'
): Promise<boolean> {
  try {
    // 1. 获取本地版本
    const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);

    // 2. 获取云端版本信息
    const response = await fetch(versionUrl);
    if (!response.ok) {
      console.warn('无法检查规则库版本');
      return false;
    }

    const cloudVersionInfo = await response.json();
    const { version: cloudVersion, bundleUrl } = cloudVersionInfo;

    console.log(`本地版本: ${localVersion || '无'}`);
    console.log(`云端版本: ${cloudVersion}`);

    // 3. 对比版本
    if (localVersion === cloudVersion) {
      console.log('✓ 规则库已是最新版本');
      return false;
    }

    // 4. 下载最新规则库
    console.log('⬇️  正在下载最新规则库...');
    const bundleResponse = await fetch(bundleUrl);
    const rulesBundle: RulesBundle = await bundleResponse.json();

    // 5. 存储到 IndexedDB
    await saveRulesToIndexedDB(rulesBundle);

    // 6. 更新本地版本号
    localStorage.setItem(LOCAL_VERSION_KEY, cloudVersion);

    console.log('✅ 规则库更新成功！');
    return true;
  } catch (error) {
    console.error('❌ 规则库更新失败:', error);
    return false;
  }
}

/**
 * 清除规则库缓存
 */
export async function clearRulesCache(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      store.clear();

      transaction.oncomplete = () => {
        localStorage.removeItem(LOCAL_VERSION_KEY);
        console.log('✓ 规则库缓存已清除');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 获取规则库信息
 */
export async function getRulesInfo(): Promise<{
  version: string | null;
  totalRules: number;
  cacheSize: number;
  lastUpdated: string | null;
} | null> {
  try {
    const rules = await loadRulesFromIndexedDB();
    if (!rules) {
      return null;
    }

    // 估算缓存大小（粗略估计）
    const cacheSize = new Blob([JSON.stringify(rules)]).size;

    return {
      version: rules.version,
      totalRules: rules.totalRules,
      cacheSize,
      lastUpdated: rules.generatedAt,
    };
  } catch (error) {
    console.error('获取规则库信息失败:', error);
    return null;
  }
}
