// src/components/ContactMe.tsx
// 联系我组件

import { useState } from 'react';

interface ContactMeProps {
  onClose: () => void;
}

export default function ContactMe({ onClose }: ContactMeProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 微信二维码图片URL - 您的微信二维码
  const wechatQRCode = `/wechat-qr.jpg?t=${Date.now()}`;

  const handleImageLoad = () => {
    console.log('微信二维码加载成功');
    setImageLoaded(true);
  };

  const handleImageError = (error: any) => {
    console.error('微信二维码加载失败:', error);
    console.error('尝试加载的URL:', wechatQRCode);
    setImageError(true);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content contact-me" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📱 联系我</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="contact-section">
            <h3>🤝 添加微信好友</h3>
            <p>扫描下方二维码或长按保存图片后在微信中识别：</p>
            
            <div className="qr-code-container">
              {!imageLoaded && !imageError && (
                <div className="qr-loading">
                  <div className="loading-spinner"></div>
                  <p>加载中...</p>
                </div>
              )}
              
              {imageError ? (
                <div className="qr-placeholder">
                  <div className="qr-placeholder-content">
                    <div className="qr-placeholder-icon">📱</div>
                    <p>二维码加载失败</p>
                    <p>文件路径: <code>{wechatQRCode}</code></p>
                    <p>请检查文件是否存在</p>
                  </div>
                </div>
              ) : (
                <img
                  src={wechatQRCode}
                  alt="微信二维码"
                  className={`qr-code ${imageLoaded ? 'loaded' : 'loading'}`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )}
            </div>

            <div className="contact-tips">
              <h4>💡 使用提示：</h4>
              <ul>
                <li>手机微信扫一扫功能扫描二维码</li>
                <li>或长按保存图片后在微信中识别</li>
                <li>添加好友时请备注"APK分析工具"</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="footer-note">
            <p>🔒 隐私说明：仅用于技术交流，不会泄露您的个人信息</p>
          </div>
        </div>
      </div>
    </div>
  );
}