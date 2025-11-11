// src/components/XmlViewer.tsx
// XML 内容查看器

interface XmlViewerProps {
  xmlContent: string;
  filename: string;
}

export default function XmlViewer({ xmlContent, filename }: XmlViewerProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(xmlContent).then(() => {
      alert('XML 内容已复制到剪贴板！');
    }).catch(err => {
      console.error('复制失败:', err);
      alert('复制失败，请手动复制');
    });
  };

  const handleDownload = () => {
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_AndroidManifest.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="xml-actions">
        <button className="button" onClick={handleCopy}>
          📋 复制
        </button>
        <button className="button button-secondary" onClick={handleDownload}>
          ⬇️ 下载
        </button>
      </div>

      <div className="xml-viewer">
        <pre>{xmlContent}</pre>
      </div>
    </div>
  );
}
