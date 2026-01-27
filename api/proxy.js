// Vercel Serverless Function - CORS代理
export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持GET请求' });
  }

  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ 
      error: '缺少URL参数',
      usage: '/api/proxy?url=https://example.com'
    });
  }

  try {
    // 验证URL
    const targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: '只支持HTTP和HTTPS协议' });
    }

    console.log(`🌐 代理请求: ${url}`);

    // 发起请求
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = await response.text();
    
    // 设置响应头
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/html; charset=utf-8');
    res.setHeader('X-Proxy-Status', 'success');
    res.setHeader('X-Target-URL', url);
    
    res.status(200).send(content);
    console.log(`✅ 代理成功: ${url}`);

  } catch (error) {
    console.error(`❌ 代理失败: ${url}`, error.message);
    
    res.status(500).json({
      error: '代理请求失败',
      message: error.message,
      url: url,
      timestamp: new Date().toISOString()
    });
  }
}