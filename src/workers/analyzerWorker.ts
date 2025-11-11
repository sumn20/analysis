// src/workers/analyzerWorker.ts
// APK 分析 Web Worker - 在后台线程处理分析任务，避免阻塞 UI

import { analyzeApk } from '../services/apkAnalyzer';
import { AnalysisProgress, AnalysisResult } from '../types';

// Worker 消息类型
interface WorkerRequest {
  type: 'analyze';
  file: File;
}

interface WorkerResponse {
  type: 'progress' | 'result' | 'error';
  data: AnalysisProgress | AnalysisResult | { message: string };
}

// 监听主线程消息
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type, file } = event.data;

  if (type === 'analyze') {
    try {
      // 执行分析，回调进度
      const result = await analyzeApk(file, (progress) => {
        // 向主线程发送进度更新
        const response: WorkerResponse = {
          type: 'progress',
          data: progress,
        };
        self.postMessage(response);
      });

      // 分析完成，发送结果
      const response: WorkerResponse = {
        type: 'result',
        data: result,
      };
      self.postMessage(response);
    } catch (error) {
      // 分析失败，发送错误
      const response: WorkerResponse = {
        type: 'error',
        data: {
          message: error instanceof Error ? error.message : '分析失败',
        },
      };
      self.postMessage(response);
    }
  }
};

// 导出空对象以满足 TypeScript 模块要求
export {};
