

const SearchPage = (() => {
  let state = {
    query: '',
    type: '',
    year: '',
    sort: 'relevance',
    page: 1,
    totalResults: 0,
    lastResults: []
  };

  let els = {};

  function init() {
    els = {
      input: document.getElementById('search-input'),
      form: document.getElementById('search-form'),
      typeFilter: document.getElementById('filter-type'),
      yearFilter: document.getElementById('filter-year'),
      sortFilter: document.getElementById('filter-sort'),
      results: document.getElementById('search-results'),
      pagination: document.getElementById('pagination'),
      resultsCount: document.getElementById('results-count'),
      recentWrap: document.getElementById('recent-searches'),
      clearRecent: document.getElementById('clear-recent')
    };

    const params = new URLSearchParams(window.location.search);
    state.query = params.get('q') || '';
    state.type = params.get('type') || '';
    state.year = params.get('year') || '';
    if (els.input) els.input.value = state.query;
    if (els.typeFilter) els.typeFilter.value = state.type;
    if (els.yearFilter) els.yearFilter.value = state.year;

    els.form.addEventListener('submit', (e) => {
      e.preventDefault();
      runSearch(1);
    });

    const debouncedSearch = UI.debounce(() => runSearch(1), CONFIG.SEARCH_DEBOUNCE_MS);
    els.input.addEventListener('input', () => {
      state.query = els.input.value.trim();
      if (state.query.length >= 2) debouncedSearch();
    });

    els.typeFilter.addEventListener('change', () => {
      state.type = els.typeFilter.value;
      runSearch(1);
    });
    els.yearFilter.addEventListener('change', () => {
      state.year = els.yearFilter.value.trim();
      runSearch(1);
    });
    els.sortFilter.addEventListener('change', () => {
      state.sort = els.sortFilter.value;
      renderResults();
    });

    if (els.clearRecent) {
      els.clearRecent.addEventListener('click', () => {
        Storage.RecentSearches.clear();
        renderRecent();
      });
    }

    renderRecent();
    if (state.query) runSearch(1);
    else renderIdleState();
  }

  function renderRecent() {
    const recents = Storage.RecentSearches.getAll();
    if (!els.recentWrap) return;
    if (recents.length === 0) {
      els.recentWrap.innerHTML = '';
      return;
    }
    els.recentWrap.innerHTML = recents
      .map((r) => `<button type="button" class="chip chip--ghost" data-term="${r}"><i class="fa-solid fa-clock-rotate-left"></i> ${r}</button>`)
      .join('');
    els.recentWrap.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        els.input.value = chip.dataset.term;
        state.query = chip.dataset.term;
        runSearch(1);
      });
    });
  }

  function renderIdleState() {
    UI.renderEmptyState(els.results, {
      icon: 'fa-magnifying-glass',
      title: 'Search for something to watch',
      message: 'Try a title like "Dune", "Breaking Bad" or a genre.'
    });
    els.pagination.innerHTML = '';
    els.resultsCount.textContent = '';
  }

  async function runSearch(page) {
    if (!state.query) {
      renderIdleState();
      return;
    }
    state.page = page;
    UI.renderSkeletons(els.results, 8);
    els.pagination.innerHTML = '';
    els.resultsCount.textContent = 'Searching…';

    const url = new URLSearchParams();
    url.set('q', state.query);
    if (state.type) url.set('type', state.type);
    if (state.year) url.set('year', state.year);
    history.replaceState(null, '', `search.html?${url.toString()}`);

    try {
      const data = await API.search(state.query, { type: state.type, year: state.year, page });
      Storage.RecentSearches.add(state.query);
      renderRecent();
      state.lastResults = data.Search || [];
      state.totalResults = parseInt(data.totalResults, 10) || 0;
      renderResults();
      renderPagination();
    } catch (err) {
      state.lastResults = [];
      state.totalResults = 0;
      els.pagination.innerHTML = '';
      els.resultsCount.textContent = '';
      if (err.kind === 'empty') {
        UI.renderEmptyState(els.results, {
          icon: 'fa-clapperboard',
          title: 'No results found',
          message: `We couldn't find anything matching "${state.query}". Try a different title or clear your filters.`
        });
      } else {
        UI.renderErrorState(els.results, err.message, () => runSearch(page));
      }
    }
  }

  function sortResults(items) {
    const sorted = [...items];
    switch (state.sort) {
      case 'title-asc':
        return sorted.sort((a, b) => a.Title.localeCompare(b.Title));
      case 'title-desc':
        return sorted.sort((a, b) => b.Title.localeCompare(a.Title));
      case 'year-desc':
        return sorted.sort((a, b) => (parseInt(b.Year) || 0) - (parseInt(a.Year) || 0));
      case 'year-asc':
        return sorted.sort((a, b) => (parseInt(a.Year) || 0) - (parseInt(b.Year) || 0));
      default:
        return sorted; 
    }
  }

  function renderResults() {
    const items = sortResults(state.lastResults);
    UI.renderGrid(els.results, items);
    els.resultsCount.textContent = `${state.totalResults.toLocaleString()} result${state.totalResults === 1 ? '' : 's'} for "${state.query}"`;
  }

  function renderPagination() {
    const totalPages = Math.min(100, Math.ceil(state.totalResults / CONFIG.RESULTS_PER_PAGE));
    if (totalPages <= 1) {
      els.pagination.innerHTML = '';
      return;
    }
    const { page } = state;
    const btn = (label, target, disabled = false, current = false) =>
      `<button class="page-btn ${current ? 'is-current' : ''}" type="button" data-page="${target}" ${disabled ? 'disabled' : ''}>${label}</button>`;

    let buttons = [];
    buttons.push(btn('<i class="fa-solid fa-chevron-left"></i>', page - 1, page <= 1));

    const windowSize = 2;
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - windowSize && p <= page + windowSize)) {
        buttons.push(btn(String(p), p, false, p === page));
      } else if (buttons[buttons.length - 1] && !buttons[buttons.length - 1].includes('…')) {
        buttons.push(`<span class="page-ellipsis">…</span>`);
      }
    }
    buttons.push(btn('<i class="fa-solid fa-chevron-right"></i>', page + 1, page >= totalPages));

    els.pagination.innerHTML = buttons.join('');
    els.pagination.querySelectorAll('.page-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const target = parseInt(b.dataset.page, 10);
        if (!Number.isNaN(target)) {
          runSearch(target);
          els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', SearchPage.init);
