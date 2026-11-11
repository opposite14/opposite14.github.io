/* ==========================================================================
   exi的避难所 — 背景音乐模块
   行为：加载音乐清单（data/music.json）→ 随机选一首并显示歌名；
        打开页面即尝试播放：优先有声（浏览器允许时打开即出声）；
        被拦截则静音自动播放，用户首次点击/滚动/按键时自动取消静音；
        按钮切换播放/暂停；「下一首」随机切换；播完自动随机下一首。
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const audio = document.getElementById('bgmAudio');
    const btn = document.getElementById('bgmBtn');
    const nextBtn = document.getElementById('bgmNext');
    const now = document.getElementById('bgmNow');
    const hint = document.getElementById('bgmHint');
    const iconPlay = document.getElementById('bgmIconPlay');
    const iconPause = document.getElementById('bgmIconPause');
    if (!audio || !btn) return;

    let songs = [];        // 音乐清单
    let current = null;    // 当前曲目
    let started = false;   // 用户是否已开启声音（已交互/已点播放）
    let hintTimer = null;
    let errorRetries = 0;   // 单曲加载失败自动换歌的重试计数（防死循环）

    function showHint(text, sticky) {
      if (!hint) return;
      hint.textContent = text;
      hint.classList.add('is-show');
      if (hintTimer) clearTimeout(hintTimer);
      if (!sticky) {
        hintTimer = setTimeout(function () {
          hint.classList.remove('is-show');
        }, 2600);
      }
    }

    function updateButton() {
      const playing = !audio.paused && !audio.ended;
      btn.classList.toggle('is-playing', playing);
      btn.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
      if (iconPlay) iconPlay.hidden = playing;
      if (iconPause) iconPause.hidden = !playing;
    }

    function songLabel(song) {
      return song.artist ? (song.title + ' - ' + song.artist) : song.title;
    }

    function setNow(song) {
      if (!now || !song) return;
      const label = songLabel(song);
      now.textContent = '♪ ' + label;
      now.title = label;   // 悬停查看完整歌名
    }

    function pickRandom() {
      if (!songs.length) return null;
      if (songs.length === 1) return songs[0];
      let idx = Math.floor(Math.random() * songs.length);
      let guard = 0;
      while (songs[idx] === current && guard < 10) {
        idx = Math.floor(Math.random() * songs.length);
        guard++;
      }
      return songs[idx];
    }

    function loadSong(song) {
      if (!song) return;
      current = song;
      audio.src = 'assets/music/' + encodeURIComponent(song.file);
      setNow(song);
    }

    function play() {
      audio.play().then(updateButton).catch(function () {
        updateButton();
      });
    }

    function playRandom() {
      loadSong(pickRandom());
      play();
    }

    /* 开启声音（用户已交互）：取消静音并标记已开启 */
    function unmute() {
      if (!started) {
        started = true;
        audio.muted = false;
        showHint('', false);
        if (hint) hint.classList.remove('is-show');
      }
    }

    /* 静音自动播放时：用户首次交互（点击/滚动/按键/触摸）自动取消静音 */
    function bindAutoUnmute() {
      const targets = [
        { el: document, ev: 'pointerdown' },
        { el: document, ev: 'keydown' },
        { el: document, ev: 'touchstart' },
        { el: window, ev: 'scroll' }
      ];
      function onGesture(e) {
        /* 点击 BGM 控件由按钮自身逻辑处理，这里跳过 */
        if (e && e.target && e.target.closest && e.target.closest('.bgm')) return;
        unmute();
        targets.forEach(function (t) { t.el.removeEventListener(t.ev, onGesture, true); });
      }
      targets.forEach(function (t) { t.el.addEventListener(t.ev, onGesture, { capture: true, passive: true }); });
    }

    function toggle() {
      if (!songs.length) {
        showHint('背景音乐尚未添加', false);
        return;
      }
      if (started && !audio.muted && !audio.paused) {
        /* 正在有声播放 → 暂停 */
        audio.pause();
        updateButton();
      } else {
        /* 首次点击 / 静音播放中 / 暂停中 → 开启声音并播放 */
        unmute();
        showHint('正在加载音乐…', false);
        play();
      }
    }

    function next() {
      if (!songs.length) {
        showHint('背景音乐尚未添加', false);
        return;
      }
      unmute();
      playRandom();
    }

    /* 打开页面即尝试播放：优先有声，被拦则静音 + 首次交互出声 */
    function autoplay() {
      audio.muted = false;
      audio.play().then(function () {
        updateButton();
        /* 有声自动播放成功（浏览器允许），打开即出声 */
      }).catch(function () {
        /* 有声被拦截 → 静音自动播放 */
        audio.muted = true;
        audio.play().then(function () {
          updateButton();
          bindAutoUnmute();
          setTimeout(function () {
            if (!started) showHint('背景音乐已静音播放，点击任意处开启声音', true);
          }, 800);
        }).catch(function () {
          /* 静音也失败（罕见）→ 回退提示点击开启 */
          audio.muted = false;
          updateButton();
          setTimeout(function () {
            if (!started) showHint('点击开启背景音乐', true);
          }, 800);
        });
      });
    }

    btn.addEventListener('click', toggle);
    if (nextBtn) nextBtn.addEventListener('click', next);

    audio.addEventListener('play', updateButton);
    audio.addEventListener('pause', updateButton);
    audio.addEventListener('ended', function () {
      if (started) playRandom();
    });
    /* 单曲加载失败（404/网络抖动/超时）：自动换下一首，最多重试 3 次避免死循环 */
    audio.addEventListener('error', function () {
      if (!songs.length || songs.length === 1) return;
      errorRetries++;
      if (errorRetries > 3) return;
      loadSong(pickRandom());
      play();
    });

    /* 加载音乐清单 */
    fetch('data/music.json')
      .then(function (res) { return res.json(); })
      .then(function (list) {
        songs = Array.isArray(list) ? list : [];
        if (!songs.length) {
          if (now) now.textContent = '♪ 暂无音乐';
          setTimeout(function () {
            if (!started) showHint('背景音乐尚未添加', true);
          }, 800);
          return;
        }
        loadSong(pickRandom());
        autoplay();
      })
      .catch(function () {
        if (now) now.textContent = '♪ 音乐清单加载失败';
        setTimeout(function () {
          if (!started) showHint('背景音乐加载失败', true);
        }, 800);
      });
  });
})();
