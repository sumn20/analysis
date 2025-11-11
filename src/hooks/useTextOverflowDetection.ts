/**
 * 自动检测文字是否被框遮挡的 Hook
 *
 * 原理:
 * 1. 监听容器和文字元素的尺寸变化
 * 2. 计算文字元素的底部位置
 * 3. 如果文字超出容器底部，自动增加容器的 padding-bottom
 * 4. 支持响应式调整
 */

import { useEffect, useRef, useState } from 'react';

interface TextOverflowConfig {
  containerSelector: string;      // 容器选择器（如 '.upload-zone'）
  textSelector: string;            // 文字元素选择器（如 '.upload-info'）
  minPaddingBottom?: number;       // 最小底部 padding（默认 40px）
  checkInterval?: number;          // 检查间隔时间（默认 500ms）
  debug?: boolean;                 // 是否输出调试信息
}

export function useTextOverflowDetection({
  containerSelector,
  textSelector,
  minPaddingBottom = 40,
  checkInterval = 500,
  debug = false,
}: TextOverflowConfig) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [adjustedPadding, setAdjustedPadding] = useState<number | null>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout>();
  const observerRef = useRef<ResizeObserver>();

  // 执行检测逻辑
  const checkTextOverflow = () => {
    const container = document.querySelector(containerSelector) as HTMLElement;
    const textElement = document.querySelector(textSelector) as HTMLElement;

    if (!container || !textElement) {
      if (debug) console.warn(`[TextOverflow] 未找到元素: ${containerSelector} 或 ${textSelector}`);
      return;
    }

    // 获取元素的边界矩形
    const containerRect = container.getBoundingClientRect();
    const textRect = textElement.getBoundingClientRect();

    // 计算文字底部相对于容器底部的距离
    // 负数表示文字超出容器底部
    const bottomGap = containerRect.bottom - textRect.bottom;

    if (debug) {
      console.log(`[TextOverflow] 检测结果:`, {
        containerHeight: containerRect.height,
        textBottom: textRect.bottom,
        containerBottom: containerRect.bottom,
        bottomGap: bottomGap.toFixed(2),
        isOverflowing: bottomGap < 0,
      });
    }

    // 如果文字被遮挡
    if (bottomGap < 0) {
      setIsOverflowing(true);

      // 计算需要增加的 padding
      const computedStyle = window.getComputedStyle(container);
      const currentPadding = parseFloat(computedStyle.paddingBottom) || 0;
      const neededPadding = Math.ceil(currentPadding - bottomGap + 8); // 额外 8px 缓冲

      if (debug) {
        console.log(`[TextOverflow] 调整 padding-bottom: ${currentPadding}px → ${neededPadding}px`);
      }

      // 应用新的 padding
      container.style.paddingBottom = `${neededPadding}px`;
      setAdjustedPadding(neededPadding);
    } else {
      // 文字未被遮挡，恢复原始 padding
      if (isOverflowing) {
        setIsOverflowing(false);
        container.style.paddingBottom = '';
        setAdjustedPadding(null);

        if (debug) {
          console.log(`[TextOverflow] 恢复原始 padding-bottom`);
        }
      }
    }
  };

  useEffect(() => {
    // 初始检测
    checkTextOverflow();

    // 定时检测（处理异步加载等情况）
    checkTimeoutRef.current = setInterval(checkTextOverflow, checkInterval);

    // 使用 ResizeObserver 监听容器和文字元素的尺寸变化
    const container = document.querySelector(containerSelector);
    const textElement = document.querySelector(textSelector);

    if (container && textElement) {
      observerRef.current = new ResizeObserver(() => {
        // 清除之前的定时器，立即执行检测
        if (checkTimeoutRef.current) {
          clearInterval(checkTimeoutRef.current);
        }

        checkTextOverflow();

        // 重新开始定时检测
        checkTimeoutRef.current = setInterval(checkTextOverflow, checkInterval);
      });

      observerRef.current.observe(container);
      observerRef.current.observe(textElement);
    }

    // 监听窗口大小变化（响应式）
    const handleResize = () => {
      if (checkTimeoutRef.current) {
        clearInterval(checkTimeoutRef.current);
      }
      checkTextOverflow();
      checkTimeoutRef.current = setInterval(checkTextOverflow, checkInterval);
    };

    window.addEventListener('resize', handleResize);

    // 清理
    return () => {
      if (checkTimeoutRef.current) {
        clearInterval(checkTimeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [containerSelector, textSelector, checkInterval, debug]);

  return {
    isOverflowing,
    adjustedPadding,
  };
}

/**
 * 使用示例:
 *
 * ```tsx
 * export default function FileUploader() {
 *   // 检测 .upload-zone 中的 .upload-info 是否被遮挡
 *   useTextOverflowDetection({
 *     containerSelector: '.upload-zone',
 *     textSelector: '.upload-info',
 *     minPaddingBottom: 40,
 *     debug: false  // 生产环境设为 false
 *   });
 *
 *   return (
 *     <div className="upload-zone">
 *       <p className="upload-info">支持的文件格式: .apk | 最大文件大小: 500MB</p>
 *     </div>
 *   );
 * }
 * ```
 */
