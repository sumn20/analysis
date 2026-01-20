// src/App.tsx
// 主应用组件 - 状态管理和组件编排

import { useState, useEffect } from 'react';
import { AnalysisResult, AnalysisProgress } from './types';
import { analyzeApk } from './services/apkAnalyzer';
import { loadConfig, type AppConfig } from './config';
import { useTextOverflowDetection } from './hooks/useTextOverflowDetection';
import { loadRules } from './services/rulesLoader';
import FileUploader from './components/FileUploader';
import AnalysisProgressComponent from './components/AnalysisProgress';
import ResultTabs from './components/ResultTabs';
import ReportExport from './components/ReportExport';
import AppStoreDownload from './components/AppStoreDownload';
import GooglePlayDownload from './components/GooglePlayDownload';
import ContactMe from './components/ContactMe';
import AnalysisHistory from './components/AnalysisHistory';
import './styles/App.css';

// 应用状态类型
type AppState = 'idle' | 'analyzing' | 'completed' | 'error' | 'history';

// 最近分析记录类型
interface RecentAnalysis {
  id: number;
  fileName: string;
  fileSize: string;
  packageName: string;
  analyzeTime: string;
  result: AnalysisResult;
}

export default function App() {
  // 配置状态
  const [config, setConfig] = useState<AppConfig | null>(null);

  // 应用状态
  const [state, setState] = useState<AppState>('idle');
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAppStoreDialog, setShowAppStoreDialog] = useState(false);
  const [showGooglePlayDialog, setShowGooglePlayDialog] = useState(false);
  const [showContactMe, setShowContactMe] = useState(false);

  // 自动检测页脚信息框是否被遮挡
  useTextOverflowDetection({
    containerSelector: '.footer-info',
    textSelector: '.info-list',
    minPaddingBottom: 20,
    checkInterval: 1000,
    debug: false,
  });

  // 初始化：加载配置和规则
  useEffect(() => {
    const initializeApp = async () => {
      // 1. 加载配置
      const appConfig = await loadConfig();
      setConfig(appConfig);

      // 2. 预加载规则库（背景加载，不阻塞 UI）
      try {
        console.log('⏳ 预加载规则库...');
        const rules = await loadRules();
        if (rules) {
          console.log(`✓ 规则库预加载完成 (${rules.totalRules} 个规则)`);
        }
      } catch (err) {
        console.warn('规则库预加载失败:', err);
        // 不影响应用正常运行
      }
    };
    initializeApp();
  }, []);

  // 最近分析列表状态
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>(() => {
    // 从 localStorage 加载最近的分析记录
    try {
      const stored = localStorage.getItem('recentAnalyses');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // 文件大小验证错误状态
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);

  // 删除确认弹窗状态
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);

  // 处理文件选择
  const handleFileSelect = async (file: File) => {
    setFileSizeError(null);
    setState('analyzing');
    setError(null);
    setProgress({
      stage: 'extracting',
      progress: 0,
      message: '正在提取文件...',
    });

    try {
      // 调用分析服务
      const analysisResult = await analyzeApk(file, (progressUpdate) => {
        setProgress(progressUpdate);
      });

      // 分析完成
      setResult(analysisResult);
      setState('completed');
      setProgress(null);

      // 添加到最近分析列表
      const fileSizeFormatted = (file.size / 1024 / 1024).toFixed(2) + ' MB';
      const newRecord: RecentAnalysis = {
        id: Date.now(),
        fileName: file.name,
        fileSize: fileSizeFormatted,
        packageName: analysisResult.basic.packageName,
        analyzeTime: new Date().toLocaleString('zh-CN'),
        result: analysisResult,
      };

      // 根据 bundle id 去重：移除相同 packageName 的旧记录
      const deduplicatedList = recentAnalyses.filter(
        (record) => record.packageName !== analysisResult.basic.packageName
      );

      // 将新记录添加到列表顶部，并限制列表大小为 10
      const updated = [newRecord, ...deduplicatedList].slice(0, 10);
      setRecentAnalyses(updated);
      localStorage.setItem('recentAnalyses', JSON.stringify(updated));
    } catch (err) {
      console.error('分析失败:', err);
      setState('error');
      setError(err instanceof Error ? err.message : '分析过程中发生未知错误');
      setProgress(null);
    }
  };

  // 处理文件验证错误
  const handleFileValidationError = (errorMessage: string) => {
    setFileSizeError(errorMessage);
  };

  // 查看历史分析结果
  const handleQuickReanalyze = (record: RecentAnalysis) => {
    setFileSizeError(null);
    // 直接加载缓存的分析结果并跳转到结果页面
    setResult(record.result);
    setState('completed');
  };

  // 查看历史记录
  const handleViewHistory = () => {
    setState('history');
  };

  // 清空所有历史记录
  const handleClearAllHistory = () => {
    setRecentAnalyses([]);
    localStorage.setItem('recentAnalyses', JSON.stringify([]));
  };

  // 删除分析记录
  const handleDeleteRecord = (recordId: number) => {
    const updated = recentAnalyses.filter(record => record.id !== recordId);
    setRecentAnalyses(updated);
    localStorage.setItem('recentAnalyses', JSON.stringify(updated));
    setDeletingRecordId(null);
  };

  // 重置状态（返回上传页面）
  const handleReset = () => {
    setState('idle');
    setResult(null);
    setError(null);
    setProgress(null);
    setShowExportModal(false);
    setFileSizeError(null);
  };

  // 打开导出对话框
  const handleExport = () => {
    setShowExportModal(true);
  };

  // 关闭导出对话框
  const handleCloseExport = () => {
    setShowExportModal(false);
  };

  return (
    <div className="app">
      {/* 全局 Header - 根据状态显示不同内容 */}
      <header className="app-header">
        <div className="header-content">
          <div>
            {state === 'history' ? (
              <>
                <h1>📋 分析历史</h1>
                <p className="subtitle">查看和管理您的 APK 分析记录</p>
              </>
            ) : (
              <>
                <h1>🔍 APK SDK 分析工具</h1>
                <p className="subtitle">快速识别 Android 应用中的 SDK 和第三方库</p>
                {/* 下载按钮组 - 首页显示，分析时隐藏 */}
                {(state === 'idle' || state === 'completed') && (
                  <div className="subtitle-actions">
                    <button 
                      className="btn btn-sm btn-primary" 
                      onClick={() => setShowAppStoreDialog(true)}
                    >
                      📱 应用宝下载
                    </button>
                    <button 
                      className="btn btn-sm btn-success" 
                      onClick={() => setShowGooglePlayDialog(true)}
                    >
                      🌐 Google Play 下载
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* 结果页面显示操作按钮 */}
        {state === 'completed' && (
          <div className="header-actions">
            <button className="btn btn-sm btn-secondary" onClick={handleExport}>
              导出报告
            </button>
            <button className="btn btn-sm btn-secondary" onClick={handleReset}>
              重新分析
            </button>
          </div>
        )}
      </header>

      {/* 主内容区域 */}
      <main className="app-main">
        {/* 空闲状态 - 显示上传界面 */}
        {state === 'idle' && (
          <div className="upload-analyze-container">
            <FileUploader
              onFileSelect={handleFileSelect}
              disabled={false}
              recentAnalyses={recentAnalyses}
              onQuickReanalyze={handleQuickReanalyze}
              onViewHistory={handleViewHistory}
              onDeleteRecord={handleDeleteRecord}
              fileValidationError={fileSizeError}
              onValidationError={handleFileValidationError}
              deletingRecordId={deletingRecordId}
              onSetDeletingRecordId={setDeletingRecordId}
            />
          </div>
        )}

        {/* 分析中 - 显示进度 */}
        {state === 'analyzing' && progress && (
          <div className="upload-analyze-container">
            <AnalysisProgressComponent progress={progress} />
          </div>
        )}

        {/* 分析完成 - 显示结果 */}
        {state === 'completed' && result && (
          <div className="result-container">
            <ResultTabs
              result={result}
              onExport={handleExport}
              onReset={handleReset}
            />
          </div>
        )}

        {/* 错误状态 - 显示错误信息 */}
        {state === 'error' && (
          <div className="upload-analyze-container">
            <div className="card error-card">
              <div className="error-icon">❌</div>
              <h2>分析失败</h2>
              <p className="error-message">{error}</p>
              <button className="button" onClick={handleReset}>
                重新上传
              </button>
            </div>
          </div>
        )}

        {/* 历史记录页面 */}
        {state === 'history' && (
          <div className="upload-analyze-container">
            <AnalysisHistory
              recentAnalyses={recentAnalyses}
              onQuickReanalyze={handleQuickReanalyze}
              onBackToUpload={handleReset}
              onDeleteRecord={handleDeleteRecord}
              onClearAllHistory={handleClearAllHistory}
            />
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="app-footer">
        {config && (
          <>
            <div className="footer-content">
              {/* 项目链接 - 如果配置了 URL 才显示 */}
              {config.footer.projectUrl && config.footer.projectLabel && (
                <div className="footer-project">
                  <p>
                    基于{' '}
                    <a
                      href={config.footer.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={config.footer.projectUrl}
                    >
                      {config.footer.projectLabel}
                    </a>{' '}
                    | 支持识别 2800+ SDK |{' '}
                    <button
                      className="contact-me-btn"
                      onClick={() => setShowContactMe(true)}
                      title="联系开发者"
                    >
                      联系我
                    </button>
                  </p>
                </div>
              )}

              {/* ICP 备案信息 - 只有启用且有值才显示 */}
              {config.footer.icp?.enabled &&
               config.footer.icp.number &&
               config.footer.icp.url && (
                <div className="footer-icp">
                  <a
                    href={config.footer.icp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={config.footer.icp.label || 'ICP 备案号'}
                    className="icp-link"
                  >
                    {config.footer.icp.number}
                  </a>
                </div>
              )}
            </div>

            {/* 版权信息 - 只有值存在才显示 */}
            {config.footer.copyright && config.footer.copyright.trim() && (
              <div className="footer-copyright">
                {config.footer.copyright}
              </div>
            )}
          </>
        )}
      </footer>

      {/* 导出对话框 */}
      {showExportModal && result && (
        <ReportExport result={result} onClose={handleCloseExport} />
      )}

      {/* 应用宝下载对话框 */}
      {showAppStoreDialog && (
        <AppStoreDownload onClose={() => setShowAppStoreDialog(false)} />
      )}

      {/* Google Play下载对话框 */}
      {showGooglePlayDialog && (
        <GooglePlayDownload onClose={() => setShowGooglePlayDialog(false)} />
      )}

      {/* 联系我对话框 */}
      {showContactMe && (
        <ContactMe onClose={() => setShowContactMe(false)} />
      )}
    </div>
  );
}
