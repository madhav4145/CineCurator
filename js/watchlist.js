

document.addEventListener('DOMContentLoaded', () => {
  const sortSelect = document.getElementById('watchlist-sort');
  render(sortSelect ? sortSelect.value : 'added');
  document.addEventListener('cine:watchlist-changed', () => render(sortSelect ? sortSelect.value : 'added'));
  if (sortSelect) {
    sortSelect.addEventListener('change', () => render(sortSelect.value));
  }

  const spinBtn = document.getElementById('spin-wheel-btn');
  if (spinBtn) spinBtn.addEventListener('click', openWheel);
});

function sortItems(items, mode) {
  const sorted = items.slice();
  if (mode === 'title') sorted.sort((a, b) => a.Title.localeCompare(b.Title));
  return sorted;
}

function render(sortMode) {
  const container = document.getElementById('watchlist-grid');
  const countEl = document.getElementById('watchlist-count');
  if (!container) return;

  const items = sortItems(Storage.Watchlist.getAll(), sortMode);
  countEl.textContent = `${items.length} title${items.length === 1 ? '' : 's'}`;

  const spinBtn = document.getElementById('spin-wheel-btn');
  if (spinBtn) spinBtn.disabled = items.length < 2;

  if (items.length === 0) {
    UI.renderEmptyState(container, {
      icon: 'fa-bookmark',
      title: 'Your watchlist is empty',
      message: 'Tap the bookmark icon on any title to queue it up.'
    });
    return;
  }
  UI.renderGrid(container, items);
}

const WHEEL_COLORS = ['#f2b705', '#e0293e', '#3a4166', '#33c37f', '#8a63d2', '#2694c9', '#e07b39', '#c96fa8'];
const wheelState = { items: [], rotation: 0, spinning: false, spinToken: 0 };

function ensureWheelModal() {
  let overlay = document.getElementById('wheel-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'wheel-overlay';
  overlay.className = 'modal-overlay wheel-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Spin the wheel to pick something to watch');
  overlay.innerHTML = `
    <div class="modal wheel-modal">
      <button class="modal__close" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      <div class="wheel-modal__content">
        <h2 class="wheel-modal__title"><i class="fa-solid fa-dharmachakra"></i> Can't Decide? Spin.</h2>
        <p class="wheel-modal__desc">We'll pick one from your watchlist.</p>
        <div class="wheel-stage">
          <div class="wheel-pointer" aria-hidden="true"><i class="fa-solid fa-caret-down"></i></div>
          <div class="wheel" id="wheel-disc"></div>
          <div class="wheel-hub" aria-hidden="true"><i class="fa-solid fa-film"></i></div>
        </div>
        <ol class="wheel-legend" id="wheel-legend"></ol>
        <div class="wheel-result" id="wheel-result" hidden></div>
        <button class="btn btn--primary btn--block" id="wheel-spin-btn" type="button">
          <i class="fa-solid fa-dharmachakra"></i> Spin the Wheel
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeWheel(); });
  overlay.querySelector('.modal__close').addEventListener('click', closeWheel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeWheel();
  });
  overlay.querySelector('#wheel-spin-btn').addEventListener('click', spinWheel);

  return overlay;
}

function closeWheel() {
  const overlay = document.getElementById('wheel-overlay');
  if (!overlay) return;
  overlay.classList.remove('is-open');
  document.body.classList.remove('no-scroll');
}

function openWheel() {
  const all = Storage.Watchlist.getAll();
  if (all.length < 2) {
    UI.toast('Add at least 2 titles to your watchlist to spin!', 'error');
    return;
  }

  const overlay = ensureWheelModal();

  
  const pool = all.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  wheelState.items = pool.slice(0, CONFIG.WHEEL_MAX_SLICES);
  wheelState.rotation = 0;
  wheelState.spinning = false;
  wheelState.spinToken++; 

  const disc = overlay.querySelector('#wheel-disc');
  disc.style.transition = 'none';
  disc.style.transform = 'rotate(0deg)';

  const resultEl = overlay.querySelector('#wheel-result');
  resultEl.hidden = true;
  resultEl.innerHTML = '';

  const spinBtn = overlay.querySelector('#wheel-spin-btn');
  spinBtn.disabled = false;
  spinBtn.innerHTML = '<i class="fa-solid fa-dharmachakra"></i> Spin the Wheel';

  overlay.classList.add('is-open');
  document.body.classList.add('no-scroll');

  requestAnimationFrame(buildWheelFace);
}

function buildWheelFace() {
  const disc = document.getElementById('wheel-disc');
  const legend = document.getElementById('wheel-legend');
  if (!disc || !legend) return;

  const n = wheelState.items.length;
  const slice = 360 / n;

  const stops = wheelState.items.map((_, i) => {
    const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
    return `${color} ${(i * slice).toFixed(2)}deg ${((i + 1) * slice).toFixed(2)}deg`;
  }).join(', ');
  disc.style.background = `conic-gradient(${stops})`;

  disc.querySelectorAll('.wheel__num').forEach((el) => el.remove());
  const radius = Math.max(disc.clientWidth, 160) / 2 - 18;
  wheelState.items.forEach((_, i) => {
    const mid = slice * i + slice / 2;
    const badge = document.createElement('span');
    badge.className = 'wheel__num';
    badge.textContent = String(i + 1);
    badge.style.transform = `rotate(${mid}deg) translate(0, -${radius}px) rotate(${-mid}deg)`;
    disc.appendChild(badge);
  });

  legend.innerHTML = wheelState.items.map((item, i) => `
    <li class="wheel-legend__item" data-index="${i}">
      <span class="wheel-legend__num" style="background:${WHEEL_COLORS[i % WHEEL_COLORS.length]}">${i + 1}</span>
      <span class="wheel-legend__title">${UI.safe(item.Title)}</span>
    </li>
  `).join('');
}

function spinWheel() {
  if (wheelState.spinning || wheelState.items.length < 2) return;
  wheelState.spinning = true;
  const myToken = ++wheelState.spinToken;

  const overlay = document.getElementById('wheel-overlay');
  const disc = overlay.querySelector('#wheel-disc');
  const spinBtn = overlay.querySelector('#wheel-spin-btn');
  const resultEl = overlay.querySelector('#wheel-result');
  resultEl.hidden = true;
  spinBtn.disabled = true;

  const n = wheelState.items.length;
  const slice = 360 / n;
  const targetIndex = Math.floor(Math.random() * n);
  const targetMid = targetIndex * slice + slice / 2;
  const extraSpins = 5 + Math.floor(Math.random() * 3); 
  const delta = (360 - targetMid) - (wheelState.rotation % 360) + extraSpins * 360;
  wheelState.rotation += delta;

  disc.style.transition = 'transform 4200ms cubic-bezier(0.14, 0.67, 0.1, 1)';
  disc.style.transform = `rotate(${wheelState.rotation}deg)`;

  const onDone = () => {
    disc.removeEventListener('transitionend', onDone);
    if (myToken !== wheelState.spinToken) return;
    wheelState.spinning = false;
    spinBtn.disabled = false;
    spinBtn.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Spin Again';

    const picked = wheelState.items[targetIndex];
    overlay.querySelectorAll('.wheel-legend__item').forEach((li) => {
      li.classList.toggle('is-winner', Number(li.getAttribute('data-index')) === targetIndex);
    });
    const winnerLi = overlay.querySelector(`.wheel-legend__item[data-index="${targetIndex}"]`);
    if (winnerLi) UI.pulse(winnerLi);

    const poster = picked.Poster && picked.Poster !== 'N/A' ? picked.Poster : UI.FALLBACK_POSTER;
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <img src="${poster}" alt="" />
      <div class="wheel-result__info">
        <span class="wheel-result__label">Tonight's pick</span>
        <h3>${UI.safe(picked.Title)}</h3>
        <div class="wheel-result__actions">
          <a class="btn btn--primary" href="details.html?id=${picked.imdbID}">View Details</a>
          <a class="btn btn--outline" href="${UI.trailerSearchUrl(picked.Title, picked.Year)}" target="_blank" rel="noopener noreferrer">Trailer</a>
        </div>
      </div>
    `;
  };
  disc.addEventListener('transitionend', onDone);
}
