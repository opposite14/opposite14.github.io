/* ==========================================================================
   exi的避难所 — 作品数据渲染
   数据源：data/works.json（数据驱动，无后端）
   自动识别三种页面：
     · #worksPreview  首页作品概览（渲染前 4 件）
     · #worksFilter + #worksGrid  作品列表页（分类筛选 + 3 列网格）
     · #workDetail    作品详情页（按 ?id= 渲染单个作品）
   ========================================================================== */
(function () {
  'use strict';

  const CATEGORY_ORDER = ['编程', '设计插画', '视频动画', '写作', '其他'];

  /* HTML 转义，防止数据中的特殊字符破坏结构 */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* 封面：有图显示 <img>，无图显示占位文字（占位，等待用户提供素材） */
  function coverHTML(work, alt) {
    if (work.cover) {
      return '<img src="' + esc(work.cover) + '" alt="' + esc(alt) + '" loading="lazy">';
    }
    return '<span>图片待补充</span>';
  }

  function tagsHTML(tags) {
    return (tags || []).map(function (t) {
      return '<span class="chip">' + esc(t) + '</span>';
    }).join('');
  }

  /* 作品卡片 */
  function cardHTML(work, index) {
    const cover = coverHTML(work, work.title);
    const tags = tagsHTML(work.tags);
    const delay = (index % 4) + 1;
    return (
      '<a class="card work-card reveal" data-delay="' + delay + '" ' +
        'href="work-detail.html?id=' + encodeURIComponent(work.id) + '">' +
        '<div class="work-card__cover">' + cover + '</div>' +
        '<span class="work-card__type">' + esc(work.type) + '</span>' +
        '<div class="work-card__body">' +
          '<h3 class="work-card__title">' + esc(work.title) + '</h3>' +
          '<p class="work-card__desc">' + esc(work.summary || '') + '</p>' +
          (tags ? '<div class="work-card__tags">' + tags + '</div>' : '') +
        '</div>' +
      '</a>'
    );
  }

  /* 首页：作品概览（2×2） */
  function renderPreview(works, container) {
    const list = works.slice(0, 4);
    container.innerHTML = list.map(cardHTML).join('');
    if (window.observeReveals) window.observeReveals();
  }

  /* 作品列表页：分类筛选 + 网格 */
  function renderList(works, grid, filterBar) {
    const cats = CATEGORY_ORDER.filter(function (c) {
      return works.some(function (w) { return w.type === c; });
    });

    let active = '全部';

    function renderFilter() {
      filterBar.innerHTML = '';
      ['全部'].concat(cats).forEach(function (cat) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip' + (cat === active ? ' is-active' : '');
        chip.textContent = cat;
        chip.addEventListener('click', function () {
          if (active === cat) return;
          active = cat;
          renderFilter();
          renderGrid();
        });
        filterBar.appendChild(chip);
      });
    }

    function renderGrid() {
      const list = active === '全部' ? works : works.filter(function (w) { return w.type === active; });
      grid.innerHTML = list.map(cardHTML).join('');
      if (window.observeReveals) window.observeReveals();
    }

    renderFilter();
    renderGrid();
  }

  /* 作品详情页：按 ?id= 渲染 */
  function renderDetail(works, container) {
    const id = new URLSearchParams(window.location.search).get('id');
    const work = works.find(function (w) { return w.id === id; }) || works[0];

    if (!work) {
      container.innerHTML = '<p class="work-detail__desc">未找到该作品。</p>';
      return;
    }

    document.title = work.title + ' · exi的避难所';

    const cover = coverHTML(work, work.title);
    const tags = tagsHTML(work.tags);
    const links = (work.links || [])
      .filter(function (l) { return l && l.url; })
      .map(function (l) {
        return '<a class="btn btn--ghost" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' +
          esc(l.label || '链接') + '</a>';
      }).join('');

    container.innerHTML =
      '<div class="work-detail__cover">' + cover + '</div>' +
      '<div class="work-detail__body">' +
        '<p class="work-detail__type">' + esc(work.type) + '</p>' +
        '<h1 class="work-detail__title">' + esc(work.title) + '</h1>' +
        '<p class="work-detail__desc">' + esc(work.description || work.summary || '') + '</p>' +
        (tags ? '<div class="work-detail__tags">' + tags + '</div>' : '') +
        '<dl class="work-detail__meta">' +
          '<div class="work-detail__meta-row"><dt>时间</dt><dd>' + esc(work.date || '—') + '</dd></div>' +
          '<div class="work-detail__meta-row"><dt>类型</dt><dd>' + esc(work.type) + '</dd></div>' +
        '</dl>' +
        (links ? '<div class="work-detail__links">' + links + '</div>' : '') +
      '</div>';
  }

  /* 初始化：加载数据并识别当前页面 */
  async function init() {
    const preview = document.getElementById('worksPreview');
    const grid = document.getElementById('worksGrid');
    const filterBar = document.getElementById('worksFilter');
    const detail = document.getElementById('workDetail');

    if (!preview && !grid && !detail) return;

    try {
      const res = await fetch('data/works.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const works = data.works || [];

      if (detail)       renderDetail(works, detail);
      else if (grid)    renderList(works, grid, filterBar);
      else if (preview) renderPreview(works, preview);
    } catch (err) {
      const el = detail || grid || preview;
      if (el) el.innerHTML = '<p class="section__sub">作品数据加载失败，请稍后重试。</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
