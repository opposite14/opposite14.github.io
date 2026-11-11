/* ==========================================================================
   exi的避难所 — 全局脚本
   职责：背景视频/微光粒子、导航交互、平滑滚动、scroll reveal、页脚年份
   ========================================================================== */
(function () {
  'use strict';

  /* 大文件（音乐/视频）走 jsDelivr CDN 加速：国内访问 GitHub Pages 不稳定，本地预览用相对路径 */
  var CDN_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? ''
    : 'https://cdn.jsdelivr.net/gh/opposite14/opposite14.github.io@main/';

  /* ---------------------------------------------------------------
     工具函数
     --------------------------------------------------------------- */
  /** 当前页面文件名（根路径视为 index.html） */
  function currentPage() {
    const p = window.location.pathname.split('/').pop();
    return p || 'index.html';
  }

  /* ---------------------------------------------------------------
     背景层：背景视频 + 漂浮微光粒子
     --------------------------------------------------------------- */
  function initBackground() {
    const bg = document.getElementById('bg');
    if (!bg) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* 背景视频（用户提供壁纸）：静音自动循环播放，加载失败时由渐变兜底 */
    const video = document.createElement('video');
    video.className = 'bg-video';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = !reduced;
    video.preload = 'auto';
    video.setAttribute('aria-hidden', 'true');
    const vSrc = document.createElement('source');
    vSrc.src = CDN_BASE + 'assets/video/background.mp4';
    vSrc.type = 'video/mp4';
    video.appendChild(vSrc);
    bg.appendChild(video);

    /* 视频上方的柔和遮罩：保证文字可读性 */
    const overlay = document.createElement('div');
    overlay.className = 'bg-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    bg.appendChild(overlay);

    if (!reduced) {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () { /* 自动播放被拦截时静默忽略 */ });
    }

    /* 微光粒子 */
    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      const el = document.createElement('span');
      el.className = 'particle';
      const size = 3 + Math.random() * 4;
      el.style.width = size + 'px';
      el.style.height = size + 'px';
      el.style.left = Math.random() * 100 + '%';
      el.style.setProperty('--rise', (12 + Math.random() * 14) + 's');
      el.style.setProperty('--px', (Math.random() * 80 - 40) + 'px');
      el.style.setProperty('--po', String(0.35 + Math.random() * 0.45));
      el.style.animationDelay = (-Math.random() * 20) + 's';
      if (reduced) el.style.animation = 'none';
      bg.appendChild(el);
    }
  }

  /* ---------------------------------------------------------------
     导航：滚动状态、移动端折叠、当前页高亮
     --------------------------------------------------------------- */
  function initNav() {
    const nav = document.getElementById('nav');
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (!nav) return;

    function closeMenu() {
      if (links) {
        links.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    }

    if (toggle && links) {
      toggle.addEventListener('click', function () {
        const open = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
    }

    /* 点击链接后收起菜单 */
    if (links) {
      links.addEventListener('click', function (e) {
        if (e.target.closest('a')) closeMenu();
      });
    }

    function updateNav() {
      if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8);

      if (!links) return;
      const page = currentPage();
      const y = window.scrollY;
      const about = document.getElementById('about');
      const inAbout = about ? y >= about.offsetTop - 120 : false;

      links.querySelectorAll('a').forEach(function (a) {
        const href = a.getAttribute('href') || '';
        let active = false;
        if (href === 'index.html')            active = page === 'index.html' && !inAbout;
        else if (href === 'index.html#about') active = page === 'index.html' && inAbout;
        else if (href === 'works.html')       active = page === 'works.html' || page === 'work-detail.html';
        else if (href === 'blog.html')        active = page === 'blog.html' || page === 'blog-detail.html';
        a.classList.toggle('is-active', active);
      });
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  /* ---------------------------------------------------------------
     平滑滚动：同页锚点（首页「关于」）不触发整页跳转
     --------------------------------------------------------------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href*="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const href = a.getAttribute('href') || '';
        const idx = href.indexOf('#');
        if (idx === -1) return;
        const path = href.slice(0, idx);
        const hash = href.slice(idx + 1);
        if (!hash) return;

        const page = currentPage();
        const isSamePage = path === '' || path === page;
        if (!isSamePage) return;

        const target = document.getElementById(hash);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        try {
          history.pushState(null, '', '#' + hash);
        } catch (e) { /* 某些环境（如 file://）不支持，忽略即可 */ }
      });
    });
  }

  /* ---------------------------------------------------------------
     滚动入场动画（scroll reveal）
     --------------------------------------------------------------- */
  let revealObserver = null;

  function observeReveals() {
    const els = document.querySelectorAll('.reveal:not(.is-visible)');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    }
    els.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------------------------------------------------------------
     页脚年份 & 页面初始化
     --------------------------------------------------------------- */
  function initFooterYear() {
    const y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  document.addEventListener('DOMContentLoaded', function () {
    initBackground();
    initNav();
    initSmoothScroll();
    initFooterYear();
    observeReveals();

    /* 页面加载时若带 hash，滚动到对应区块 */
    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        requestAnimationFrame(function () {
          target.scrollIntoView({ block: 'start' });
        });
      }
    }
  });

  /* 暴露给数据驱动页面：动态渲染后重新观察 reveal 元素 */
  window.observeReveals = observeReveals;
})();
