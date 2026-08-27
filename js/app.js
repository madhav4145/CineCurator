

document.addEventListener('DOMContentLoaded', () => {
  initHeroSearch();
  initGenreChips();
  loadRecentlyViewedRail();
  loadRail('trending-rail', CONFIG.SEED_TERMS.trending, 'trending');
  loadRail('movies-rail', CONFIG.SEED_TERMS.movies, 'movie');
  loadRail('series-rail', CONFIG.SEED_TERMS.series, 'series');
  loadRail('tvshows-rail', CONFIG.SEED_TERMS.tvshows, 'tv');
  loadHeroFeatured();
});

function loadRecentlyViewedRail() {
  const section = document.getElementById('recently-viewed-section');
  const container = document.getElementById('recently-viewed-rail');
  if (!section || !container) return;
  const items = Storage.RecentlyViewed.getAll();
  if (!items.length) return; 
  section.hidden = false;
  UI.renderGrid(container, items);
}

async function loadHeroFeatured() {
  const el = document.getElementById('hero-featured');
  if (!el) return;
  try {
    const term = CONFIG.SEED_TERMS.trending[0];
    const data = await API.search(term, { page: 1 });
    const first = data.Search && data.Search[0];
    if (!first) return;
    const full = await API.getById(first.imdbID);
    el.innerHTML = `
      <div class="hero-featured__backdrop" style="background-image:url('${full.Poster !== 'N/A' ? full.Poster : ''}')"></div>
      <div class="hero-featured__scrim"></div>
      <div class="hero-featured__content">
        <span class="eyebrow">Featured Tonight</span>
        <h2>${UI.safe(full.Title)}</h2>
        <p class="hero-featured__meta">${UI.safe(full.Year)} · ${UI.safe(full.Genre)} ${full.imdbRating !== 'N/A' ? `· <i class="fa-solid fa-star"></i> ${full.imdbRating}` : ''}</p>
        <p class="hero-featured__plot">${UI.safe(full.Plot, '').slice(0, 220)}${full.Plot && full.Plot.length > 220 ? '…' : ''}</p>
        <div class="hero-featured__actions">
          <a class="btn btn--primary" href="details.html?id=${full.imdbID}"><i class="fa-solid fa-circle-play"></i> View Details</a>
          <button class="btn btn--outline" id="hero-watch-btn"><i class="fa-solid fa-bookmark"></i> Watchlist</button>
        </div>
      </div>
    `;
    const wbtn = document.getElementById('hero-watch-btn');
    const sync = () => {
      const active = Storage.Watchlist.has(full.imdbID);
      wbtn.classList.toggle('is-active', active);
      wbtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> ${active ? 'In Watchlist' : 'Watchlist'}`;
    };
    sync();
    wbtn.addEventListener('click', () => {
      Storage.Watchlist.toggle(full);
      sync();
      UI.toast(Storage.Watchlist.has(full.imdbID) ? '✓ Added to Watchlist' : 'Removed from Watchlist');
    });
  } catch {
    el.classList.add('hero-featured--hidden');
  }
}

async function loadRail(containerId, terms, kind) {
  const container = document.getElementById(containerId);
  if (!container) return;
  UI.renderSkeletons(container, 6);
  try {
    const results = await Promise.allSettled(terms.map((t) => API.search(t, { page: 1 })));
    let items = [];
    results.forEach((r) => {
      if (r.status === 'fulfilled' && r.value.Search) items.push(r.value.Search[0]);
    });
    items = items.filter(Boolean);
    if (kind !== 'trending') {
      items = items.filter((i) => matchesKind(i.Type, kind));
    }
    if (items.length === 0) {
      UI.renderEmptyState(container, {
        title: 'Nothing to show yet',
        message: 'We could not load this section right now.'
      });
      return;
    }
    UI.renderGrid(container, items);
  } catch (err) {
    UI.renderErrorState(container, err.message || 'Failed to load content.', () => loadRail(containerId, terms, kind));
  }
}

function matchesKind(type, kind) {
  if (kind === 'movie') return type === 'movie';
  if (kind === 'series') return type === 'series';
  if (kind === 'tv') return type === 'series' || type === 'episode';
  return true;
}

function initGenreChips() {
  const wrap = document.getElementById('genre-chips');
  if (!wrap) return;
  wrap.innerHTML = CONFIG.GENRE_CHIPS.map(
    (g) => `<button class="chip" type="button" data-genre="${g}">${g}</button>`
  ).join('');
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    window.location.href = `search.html?q=${encodeURIComponent(btn.dataset.genre)}`;
  });
}

function initHeroSearch() {
  const form = document.getElementById('hero-search-form');
  const input = document.getElementById('hero-search-input');
  const suggestBox = document.getElementById('hero-search-suggestions');
  if (!form || !input) return;

  function renderSuggestions() {
    const recents = Storage.RecentSearches.getAll();
    if (recents.length === 0) {
      suggestBox.innerHTML = '';
      suggestBox.classList.remove('is-open');
      return;
    }
    suggestBox.innerHTML = `
      <div class="suggestions__label">Recent searches</div>
      ${recents.map((r) => `<button type="button" class="suggestions__item" data-term="${r}"><i class="fa-solid fa-clock-rotate-left"></i> ${r}</button>`).join('')}
    `;
    suggestBox.classList.add('is-open');
  }

  input.addEventListener('focus', renderSuggestions);
  input.addEventListener('input', renderSuggestions);
  document.addEventListener('click', (e) => {
    if (!suggestBox.contains(e.target) && e.target !== input) {
      suggestBox.classList.remove('is-open');
    }
  });
  suggestBox.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestions__item');
    if (!item) return;
    input.value = item.dataset.term;
    form.requestSubmit();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    window.location.href = `search.html?q=${encodeURIComponent(q)}`;
  });
}
