

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const root = document.getElementById('stats-root');
  if (!root) return;

  const merged = mergeUnique(Storage.Favorites.getAll(), Storage.Watchlist.getAll());
  if (merged.length === 0) {
    renderEmpty(root);
    return;
  }

  const targets = merged.slice(0, CONFIG.STATS_MAX_TITLES);
  renderLoading(root, targets.length);

  let completed = 0;
  const enriched = [];
  await Promise.all(targets.map(async (item) => {
    try {
      const full = await API.getById(item.imdbID);
      enriched.push(full);
    } catch {
      /* skip titles that fail to load — the dashboard is best-effort */
    } finally {
      completed++;
      updateLoadingProgress(completed, targets.length);
    }
  }));

  if (enriched.length === 0) {
    renderLoadError(root);
    return;
  }

  const stats = computeStats(enriched, merged);
  renderDashboard(root, stats, merged.length);
}

function mergeUnique(favorites, watchlist) {
  const map = new Map();
  favorites.forEach((item) => map.set(item.imdbID, { ...item, inFavorites: true, inWatchlist: false }));
  watchlist.forEach((item) => {
    const existing = map.get(item.imdbID);
    if (existing) existing.inWatchlist = true;
    else map.set(item.imdbID, { ...item, inFavorites: false, inWatchlist: true });
  });
  return Array.from(map.values());
}

function renderEmpty(root) {
  root.innerHTML = `
    <div class="empty-state stats-empty-state">
      <i class="fa-solid fa-chart-simple"></i>
      <h3>Nothing to analyze yet</h3>
      <p>Save a few titles to your Favorites or Watchlist and your CineStats will build themselves.</p>
      <div class="stats-empty-state__actions">
        <a class="btn btn--primary" href="search.html"><i class="fa-solid fa-magnifying-glass"></i> Discover Titles</a>
        <a class="btn btn--outline" href="cinematch.html"><i class="fa-solid fa-wand-magic-sparkles"></i> Try CineMatch</a>
      </div>
    </div>
  `;
}

function renderLoadError(root) {
  root.innerHTML = `
    <div class="empty-state empty-state--error stats-empty-state">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <h3>Couldn't analyze your collection</h3>
      <p>We couldn't reach OMDb just now. Please try again in a moment.</p>
      <button class="btn btn--primary" id="stats-retry-btn" type="button">Try again</button>
    </div>
  `;
  document.getElementById('stats-retry-btn').addEventListener('click', init);
}

function renderLoading(root, total) {
  root.innerHTML = `
    <div class="stats-loading">
      <div class="spinner"></div>
      <p id="stats-loading-label">Analyzing 0 of ${total} titles…</p>
    </div>
  `;
}

function updateLoadingProgress(done, total) {
  const label = document.getElementById('stats-loading-label');
  if (label) label.textContent = `Analyzing ${done} of ${total} titles…`;
}

function parseYearStart(yearStr) {
  const m = String(yearStr || '').match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
}

function computeStats(enriched, mergedAll) {
  const genreCounts = new Map();
  const decadeCounts = new Map();
  const typeCounts = new Map();
  let imdbSum = 0, imdbCount = 0;
  let personalSum = 0, personalCount = 0;

  enriched.forEach((d) => {
    if (d.Genre && d.Genre !== 'N/A') {
      d.Genre.split(',').map((g) => g.trim()).filter(Boolean).forEach((g) => {
        genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
      });
    }
    const year = parseYearStart(d.Year);
    if (year) {
      const decade = Math.floor(year / 10) * 10;
      decadeCounts.set(decade, (decadeCounts.get(decade) || 0) + 1);
    }
    if (d.Type) typeCounts.set(d.Type, (typeCounts.get(d.Type) || 0) + 1);

    if (d.imdbRating && d.imdbRating !== 'N/A') {
      imdbSum += parseFloat(d.imdbRating);
      imdbCount++;
    }
    const personal = Storage.Ratings.get(d.imdbID);
    if (personal > 0) {
      personalSum += personal;
      personalCount++;
    }
  });

  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const decades = Array.from(decadeCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([decade, count]) => ({ decade, count }));

  return {
    totalAnalyzed: enriched.length,
    favCount: mergedAll.filter((i) => i.inFavorites).length,
    watchCount: mergedAll.filter((i) => i.inWatchlist).length,
    topGenres,
    decades,
    typeCounts,
    avgImdb: imdbCount ? imdbSum / imdbCount : null,
    avgPersonal: personalCount ? personalSum / personalCount : null,
    personalCount
  };
}

function buildTasteProfile(stats) {
  const genrePart = stats.topGenres.length >= 2
    ? `${stats.topGenres[0].name} and ${stats.topGenres[1].name}`
    : (stats.topGenres[0] ? stats.topGenres[0].name : 'a little of everything');
  const topDecadeEntry = stats.decades.slice().sort((a, b) => b.count - a.count)[0];
  const decadePart = topDecadeEntry ? `the ${topDecadeEntry.decade}s` : 'every era';
  const ratingPart = stats.avgImdb ? ` Titles you save average <strong>${stats.avgImdb.toFixed(1)}/10</strong> on IMDb.` : '';
  return `Your collection leans heavily into <strong>${UI.safe(genrePart)}</strong>, mostly from <strong>${decadePart}</strong>.${ratingPart}`;
}

function renderDashboard(root, stats, totalSaved) {
  const maxGenreCount = stats.topGenres.length ? stats.topGenres[0].count : 1;
  const maxDecadeCount = stats.decades.length ? Math.max(...stats.decades.map((d) => d.count)) : 1;

  const typeColors = { movie: 'var(--accent)', series: 'var(--accent-2)', episode: '#8a63d2' };
  const typeEntries = Array.from(stats.typeCounts.entries());
  const typeTotal = typeEntries.reduce((sum, [, c]) => sum + c, 0) || 1;
  let cursor = 0;
  const donutStops = typeEntries.map(([type, count]) => {
    const start = (cursor / typeTotal) * 360;
    cursor += count;
    const end = (cursor / typeTotal) * 360;
    return `${typeColors[type] || 'var(--text-faint)'} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
  }).join(', ');

  root.innerHTML = `
    <p class="stats-note">${stats.totalAnalyzed < totalSaved
      ? `Insights based on your ${stats.totalAnalyzed} most recent titles (of ${totalSaved} saved).`
      : `Insights based on all ${stats.totalAnalyzed} saved titles.`}</p>

    <div class="stats-tiles">
      <div class="stat-block stat-block--lg">
        <span class="stat-block__value"><i class="fa-solid fa-layer-group"></i> ${totalSaved}</span>
        <span class="stat-block__label">Total Saved</span>
      </div>
      <div class="stat-block stat-block--lg">
        <span class="stat-block__value"><i class="fa-solid fa-heart"></i> ${stats.favCount}</span>
        <span class="stat-block__label">Favorites</span>
      </div>
      <div class="stat-block stat-block--lg">
        <span class="stat-block__value"><i class="fa-solid fa-bookmark"></i> ${stats.watchCount}</span>
        <span class="stat-block__label">Watchlist</span>
      </div>
      <div class="stat-block stat-block--lg">
        <span class="stat-block__value"><i class="fa-solid fa-star"></i> ${stats.avgImdb ? stats.avgImdb.toFixed(1) : '—'}</span>
        <span class="stat-block__label">Avg IMDb Score</span>
      </div>
      <div class="stat-block stat-block--lg">
        <span class="stat-block__value"><i class="fa-solid fa-star-half-stroke"></i> ${stats.avgPersonal ? stats.avgPersonal.toFixed(1) : '—'}</span>
        <span class="stat-block__label">${stats.personalCount ? `Your Rating (${stats.personalCount})` : 'Your Rating'}</span>
      </div>
    </div>

    <div class="stats-taste">
      <i class="fa-solid fa-quote-left" aria-hidden="true"></i>
      <p>${buildTasteProfile(stats)}</p>
    </div>

    <div class="stats-grid-2">
      <section class="stats-section">
        <h2><i class="fa-solid fa-masks-theater"></i> Top Genres</h2>
        ${stats.topGenres.length ? `
          <div class="stats-bar-list">
            ${stats.topGenres.map((g) => `
              <div class="stats-bar-row">
                <span class="stats-bar-row__label">${UI.safe(g.name)}</span>
                <span class="stats-bar-row__track"><span class="stats-bar-row__fill" style="width:${(g.count / maxGenreCount) * 100}%"></span></span>
                <span class="stats-bar-row__value">${g.count}</span>
              </div>
            `).join('')}
          </div>
        ` : `<p class="stats-empty-note">No genre data available.</p>`}
      </section>

      <section class="stats-section">
        <h2><i class="fa-solid fa-clock-rotate-left"></i> By Decade</h2>
        ${stats.decades.length ? `
          <div class="stats-bar-list">
            ${stats.decades.map((d) => `
              <div class="stats-bar-row">
                <span class="stats-bar-row__label">${d.decade}s</span>
                <span class="stats-bar-row__track"><span class="stats-bar-row__fill" style="width:${(d.count / maxDecadeCount) * 100}%"></span></span>
                <span class="stats-bar-row__value">${d.count}</span>
              </div>
            `).join('')}
          </div>
        ` : `<p class="stats-empty-note">No year data available.</p>`}
      </section>
    </div>

    <section class="stats-section">
      <h2><i class="fa-solid fa-chart-pie"></i> Movies vs Series</h2>
      <div class="stats-donut-row">
        <div class="stats-donut" style="background:conic-gradient(${donutStops})"></div>
        <ul class="stats-donut__legend">
          ${typeEntries.map(([type, count]) => `
            <li><span class="stats-donut__dot" style="background:${typeColors[type] || 'var(--text-faint)'}"></span> ${UI.typeLabel(type)} · ${count}</li>
          `).join('')}
        </ul>
      </div>
    </section>
  `;
}
