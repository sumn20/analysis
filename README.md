# APK SDK 分析工具

## 项目简介

这是一个**纯前端网页应用**，用于分析 Android APK 文件中集成的 SDK 库和 AndroidManifest.xml 内容。

### 核心功能
- ✅ 从 APK 中提取并解析 AndroidManifest.xml 文件
- ✅ 识别集成的 SDK 和原生库（基于 LibChecker 规则库，2884+ 库规则）
- ✅ 按分类展示 SDK 库（崩溃收集、网络请求、支付、广告等）
- ✅ 完整展示 AndroidManifest.xml 内容（支持复制和下载）
- ✅ 生成专业分析报告（HTML / JSON）

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **APK 解析**: jszip
- **AXML 解析**: 自实现（基于 axml2xml）
- **多线程**: Web Worker
- **缓存**: IndexedDB

## 项目结构

\`\`\`
apk-analyzer/
├── package.json                   # 项目配置
├── tsconfig.json                  # TypeScript 配置
├── vite.config.ts                 # Vite 配置
├── index.html                     # 入口 HTML
├── sdk-categories.json            # SDK 分类映射
├── scripts/
│   └── build-rules-bundle.js     # 规则库预处理脚本（合并 2884+ JSON）
├── public/
│   └── rules-bundle.json         # 预处理后的规则库（自动生成）
└── src/
    ├── main.tsx                   # 应用入口
    ├── App.tsx                    # 主应用组件
    ├── types/
    │   └── index.ts               # TypeScript 类型定义
    ├── utils/
    │   ├── axmlParser.ts          # AXML 解析工具（已完成）
    │   ├── fuzzyMatcher.ts        # 模糊匹配算法
    │   └── reportGenerator.ts     # 报告生成器
    ├── services/
    │   ├── apkAnalyzer.ts         # APK 分析主逻辑
    │   ├── sdkScanner.ts          # SDK 扫描模块
    │   └── rulesLoader.ts         # 规则库加载管理
    ├── workers/
    │   └── analyzerWorker.ts      # 分析 Worker（后台处理）
    ├── components/
    │   ├── FileUploader.tsx       # 文件上传组件
    │   ├── AnalysisProgress.tsx   # 进度展示组件
    │   ├── ResultTabs.tsx         # 结果 Tab 容器
    │   ├── LibraryList.tsx        # SDK 库列表
    │   ├── XmlViewer.tsx          # XML 内容展示
    │   └── ReportExport.tsx       # 报告导出对话框
    └── styles/
        └── App.css                # 全局样式
\`\`\`

## 开发指南

### 安装依赖

\`\`\`bash
pnpm install
\`\`\`

### 启动开发服务器

\`\`\`bash
pnpm dev
\`\`\`

服务器将在 `http://localhost:3000` 启动。

### 构建生产版本

\`\`\`bash
pnpm build
\`\`\`

构建产物将输出到 `dist/` 目录。

### 规则库预处理

规则库预处理脚本会在 `pnpm dev` 和 `pnpm build` 前自动执行，将 2884+ 个规则文件合并为一个 `public/rules-bundle.json` 文件。

手动执行：
\`\`\`bash
node scripts/build-rules-bundle.js
\`\`\`

## 核心模块说明

### 1. AXML 解析器 (`axmlParser.ts`)
- 将 Android 二进制 XML 转换为普通 XML
- 提取 Manifest 基本信息（包名、版本号等）
- 提取组件列表（Activity、Service、Provider、Receiver）

### 2. 模糊匹配算法 (`fuzzyMatcher.ts`)
采用 7 层级匹配策略：
1. **精确匹配**: 直接匹配规则库键名
2. **基础规范化**: 去除 `lib` 前缀、`.so` 扩展名、转小写
3. **去除版本号**: 移除 `-5.9.7`、`_v2.0` 等版本号
4. **去除构建后缀**: 移除 `-debug`、`-release`、`_arm64` 等
5. **去除包名前缀**: 移除 `com_example_app_` 等包名模式
6. **子串模糊匹配**: 在规则库中查找包含关系
7. **Hash 名称处理**: 检测并标记混淆名称

### 3. SDK 扫描器 (`sdkScanner.ts`)
- 扫描 Native 库（lib 目录下的 .so 文件）
- 扫描 Manifest 组件（Activities/Services/Providers/Receivers）
- 按架构分组（arm64-v8a, armeabi-v7a 等）
- 去重处理

### 4. 规则库管理 (`rulesLoader.ts`)
- 从 IndexedDB 加载规则库
- 支持云端版本检查和自动更新
- 规则库缓存优化

## 项目状态

### ✅ 已完成的功能

#### 核心功能
- ✅ 项目目录结构初始化
- ✅ 规则库预处理脚本（合并 2358 个 JSON 文件，1.75 MB）
- ✅ AXML 解析模块（完整实现，支持 ArrayBuffer）
- ✅ TypeScript 完整类型定义
- ✅ 7 层级模糊匹配算法实现
- ✅ SDK 扫描和匹配模块（Native、Activity、Service、Provider、Receiver）
- ✅ 规则库加载管理（IndexedDB 缓存 + 云端更新）
- ✅ APK 分析主逻辑（完整流程编排）
- ✅ 报告导出功能（HTML/JSON 双格式）

#### UI 组件
- ✅ 文件上传组件（拖拽 + 点击上传，500MB 限制）
- ✅ 分析进度组件（阶段跟踪 + 进度条）
- ✅ 结果 Tab 容器（基本信息 + 统计卡片）
- ✅ SDK 库列表（分类导航 + 展开/折叠）
- ✅ XML 查看器（复制 + 下载）
- ✅ 报告导出对话框（自定义选项）
- ✅ 主应用组件（状态管理 + 错误处理）
- ✅ 完整 CSS 样式（响应式设计 + 动画）

#### 开发环境
- ✅ Vite + React + TypeScript 配置完成
- ✅ 依赖安装完成
- ✅ 开发服务器正常运行（http://localhost:3000）
- ✅ 规则库合并成功（2358 个规则）

### 🚀 可以立即使用

项目已经完全开发完成，可以直接使用！

```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

访问 http://localhost:3000，上传 APK 文件即可开始分析。

### 📊 规则库统计

```
规则库版本: 2025-11-10-1724
总规则数: 2358 个
文件大小: 1.75 MB

规则分布:
- Native 库: 1269 个规则
- Activity: 454 个规则
- Service: 259 个规则
- Provider: 147 个规则
- Receiver: 117 个规则
- Static: 1 个规则
- Actions: 111 个规则
```

## 注意事项

1. **规则库路径**: 确保 `../LibChecker-Rules-4/` 目录存在并包含规则文件
2. **分类映射**: `sdk-categories.json` 文件必须存在于项目根目录
3. **内存优化**: 使用 Web Worker 处理大文件，避免阻塞 UI
4. **离线支持**: 规则库通过 IndexedDB 缓存，支持离线使用

## 许可证

MIT
