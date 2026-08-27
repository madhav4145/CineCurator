

const UI = (() => {
  const FALLBACK_POSTER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="445" viewBox="0 0 300 445">
        <rect width="300" height="445" fill="#171b26"/>
        <g fill="none" stroke="#3a4152" stroke-width="2">
          <rect x="20" y="20" width="260" height="405" rx="6"/>
          <path d="M20 330 L110 240 L160 290 L210 220 L280 300" />
          <circle cx="95" cy="90" r="26"/>
        </g>
        <text x="150" y="410" fill="#6b7284" font-family="sans-serif" font-size="16" text-anchor="middle">No Poster</text>
      </svg>
    `);

  function ensureToastRoot() {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      root.className = 'toast-root';
      root.setAttribute('aria-live', 'polite');
      root.setAttribute('aria-atomic', 'true');
      document.body.appendChild(root);
    }
    return root;
  }

  function toast(message, variant = 'default') {
    const root = ensureToastRoot();
    const el = document.createElement('div');
    el.className = `toast toast--${variant}`;
    el.textContent = message;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--show'));
    setTimeout(() => {
      el.classList.remove('toast--show');
      setTimeout(() => el.remove(), 300);
    }, 2600);
  }

 
  function safe(field, fallback = 'Unknown') {
    return !field || field === 'N/A' ? fallback : field;
  }

  function typeLabel(type) {
    if (type === 'series') return 'Series';
    if (type === 'episode') return 'Episode';
    return 'Movie';
  }

  function createCard(item) {
    const card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('data-imdb-id', item.imdbID);

    const isFav = Storage.Favorites.has(item.imdbID);
    const isWatch = Storage.Watchlist.has(item.imdbID);
    const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : FALLBACK_POSTER;
    const rating = item.imdbRating && item.imdbRating !== 'N/A' ? item.imdbRating : null;

    card.innerHTML = `
      <div class="card__poster-wrap">
        <img class="card__poster" src="${FALLBACK_POSTER}" data-src="${poster}" alt="Poster for ${safe(item.Title)}" loading="lazy" />
        <span class="card__type-badge">${typeLabel(item.Type)}</span>
        ${rating ? `<span class="card__rating"><i class="fa-solid fa-star"></i> ${rating}</span>` : ''}
        <div class="card__hover-actions">
          <button class="icon-btn card__quickview" type="button" aria-label="Quick view ${safe(item.Title)}" title="Quick view">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="icon-btn card__fav ${isFav ? 'is-active' : ''}" type="button" aria-pressed="${isFav}" aria-label="Toggle favorite" title="Favorite">
            <i class="fa-solid fa-heart"></i>
          </button>
          <button class="icon-btn card__watch ${isWatch ? 'is-active' : ''}" type="button" aria-pressed="${isWatch}" aria-label="Toggle watchlist" title="Watchlist">
            <i class="fa-solid fa-bookmark"></i>
          </button>
        </div>
      </div>
      <div class="card__body">
        <h3 class="card__title"><a href="details.html?id=${item.imdbID}">${safe(item.Title)}</a></h3>
        <p class="card__meta">${safe(item.Year)} ${item.Genre ? '· ' + safe(item.Genre) : ''}</p>
      </div>
    `;

    lazyLoadImage(card.querySelector('.card__poster'));

    card.querySelector('.card__quickview').addEventListener('click', (e) => {
      e.preventDefault();
      openQuickView(item.imdbID);
    });

    const favBtn = card.querySelector('.card__fav');
    favBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const nowFav = Storage.Favorites.toggle(item);
      favBtn.classList.toggle('is-active', nowFav);
      favBtn.setAttribute('aria-pressed', String(nowFav));
      if (nowFav) pulse(favBtn);
      toast(nowFav ? '♥ Added to Favorites' : 'Removed from Favorites');
      document.dispatchEvent(new CustomEvent('cine:favorites-changed'));
    });

    const watchBtn = card.querySelector('.card__watch');
    watchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const nowWatch = Storage.Watchlist.toggle(item);
      watchBtn.classList.toggle('is-active', nowWatch);
      watchBtn.setAttribute('aria-pressed', String(nowWatch));
      if (nowWatch) pulse(watchBtn);
      toast(nowWatch ? '✓ Added to Watchlist' : 'Removed from Watchlist');
      document.dispatchEvent(new CustomEvent('cine:watchlist-changed'));
    });

    return card;
  }

  function lazyLoadImage(imgEl) {
    if (!imgEl) return;
    const load = () => {
      const src = imgEl.getAttribute('data-src');
      if (!src) return;
      const probe = new Image();
      probe.onload = () => imgEl.src = src;
      probe.onerror = () => imgEl.src = FALLBACK_POSTER;
      probe.src = src;
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            load();
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '200px' });
      io.observe(imgEl);
    } else {
      load();
    }
  }

  function renderGrid(container, items) {
    container.innerHTML = '';
    if (!items || items.length === 0) return;
    const frag = document.createDocumentFragment();
    items.forEach((item) => frag.appendChild(createCard(item)));
    container.appendChild(frag);
  }

  function renderSkeletons(container, count = 8) {
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const sk = document.createElement('div');
      sk.className = 'skeleton-card';
      sk.innerHTML = `
        <div class="skeleton skeleton-poster"></div>
        <div class="skeleton skeleton-line" style="width:80%"></div>
        <div class="skeleton skeleton-line" style="width:50%"></div>
      `;
      frag.appendChild(sk);
    }
    container.appendChild(frag);
  }

  function renderEmptyState(container, { icon = 'fa-clapperboard', title, message }) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid ${icon}"></i>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
    `;
  }

  function renderErrorState(container, message, onRetry) {
    container.innerHTML = `
      <div class="empty-state empty-state--error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Something went wrong</h3>
        <p>${message}</p>
        <button class="btn btn--primary" id="retry-btn" type="button">Try again</button>
      </div>
    `;
    const btn = container.querySelector('#retry-btn');
    if (btn && onRetry) btn.addEventListener('click', onRetry);
  }

  function pulse(el) {
    if (!el) return;
    el.classList.remove('cine-pulse');
    void el.offsetWidth; 
    el.classList.add('cine-pulse');
    el.addEventListener('animationend', () => el.classList.remove('cine-pulse'), { once: true });
  }

  function ratingControl(imdbID, { onChange } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'rating-control';
    wrap.setAttribute('role', 'radiogroup');
    wrap.setAttribute('aria-label', 'Your rating');

    let current = Storage.Ratings.get(imdbID);

    function paint(value) {
      wrap.querySelectorAll('.rating-control__star').forEach((star, i) => {
        star.classList.toggle('is-filled', i < value);
      });
    }

    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('button');
      star.type = 'button';
      star.className = 'rating-control__star';
      star.setAttribute('aria-label', `Rate ${i} star${i > 1 ? 's' : ''}`);
      star.innerHTML = '<i class="fa-solid fa-star"></i>';
      star.addEventListener('mouseenter', () => paint(i));
      star.addEventListener('focus', () => paint(i));
      star.addEventListener('blur', () => paint(current));
      star.addEventListener('click', () => {
        current = Storage.Ratings.set(imdbID, current === i ? 0 : i);
        paint(current);
        pulse(wrap);
        toast(current ? `Rated ${current} star${current > 1 ? 's' : ''}` : 'Rating cleared');
        if (onChange) onChange(current);
      });
      wrap.appendChild(star);
    }
    wrap.addEventListener('mouseleave', () => paint(current));
    paint(current);
    return wrap;
  }

  function attachRatingRow(cardEl, item) {
    const body = cardEl && cardEl.querySelector('.card__body');
    if (!body) return;
    const row = document.createElement('div');
    row.className = 'card__rating-row';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'card__rating-label';
    labelSpan.textContent = 'Your rating';
    row.appendChild(labelSpan);
    row.appendChild(ratingControl(item.imdbID));
    body.appendChild(row);
  }

  function trailerSearchUrl(title, year) {
    const y = year && year !== 'N/A' ? ` ${year}` : '';
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title}${y} official trailer`)}`;
  }


  let lastFocusedEl = null;

  function ensureModal() {
    let modal = document.getElementById('quickview-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'quickview-modal';
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Quick view');
    modal.innerHTML = `
      <div class="modal">
        <button class="modal__close" type="button" aria-label="Close quick view"><i class="fa-solid fa-xmark"></i></button>
        <div class="modal__content" id="modal-content"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeQuickView();
    });
    modal.querySelector('.modal__close').addEventListener('click', closeQuickView);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeQuickView();
    });
    return modal;
  }

  function closeQuickView() {
    const modal = document.getElementById('quickview-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  async function openQuickView(imdbID) {
    const modal = ensureModal();
    const content = modal.querySelector('#modal-content');
    lastFocusedEl = document.activeElement;

    content.innerHTML = `<div class="modal__loading"><div class="spinner"></div><p>Loading details…</p></div>`;
    modal.classList.add('is-open');
    document.body.classList.add('no-scroll');
    modal.querySelector('.modal__close').focus();

    try {
      const data = await API.getById(imdbID);
      const isFav = Storage.Favorites.has(data.imdbID);
      const isWatch = Storage.Watchlist.has(data.imdbID);
      const poster = data.Poster && data.Poster !== 'N/A' ? data.Poster : FALLBACK_POSTER;

      content.innerHTML = `
        <div class="quickview">
          <img class="quickview__poster" src="${poster}" alt="Poster for ${safe(data.Title)}" />
          <div class="quickview__info">
            <p class="quickview__type">${typeLabel(data.Type)} ${data.Year ? '· ' + safe(data.Year) : ''}</p>
            <h2 class="quickview__title">${safe(data.Title)}</h2>
            <div class="quickview__stats">
              ${data.imdbRating && data.imdbRating !== 'N/A' ? `<span><i class="fa-solid fa-star"></i> ${data.imdbRating}/10</span>` : ''}
              ${data.Runtime && data.Runtime !== 'N/A' ? `<span><i class="fa-regular fa-clock"></i> ${data.Runtime}</span>` : ''}
              ${data.Rated && data.Rated !== 'N/A' ? `<span class="pill">${data.Rated}</span>` : ''}
            </div>
            <p class="quickview__genre">${safe(data.Genre)}</p>
            <p class="quickview__plot">${safe(data.Plot, 'No synopsis available.')}</p>
            <p class="quickview__meta"><strong>Director:</strong> ${safe(data.Director)}</p>
            <p class="quickview__meta"><strong>Cast:</strong> ${safe(data.Actors)}</p>
            <div class="quickview__rating-row">
              <span class="card__rating-label">Your rating</span>
              <div id="qv-rating-slot"></div>
            </div>
            <div class="quickview__actions">
              <button class="btn btn--outline" id="qv-fav" aria-pressed="${isFav}">
                <i class="fa-solid fa-heart"></i> ${isFav ? 'In Favorites' : 'Add to Favorites'}
              </button>
              <button class="btn btn--outline" id="qv-watch" aria-pressed="${isWatch}">
                <i class="fa-solid fa-bookmark"></i> ${isWatch ? 'In Watchlist' : 'Add to Watchlist'}
              </button>
              <a class="btn btn--outline" href="${trailerSearchUrl(data.Title, data.Year)}" target="_blank" rel="noopener noreferrer">
                <i class="fa-brands fa-youtube"></i> Trailer
              </a>
              <a class="btn btn--primary" href="details.html?id=${data.imdbID}">Full Details <i class="fa-solid fa-arrow-right"></i></a>
            </div>
          </div>
        </div>
      `;

      content.querySelector('#qv-rating-slot').appendChild(ratingControl(data.imdbID));

      const favBtn = content.querySelector('#qv-fav');
      favBtn.addEventListener('click', () => {
        const nowFav = Storage.Favorites.toggle(data);
        favBtn.setAttribute('aria-pressed', String(nowFav));
        favBtn.innerHTML = `<i class="fa-solid fa-heart"></i> ${nowFav ? 'In Favorites' : 'Add to Favorites'}`;
        if (nowFav) pulse(favBtn);
        toast(nowFav ? '♥ Added to Favorites' : 'Removed from Favorites');
        document.dispatchEvent(new CustomEvent('cine:favorites-changed'));
      });
      const watchBtn = content.querySelector('#qv-watch');
      watchBtn.addEventListener('click', () => {
        const nowWatch = Storage.Watchlist.toggle(data);
        watchBtn.setAttribute('aria-pressed', String(nowWatch));
        watchBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> ${nowWatch ? 'In Watchlist' : 'Add to Watchlist'}`;
        if (nowWatch) pulse(watchBtn);
        toast(nowWatch ? '✓ Added to Watchlist' : 'Removed from Watchlist');
        document.dispatchEvent(new CustomEvent('cine:watchlist-changed'));
      });
    } catch (err) {
      content.innerHTML = `
        <div class="modal__loading">
          <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem;color:var(--accent-2)"></i>
          <p>${err.message || 'Could not load details.'}</p>
        </div>
      `;
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-toggle i').forEach((icon) => {
      icon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    });
  }

  function initTheme() {
    applyTheme(Storage.Theme.get());
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = Storage.Theme.get() === 'dark' ? 'light' : 'dark';
        Storage.Theme.set(next);
        applyTheme(next);
      });
    });
  }

 
  function initNavbar() {
    const toggle = document.querySelector('.navbar__burger');
    const menu = document.querySelector('.navbar__menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const isOpen = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar__menu a').forEach((a) => {
      const href = a.getAttribute('href');
      if (href === path) a.classList.add('is-current');
    });

    let lastScroll = 0;
    const nav = document.querySelector('.navbar');
    if (nav) {
      window.addEventListener('scroll', () => {
        const y = window.scrollY;
        nav.classList.toggle('navbar--scrolled', y > 10);
        lastScroll = y;
      }, { passive: true });
    }
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  let paletteState = { results: [], activeIndex: -1 };

  function isTypingContext(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  function ensurePalette() {
    let overlay = document.getElementById('cmdk-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'cmdk-overlay';
    overlay.className = 'cmdk-overlay';
    overlay.innerHTML = `
      <div class="cmdk" role="dialog" aria-modal="true" aria-label="Quick search">
        <div class="cmdk__input-row">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="cmdk-input" placeholder="Search movies, series, TV shows…" autocomplete="off" />
          <kbd>Esc</kbd>
        </div>
        <div class="cmdk__results" id="cmdk-results"></div>
        <div class="cmdk__footer">
          <span><kbd>&uarr;</kbd><kbd>&darr;</kbd> Navigate</span>
          <span><kbd>&crarr;</kbd> Select</span>
          <span><kbd>/</kbd> or <kbd>Ctrl K</kbd> Open anywhere</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#cmdk-input');
    const results = overlay.querySelector('#cmdk-results');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePalette();
    });

    const runQuery = debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) {
        renderPaletteIdle(results);
        return;
      }
      results.innerHTML = `<div class="cmdk__hint">Searching…</div>`;
      try {
        const data = await API.search(q, { page: 1 });
        paletteState.results = (data.Search || []).slice(0, 6);
        paletteState.activeIndex = paletteState.results.length ? 0 : -1;
        renderPaletteResults(results, q);
      } catch (err) {
        paletteState.results = [];
        paletteState.activeIndex = -1;
        results.innerHTML = `<div class="cmdk__hint">${err && err.message ? safe(err.message) : 'No matches found.'}</div>`;
      }
    }, 300);

    input.addEventListener('input', runQuery);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        movePaletteActive(1, results);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        movePaletteActive(-1, results);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = paletteState.results[paletteState.activeIndex];
        const q = input.value.trim();
        if (active) {
          window.location.href = `details.html?id=${active.imdbID}`;
        } else if (q) {
          window.location.href = `search.html?q=${encodeURIComponent(q)}`;
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) closePalette();
    });

    return overlay;
  }

  function renderPaletteIdle(container) {
    const recents = Storage.RecentSearches.getAll().slice(0, 5);
    if (!recents.length) {
      container.innerHTML = `<div class="cmdk__hint">Start typing to search the entire catalog.</div>`;
      return;
    }
    container.innerHTML = `<div class="cmdk__label">Recent searches</div>` + recents.map((r) =>
      `<button type="button" class="cmdk__item cmdk__item--recent" data-term="${safe(r)}"><i class="fa-solid fa-clock-rotate-left"></i><span class="cmdk__item-title">${safe(r)}</span></button>`
    ).join('');
    container.querySelectorAll('.cmdk__item--recent').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('cmdk-input');
        input.value = btn.getAttribute('data-term');
        input.dispatchEvent(new Event('input'));
        input.focus();
      });
    });
  }

  function renderPaletteResults(container, query) {
    if (!paletteState.results.length) {
      container.innerHTML = `<div class="cmdk__hint">No matches for "${safe(query)}". Press Enter to search the full catalog.</div>`;
      return;
    }
    container.innerHTML = paletteState.results.map((item, i) => {
      const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : FALLBACK_POSTER;
      return `
        <button type="button" class="cmdk__item ${i === paletteState.activeIndex ? 'is-active' : ''}" data-index="${i}" data-id="${item.imdbID}">
          <img src="${poster}" alt="" loading="lazy" />
          <span class="cmdk__item-info">
            <span class="cmdk__item-title">${safe(item.Title)}</span>
            <span class="cmdk__item-meta">${safe(item.Year)} · ${typeLabel(item.Type)}</span>
          </span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      `;
    }).join('');
    container.querySelectorAll('.cmdk__item').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.href = `details.html?id=${btn.getAttribute('data-id')}`;
      });
      btn.addEventListener('mouseenter', () => {
        paletteState.activeIndex = parseInt(btn.getAttribute('data-index'), 10);
        highlightPaletteActive(container);
      });
    });
  }

  function movePaletteActive(delta, container) {
    const n = paletteState.results.length;
    if (!n) return;
    paletteState.activeIndex = (paletteState.activeIndex + delta + n) % n;
    highlightPaletteActive(container);
  }

  function highlightPaletteActive(container) {
    container.querySelectorAll('.cmdk__item').forEach((btn, i) => {
      btn.classList.toggle('is-active', i === paletteState.activeIndex);
    });
    const activeEl = container.querySelector('.cmdk__item.is-active');
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
  }

  function openPalette() {
    const overlay = ensurePalette();
    overlay.classList.add('is-open');
    document.body.classList.add('no-scroll');
    paletteState = { results: [], activeIndex: -1 };
    const input = overlay.querySelector('#cmdk-input');
    input.value = '';
    renderPaletteIdle(overlay.querySelector('#cmdk-results'));
    setTimeout(() => input.focus(), 10);
  }

  function closePalette() {
    const overlay = document.getElementById('cmdk-overlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
  }

  function initCommandPalette() {
    document.addEventListener('keydown', (e) => {
      const isCombo = e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey);
      const isSlash = e.key === '/' && !isTypingContext(e.target);
      if (isCombo || isSlash) {
        e.preventDefault();
        openPalette();
      }
    });
  }

  function initSurpriseMe() {
    const btn = document.querySelector('.navbar__dice');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('is-loading')) return;
      btn.classList.add('is-loading');
      try {
        const pools = [
          ...(CONFIG.SEED_TERMS.trending || []),
          ...(CONFIG.SEED_TERMS.movies || []),
          ...(CONFIG.SEED_TERMS.series || []),
          ...(CONFIG.SEED_TERMS.tvshows || []),
          ...CONFIG.MOODS.flatMap((m) => [...m.movie, ...m.series])
        ];
        const term = pools[Math.floor(Math.random() * pools.length)];
        const data = await API.search(term, { page: 1 });
        const list = data.Search || [];
        if (!list.length) throw new Error('empty');
        const pick = list[Math.floor(Math.random() * list.length)];
        await openQuickView(pick.imdbID);
      } catch {
        toast('Could not find a surprise — try again!', 'error');
      } finally {
        btn.classList.remove('is-loading');
      }
    });
  }

  return {
    toast,
    createCard,
    renderGrid,
    renderSkeletons,
    renderEmptyState,
    renderErrorState,
    openQuickView,
    closeQuickView,
    initTheme,
    initNavbar,
    debounce,
    safe,
    typeLabel,
    FALLBACK_POSTER,
    pulse,
    ratingControl,
    attachRatingRow,
    trailerSearchUrl,
    initCommandPalette,
    initSurpriseMe
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  UI.initTheme();
  UI.initNavbar();
  UI.initCommandPalette();
  UI.initSurpriseMe();
});
