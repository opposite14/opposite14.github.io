// 极简本地静态服务器（仅用于本地预览，无任何依赖）
// 用法：node serve.js   （默认端口 8000）
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// —— 博客：动态扫描 posts/*.md，生成数据（Markdown 发布，无后端） ——
const POSTS_DIR = path.join(ROOT, 'posts');

/* 解析单篇 Markdown：front matter 元信息 + 正文 */
function parsePost(fileName, raw) {
  const id = fileName.replace(/\.md$/i, '');
  const meta = { id: id, title: id, date: '', tags: [], summary: '', markdown: raw };
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (m) {
    const head = m[1];
    const body = m[2];
    head.split(/\r?\n/).forEach(function (line) {
      const kv = line.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
      if (!kv) return;
      const key = kv[1];
      const val = kv[2].trim();
      if (key === 'title') meta.title = val;
      else if (key === 'date') meta.date = val;
      else if (key === 'summary') meta.summary = val;
      else if (key === 'tags') {
        meta.tags = val.replace(/^\[|\]$/g, '').split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
      }
    });
    meta.markdown = body.replace(/^\r?\n/, '');
  }
  return meta;
}

/* 扫描 posts 目录，按文件名排序，返回文章数组 */
function scanPosts() {
  let files = [];
  try {
    files = fs.readdirSync(POSTS_DIR);
  } catch (e) {
    return [];
  }
  return files
    .filter(function (f) { return f.toLowerCase().endsWith('.md'); })
    .sort()
    .map(function (f) {
      return parsePost(f, fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
    })
    .sort(function (a, b) {
      // 按日期倒序（最新在前），日期相同按 id 倒序
      return String(b.date || '').localeCompare(String(a.date || '')) || b.id.localeCompare(a.id);
    });
}

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  // 博客数据动态生成：GET /data/posts.json → 扫描 posts/*.md
  if (urlPath === '/data/posts.json') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ posts: scanPosts() }));
    return;
  }

  const filePath = path.normalize(path.join(ROOT, urlPath));
  // 防止路径穿越
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('Server running: http://localhost:' + PORT + '/');
});
