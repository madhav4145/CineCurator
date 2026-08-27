

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('details-root');
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    UI.renderErrorState(container, 'No title was specified. Go back and pick something to view.', null);
    return;
  }

  container.innerHTML = `
    <div class="details-skeleton">
      <div class="skeleton skeleton-backdrop"></div>
      <div class="skeleton skeleton-line" style="width:40%"></div>
      <div class="skeleton skeleton-line" style="width:70%"></div>
      <div class="skeleton skeleton-line" style="width:90%"></div>
    </div>
  `;

  try {
    const data = await API.getById(id);
    document.title = `${data.Title} — CineCurator`;
    render(container, data);
    Storage.RecentlyViewed.add(data);
    loadSimilarTitles(data);
    initSeasonsExplorer(data);
  } catch (err) {
    UI.renderErrorState(container, err.message || 'Could not load this title.', () => window.location.reload());
  }
});

function safe(v, fallback = 'N/A') {
  return UI.safe(v, fallback);
}

function render(container, d) {
  const poster = d.Poster && d.Poster !== 'N/A' ? d.Poster : UI.FALLBACK_POSTER;
  const isFav = Storage.Favorites.has(d.imdbID);
  const isWatch = Storage.Watchlist.has(d.imdbID);
  const ratings = Array.isArray(d.Ratings) ? d.Ratings : [];

  container.innerHTML = `
    <div class="details-backdrop" style="background-image:url('${poster}')"></div>
    <div class="details-backdrop-scrim"></div>

    <div class="details-layout">
      <div class="details-poster-col">
        <img class="details-poster" src="${poster}" alt="Poster for ${safe(d.Title)}" />
        <div class="details-actions">
          <button class="btn btn--outline btn--block" id="fav-btn" aria-pressed="${isFav}">
            <i class="fa-solid fa-heart"></i> ${isFav ? 'In Favorites' : 'Add to Favorites'}
          </button>
          <button class="btn btn--outline btn--block" id="watch-btn" aria-pressed="${isWatch}">
            <i class="fa-solid fa-bookmark"></i> ${isWatch ? 'In Watchlist' : 'Add to Watchlist'}
          </button>
          <a class="btn btn--outline btn--block" href="${UI.trailerSearchUrl(d.Title, d.Year)}" target="_blank" rel="noopener noreferrer">
            <i class="fa-brands fa-youtube"></i> Watch Trailer
          </a>
          ${d.imdbID ? `<a class="btn btn--primary btn--block" href="https://www.imdb.com/title/${d.imdbID}/" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-imdb"></i> View on IMDb</a>` : ''}
        </div>
      </div>

      <div class="details-info-col">
        <span class="eyebrow">${UI.typeLabel(d.Type)} ${d.Rated && d.Rated !== 'N/A' ? '· ' + d.Rated : ''}</span>
        <h1 class="details-title">${safe(d.Title)}</h1>
        <p class="details-subline">${safe(d.Year)} · ${safe(d.Runtime)} · ${safe(d.Genre)}</p>

        <div class="details-rating-row">
          <span class="card__rating-label">Your rating</span>
          <div id="details-rating-slot"></div>
        </div>

        <div class="details-stats">
          ${d.imdbRating && d.imdbRating !== 'N/A' ? `
            <div class="stat-block">
              <span class="stat-block__value"><i class="fa-solid fa-star"></i> ${d.imdbRating}</span>
              <span class="stat-block__label">IMDb (${safe(d.imdbVotes, '0')} votes)</span>
            </div>` : ''}
          ${d.Metascore && d.Metascore !== 'N/A' ? `
            <div class="stat-block">
              <span class="stat-block__value">${d.Metascore}</span>
              <span class="stat-block__label">Metascore</span>
            </div>` : ''}
          ${ratings.filter(r => r.Source !== 'Internet Movie Database').map(r => `
            <div class="stat-block">
              <span class="stat-block__value">${r.Value}</span>
              <span class="stat-block__label">${r.Source}</span>
            </div>`).join('')}
        </div>

        <section class="details-section">
          <h2>Synopsis</h2>
          <p>${safe(d.Plot, 'No synopsis available.')}</p>
        </section>

        <section class="details-section details-grid">
          <div><h3>Director</h3><p>${safe(d.Director)}</p></div>
          <div><h3>Writer</h3><p>${safe(d.Writer)}</p></div>
          <div><h3>Cast</h3><p>${safe(d.Actors)}</p></div>
          <div><h3>Language</h3><p>${safe(d.Language)}</p></div>
          <div><h3>Country</h3><p>${safe(d.Country)}</p></div>
          <div><h3>Awards</h3><p>${safe(d.Awards)}</p></div>
          <div><h3>Box Office</h3><p>${safe(d.BoxOffice)}</p></div>
          <div><h3>Production</h3><p>${safe(d.Production)}</p></div>
        </section>

        <section class="details-section details-seasons" id="seasons-section" style="display:none;">
          <h2><i class="fa-solid fa-layer-group"></i> Seasons &amp; Episodes</h2>
          <div class="season-chips" id="season-chips"></div>
          <div class="season-progress" id="season-progress"></div>
          <div class="episode-list" id="episode-list"></div>
        </section>
      </div>
    </div>

    <section class="section more-like-this" id="more-like-this-section" style="display:none;">
      <div class="section__head">
        <h2 class="section__title"><i class="fa-solid fa-clapperboard"></i> More Like This</h2>
        <span class="section__desc" id="more-like-this-desc"></span>
      </div>
      <div class="rail" id="similar-rail"></div>
    </section>
  `;

  container.querySelector('#details-rating-slot').appendChild(UI.ratingControl(d.imdbID));

  const favBtn = container.querySelector('#fav-btn');
  favBtn.addEventListener('click', () => {
    const now = Storage.Favorites.toggle(d);
    favBtn.setAttribute('aria-pressed', String(now));
    favBtn.innerHTML = `<i class="fa-solid fa-heart"></i> ${now ? 'In Favorites' : 'Add to Favorites'}`;
    if (now) UI.pulse(favBtn);
    UI.toast(now ? '♥ Added to Favorites' : 'Removed from Favorites');
  });

  const watchBtn = container.querySelector('#watch-btn');
  watchBtn.addEventListener('click', () => {
    const now = Storage.Watchlist.toggle(d);
    watchBtn.setAttribute('aria-pressed', String(now));
    watchBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> ${now ? 'In Watchlist' : 'Add to Watchlist'}`;
    if (now) UI.pulse(watchBtn);
    UI.toast(now ? '✓ Added to Watchlist' : 'Removed from Watchlist');
  });
}

async function loadSimilarTitles(d) {
  const section = document.getElementById('more-like-this-section');
  const rail = document.getElementById('similar-rail');
  const descEl = document.getElementById('more-like-this-desc');
  if (!section || !rail) return;

  let query = '';
  let basis = '';
  if (d.Director && d.Director !== 'N/A') {
    query = d.Director.split(',')[0].trim();
    basis = `BECAUSE YOU LIKE ${query.toUpperCase()}`;
  } else if (d.Actors && d.Actors !== 'N/A') {
    query = d.Actors.split(',')[0].trim();
    basis = `STARRING ${query.toUpperCase()}`;
  } else if (d.Genre && d.Genre !== 'N/A') {
    query = d.Genre.split(',')[0].trim();
    basis = `MORE ${query.toUpperCase()}`;
  }
  if (!query) return;

  try {
    const data = await API.search(query, { page: 1 });
    const items = (data.Search || []).filter((i) => i.imdbID !== d.imdbID).slice(0, 6);
    if (!items.length) return;
    section.style.display = '';
    if (descEl) descEl.textContent = basis;
    UI.renderGrid(rail, items);
  } catch {
  }
}

function initSeasonsExplorer(d) {
  const section = document.getElementById('seasons-section');
  if (!section) return;
  const total = parseInt(d.totalSeasons, 10);
  if (d.Type !== 'series' || !total || total < 1) return;

  section.style.display = '';
  const chipsWrap = document.getElementById('season-chips');
  chipsWrap.innerHTML = Array.from({ length: total }, (_, i) => i + 1)
    .map((n) => `<button type="button" class="chip season-chip ${n === 1 ? 'is-active' : ''}" data-season="${n}">Season ${n}</button>`)
    .join('');

  chipsWrap.addEventListener('click', (e) => {
    const btn = e.target.closest('.season-chip');
    if (!btn) return;
    chipsWrap.querySelectorAll('.season-chip').forEach((c) => c.classList.remove('is-active'));
    btn.classList.add('is-active');
    loadSeason(d.imdbID, parseInt(btn.getAttribute('data-season'), 10));
  });

  loadSeason(d.imdbID, 1);
}

async function loadSeason(imdbID, season) {
  const progressEl = document.getElementById('season-progress');
  const listEl = document.getElementById('episode-list');
  if (!progressEl || !listEl) return;
  listEl.innerHTML = `<div class="episode-row episode-row--loading"><div class="spinner"></div></div>`;
  progressEl.innerHTML = '';

  try {
    const data = await API.getSeason(imdbID, season);
    const episodes = Array.isArray(data.Episodes) ? data.Episodes : [];
    if (!episodes.length) {
      listEl.innerHTML = `<p class="episode-empty">No episode data available for this season.</p>`;
      return;
    }
    const ids = episodes.map((ep) => ep.imdbID).filter(Boolean);
    renderEpisodeProgress(progressEl, season, ids);

    listEl.innerHTML = episodes.map((ep) => {
      const watched = ep.imdbID ? Storage.WatchedEpisodes.has(ep.imdbID) : false;
      const rating = ep.imdbRating && ep.imdbRating !== 'N/A' ? ep.imdbRating : null;
      return `
        <div class="episode-row ${watched ? 'is-watched' : ''}" data-episode-id="${ep.imdbID || ''}">
          <button type="button" class="episode-row__check" aria-pressed="${watched}" aria-label="Mark episode ${safe(ep.Episode)} watched">
            <i class="fa-solid ${watched ? 'fa-circle-check' : 'fa-circle'}"></i>
          </button>
          <span class="episode-row__num">E${safe(ep.Episode, '?')}</span>
          <span class="episode-row__title">${safe(ep.Title)}</span>
          <span class="episode-row__meta">
            ${rating ? `<i class="fa-solid fa-star"></i> ${rating}` : ''}
            ${ep.Released && ep.Released !== 'N/A' ? `<span>${safe(ep.Released)}</span>` : ''}
          </span>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.episode-row__check').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.episode-row');
        const epId = row.getAttribute('data-episode-id');
        if (!epId) return;
        const nowWatched = Storage.WatchedEpisodes.toggle(epId);
        row.classList.toggle('is-watched', nowWatched);
        btn.setAttribute('aria-pressed', String(nowWatched));
        btn.querySelector('i').className = `fa-solid ${nowWatched ? 'fa-circle-check' : 'fa-circle'}`;
        if (nowWatched) UI.pulse(row);
        renderEpisodeProgress(progressEl, season, ids);
      });
    });
  } catch (err) {
    listEl.innerHTML = `<p class="episode-empty">${safe(err.message, 'Could not load episodes for this season.')}</p>`;
  }
}

function renderEpisodeProgress(progressEl, season, episodeIds) {
  const watchedCount = Storage.WatchedEpisodes.countWatched(episodeIds);
  const total = episodeIds.length;
  const pct = total ? Math.round((watchedCount / total) * 100) : 0;
  progressEl.innerHTML = `
    <div class="season-progress__bar"><div class="season-progress__fill" style="width:${pct}%"></div></div>
    <span class="season-progress__label">Season ${season} — ${watchedCount}/${total} watched</span>
  `;
}
