// scripts/build-rules-bundle.js
// 规则库预处理脚本 - 将 2884+ 个规则文件合并为一个 JSON 文件
// 用于在构建时自动执行，减少运行时加载负担

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置路径
const RULES_DIR = path.join(__dirname, '../../LibChecker-Rules-4');
const CATEGORIES_FILE = path.join(__dirname, '../sdk-categories.json');
const OUTPUT_FILE = path.join(__dirname, '../public/rules-bundle.json');

// 规则类型映射：将目录名映射到规则类型
const RULE_TYPES = {
  'native-libs': 'native',           // 原生库（.so 文件）
  'activities-libs': 'activities',   // Activity 组件
  'services-libs': 'services',       // Service 组件
  'providers-libs': 'providers',     // ContentProvider 组件
  'receivers-libs': 'receivers',     // BroadcastReceiver 组件
  'static-libs': 'static',           // 静态库
  'actions-libs': 'actions',         // Action 规则
};

/**
 * 主函数：构建规则库合并文件
 */
async function buildRulesBundle() {
  console.log('🚀 开始构建规则库合并文件...');
  console.log(`规则库目录: ${RULES_DIR}`);
  console.log(`分类映射文件: ${CATEGORIES_FILE}`);
  console.log(`输出文件: ${OUTPUT_FILE}`);

  // 1. 检查必要文件是否存在
  if (!fs.existsSync(RULES_DIR)) {
    console.error(`❌ 错误: 规则库目录不存在: ${RULES_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(CATEGORIES_FILE)) {
    console.error(`❌ 错误: 分类映射文件不存在: ${CATEGORIES_FILE}`);
    process.exit(1);
  }

  // 2. 加载分类映射
  console.log('\n📂 加载分类映射...');
  const categoriesData = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf-8'));
  const { categories, sdks } = categoriesData;
  console.log(`✓ 加载了 ${Object.keys(categories).length} 个分类`);
  console.log(`✓ 加载了 ${Object.keys(sdks).length} 个 SDK 映射`);

  // 3. 创建 UUID -> Category 映射
  const uuidToCategoryMap = {};
  Object.entries(sdks).forEach(([uuid, info]) => {
    uuidToCategoryMap[uuid] = info.category || 'other';
  });

  // 4. 扫描所有规则文件
  console.log('\n🔍 扫描规则文件...');
  const rulesBundle = {
    version: generateVersion(),
    generatedAt: new Date().toISOString(),
    totalRules: 0,
    categories: categories,
    rules: {
      native: {},
      activities: {},
      services: {},
      providers: {},
      receivers: {},
      static: {},
      actions: {},
    },
  };

  // 5. 遍历每个规则类型目录
  for (const [dirName, ruleType] of Object.entries(RULE_TYPES)) {
    const dirPath = path.join(RULES_DIR, dirName);
    if (!fs.existsSync(dirPath)) {
      console.warn(`⚠️  目录不存在: ${dirPath}`);
      continue;
    }

    console.log(`\n📂 处理 ${dirName}...`);
    const ruleFiles = getAllJsonFiles(dirPath);
    console.log(`   找到 ${ruleFiles.length} 个规则文件`);

    let successCount = 0;
    let errorCount = 0;

    for (const filePath of ruleFiles) {
      try {
        const ruleData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const ruleKey = extractRuleKey(filePath, dirName);
        const processedRule = processRule(ruleData, ruleKey, ruleType, uuidToCategoryMap, categories);

        if (processedRule) {
          rulesBundle.rules[ruleType][ruleKey] = processedRule;
          rulesBundle.totalRules++;
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ 处理文件失败: ${path.basename(filePath)} - ${error.message}`);
        errorCount++;
      }
    }

    console.log(`   ✓ 成功: ${successCount}, 失败: ${errorCount}`);
  }

  // 6. 确保输出目录存在
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 7. 写入合并文件
  console.log('\n💾 写入合并文件...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rulesBundle, null, 2), 'utf-8');

  const fileSize = fs.statSync(OUTPUT_FILE).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

  console.log('\n✅ 规则库合并完成！');
  console.log(`   - 版本号: ${rulesBundle.version}`);
  console.log(`   - 总规则数: ${rulesBundle.totalRules}`);
  console.log(`   - 文件路径: ${OUTPUT_FILE}`);
  console.log(`   - 文件大小: ${fileSizeMB} MB`);

  // 8. 统计各类型规则数量
  console.log('\n📊 规则分布:');
  for (const [type, rules] of Object.entries(rulesBundle.rules)) {
    const count = Object.keys(rules).length;
    if (count > 0) {
      console.log(`   - ${type}: ${count} 个规则`);
    }
  }
}

/**
 * 递归获取目录下所有 .json 文件
 */
function getAllJsonFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      // 递归处理子目录
      results = results.concat(getAllJsonFiles(filePath));
    } else if (file.endsWith('.json')) {
      // 添加 JSON 文件
      results.push(filePath);
    }
  });

  return results;
}

/**
 * 从文件路径提取规则键名
 * 例如: /path/to/native-libs/libacra.so.json -> libacra.so
 */
function extractRuleKey(filePath, dirName) {
  const relativePath = filePath.split(`${dirName}/`)[1];
  return relativePath.replace(/\.json$/, '').replace(/\//g, '.');
}

/**
 * 处理单个规则
 */
function processRule(ruleData, ruleKey, ruleType, uuidToCategoryMap, categories) {
  const { data, uuid } = ruleData;

  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn(`⚠️  规则数据为空: ${ruleKey}`);
    return null;
  }

  // 优先使用中文（zh-Hans），如果没有则使用英文（en）
  const zhHansData = data.find((item) => item.locale === 'zh-Hans');
  const enData = data.find((item) => item.locale === 'en');
  const localeData = zhHansData || enData;

  if (!localeData) {
    console.warn(`⚠️  规则无有效数据: ${ruleKey}`);
    return null;
  }

  const { label, dev_team, description, source_link } = localeData.data;

  // 从 UUID 获取分类
  const categoryKey = uuidToCategoryMap[uuid] || 'other';
  const categoryInfo = categories[categoryKey] || categories['other'];

  return {
    id: ruleKey,
    uuid: uuid,
    name: ruleKey,
    label: label || 'Unknown',
    developer: dev_team || 'Unknown',
    description: description || '',
    sourceLink: source_link || '',
    category: categoryKey,
    categoryLabel: categoryInfo.label,
    categoryIcon: categoryInfo.icon,
    categoryDescription: categoryInfo.description,
    type: ruleType,
  };
}

/**
 * 生成版本号（格式: YYYY-MM-DD-HHmm）
 */
function generateVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}${minutes}`;
}

// 执行构建
buildRulesBundle().catch((error) => {
  console.error('\n❌ 构建失败:', error);
  console.error(error.stack);
  process.exit(1);
});
