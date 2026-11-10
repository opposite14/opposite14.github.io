/* ==========================================================================
   exi的避难所 — 博客数据渲染
   数据源：data/posts.json（数据驱动，无后端）
   自动识别两种页面：
     · #blogFilter + #blogList + #loadMore  博客列表页（标签筛选 + 加载更多）
     · #article                             博客详情页（按 ?id= 渲染单篇）
   ========================================================================== */
(function () {
  'use strict';

  const PAGE_SIZE = 3; // 列表页每批显示篇数（「加载更多」步长）

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 行内 Markdown → HTML（加粗/斜体/行内代码/链接/图片） */
  function inlineHTML(text) {
    let s = esc(text);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
  }

  /* 轻量 Markdown → HTML（无依赖，支持常见语法） */
  function markdownToHTML(md) {
    const lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
    let html = '';
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const t = line.trim();

      // 代码块 ```
      if (/^```/.test(t)) {
        i++;
        const code = [];
        while (i < lines.length && !/^```/.test(lines[i].trim())) {
          code.push(lines[i]);
          i++;
        }
        i++; // 跳过结束 ```
        html += '<pre><code>' + esc(code.join('\n')) + '</code></pre>';
        continue;
      }
      // 空行
      if (t === '') { i++; continue; }
      // 标题
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const level = h[1].length;
        html += '<h' + level + '>' + inlineHTML(h[2]) + '</h' + level + '>';
        i++;
        continue;
      }
      // 水平线
      if (/^(-{3,}|\*{3,})$/.test(t)) {
        html += '<hr>';
        i++;
        continue;
      }
      // 无序列表
      if (/^[-*+]\s+/.test(t)) {
        const items = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
          items.push('<li>' + inlineHTML(lines[i].replace(/^[-*+]\s+/, '')) + '</li>');
          i++;
        }
        html += '<ul>' + items.join('') + '</ul>';
        continue;
      }
      // 有序列表
      if (/^\d+\.\s+/.test(t)) {
        const items = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          items.push('<li>' + inlineHTML(lines[i].replace(/^\d+\.\s+/, '')) + '</li>');
          i++;
        }
        html += '<ol>' + items.join('') + '</ol>';
        continue;
      }
      // 引用
      if (/^>\s?/.test(t)) {
        const quotes = [];
        while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
          quotes.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        html += '<blockquote>' + inlineHTML(quotes.join('<br>')) + '</blockquote>';
        continue;
      }
      // 段落：收集连续行，直到空行或下一个块级起始；行内换行渲染为 <br>
      const para = [];
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^(#{1,6}\s|```|[-*+]\s+|\d+\.\s+|>\s?)/.test(lines[i])
      ) {
        para.push(lines[i]);
        i++;
      }
      html += '<p>' + inlineHTML(para.join('<br>')) + '</p>';
    }
    return html;
  }

  /* 列表卡片：元信息里的标签（#标签 形式，弱化显示） */
  function tagMarks(tags) {
    return (tags || []).map(function (t) {
      return '<span>#' + esc(t) + '</span>';
    }).join('');
  }

  /* 详情页标签（chip 形式） */
  function tagsHTML(tags) {
    return (tags || []).map(function (t) {
      return '<span class="chip">' + esc(t) + '</span>';
    }).join('');
  }

  function cardHTML(post, index) {
    const delay = (index % 4) + 1;
    const tags = tagMarks(post.tags);
    return (
      '<a class="card post-card reveal" data-delay="' + delay + '" ' +
        'href="blog-detail.html?id=' + encodeURIComponent(post.id) + '">' +
        '<div class="post-card__meta">' +
          '<time class="post-card__date">' + esc(post.date) + '</time>' +
          (tags ? '<div class="post-card__tags">' + tags + '</div>' : '') +
        '</div>' +
        '<h2 class="post-card__title">' + esc(post.title) + '</h2>' +
        '<p class="post-card__excerpt">' + esc(post.summary || '') + '</p>' +
        '<span class="post-card__more">阅读全文 →</span>' +
      '</a>'
    );
  }

  /* 博客列表页：标签筛选 + 加载更多 */
  function renderList(posts, listEl, filterBar, loadMoreBtn) {
    const allTags = [];
    posts.forEach(function (p) {
      (p.tags || []).forEach(function (t) {
        if (allTags.indexOf(t) === -1) allTags.push(t);
      });
    });

    let active = '全部';
    let shown = PAGE_SIZE;

    function filteredPosts() {
      if (active === '全部') return posts;
      return posts.filter(function (p) { return (p.tags || []).indexOf(active) !== -1; });
    }

    function renderFilter() {
      filterBar.innerHTML = '';
      ['全部'].concat(allTags).forEach(function (tag) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip' + (tag === active ? ' is-active' : '');
        chip.textContent = tag;
        chip.addEventListener('click', function () {
          if (active === tag) return;
          active = tag;
          shown = PAGE_SIZE;
          renderFilter();
          renderPosts();
        });
        filterBar.appendChild(chip);
      });
    }

    function renderPosts() {
      const list = filteredPosts();
      const visible = list.slice(0, shown);
      listEl.innerHTML = visible.map(cardHTML).join('');

      /* 空状态 */
      if (visible.length === 0) {
        listEl.innerHTML = '<p class="section__sub" style="text-align:center">该标签下暂无文章。</p>';
      }

      /* 加载更多按钮：还有更多则显示 */
      loadMoreBtn.style.display = shown < list.length ? '' : 'none';
      if (window.observeReveals) window.observeReveals();
    }

    loadMoreBtn.addEventListener('click', function () {
      shown += PAGE_SIZE;
      renderPosts();
    });

    renderFilter();
    renderPosts();
  }

  /* 博客详情页：按 ?id= 渲染 */
  function renderDetail(posts, articleEl) {
    const id = new URLSearchParams(window.location.search).get('id');
    const post = posts.find(function (p) { return p.id === id; }) || posts[0];

    if (!post) {
      articleEl.innerHTML = '<p>未找到该文章。</p>';
      return;
    }

    document.title = post.title + ' · exi的避难所';

    const tags = tagsHTML(post.tags);
    const content = markdownToHTML(post.markdown);

    articleEl.innerHTML =
      '<header class="article__head">' +
        '<div class="article__meta">' +
          '<time>' + esc(post.date) + '</time>' +
          (tags ? '<div style="display:flex;flex-wrap:wrap;gap:8px">' + tags + '</div>' : '') +
        '</div>' +
        '<h1 class="article__title">' + esc(post.title) + '</h1>' +
      '</header>' +
      '<div class="article__content">' + content + '</div>';
  }

  async function init() {
    const listEl = document.getElementById('blogList');
    const filterBar = document.getElementById('blogFilter');
    const loadMoreBtn = document.getElementById('loadMore');
    const articleEl = document.getElementById('article');

    if (!listEl && !articleEl) return;

    try {
      const res = await fetch('data/posts.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const posts = data.posts || [];

      if (articleEl)       renderDetail(posts, articleEl);
      else if (listEl)     renderList(posts, listEl, filterBar, loadMoreBtn);
    } catch (err) {
      const el = articleEl || listEl;
      if (el) el.innerHTML = '<p class="section__sub">文章数据加载失败，请稍后重试。</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
