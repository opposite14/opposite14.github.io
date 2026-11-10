// 构建脚本：扫描 posts/*.md，生成静态 data/posts.json（用于部署到纯静态托管如 GitHub Pages）
// 用法：node build.js
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const POSTS_DIR = path.join(ROOT, 'posts');
const OUT = path.join(ROOT, 'data', 'posts.json');

/* 解析单篇 Markdown：front matter 元信息 + 正文（与 serve.js 逻辑保持一致） */
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

/* 扫描 posts 目录，按日期倒序返回文章数组（与 serve.js 逻辑保持一致） */
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
      return String(b.date || '').localeCompare(String(a.date || '')) || b.id.localeCompare(a.id);
    });
}

const posts = scanPosts();
fs.writeFileSync(OUT, JSON.stringify({ posts: posts }, null, 2), 'utf8');
console.log('Generated ' + posts.length + ' posts -> ' + OUT);
