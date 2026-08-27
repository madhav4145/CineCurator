

const quizState = { step: 0, mood: null, time: null, era: null };

document.addEventListener('DOMContentLoaded', renderStep);

function renderStep() {
  if (quizState.step === 0) {
    renderMoodStep();
    bindMoodStep();
  } else if (quizState.step === 1) {
    renderTimeStep();
    bindTimeStep();
  } else if (quizState.step === 2) {
    renderEraStep();
    bindEraStep();
  } else {
    renderResults();
  }
}

function restartQuiz() {
  quizState.step = 0;
  quizState.mood = null;
  quizState.time = null;
  quizState.era = null;
  renderStep();
}

function progressBar(pct) {
  return `<div class="quiz-progress"><span class="quiz-progress__fill" style="width:${pct}%"></span></div>`;
}

function renderMoodStep() {
  const root = document.getElementById('cinematch-root');
  root.innerHTML = `
    <div class="quiz-step">
      ${progressBar(33)}
      <p class="quiz-step__eyebrow">STEP 1 OF 3</p>
      <h2 class="quiz-step__question">What are you in the mood for?</h2>
      <div class="quiz-options quiz-options--grid">
        ${CONFIG.MOODS.map((m) => `
          <button type="button" class="quiz-option" data-mood="${m.key}">
            <i class="fa-solid ${m.icon}"></i>
            <span>${m.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function bindMoodStep() {
  document.querySelectorAll('.quiz-option[data-mood]').forEach((btn) => {
    btn.addEventListener('click', () => {
      quizState.mood = btn.getAttribute('data-mood');
      quizState.step = 1;
      renderStep();
    });
  });
}

function renderTimeStep() {
  const root = document.getElementById('cinematch-root');
  root.innerHTML = `
    <div class="quiz-step">
      ${progressBar(66)}
      <button type="button" class="quiz-back"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <p class="quiz-step__eyebrow">STEP 2 OF 3</p>
      <h2 class="quiz-step__question">How much time do you have?</h2>
      <div class="quiz-options">
        ${CONFIG.MOOD_TIME_OPTIONS.map((t) => `
          <button type="button" class="quiz-option quiz-option--wide" data-time="${t.key}">
            <i class="fa-solid ${t.icon}"></i>
            <span class="quiz-option__text">
              <span class="quiz-option__title">${t.label}</span>
              <span class="quiz-option__desc">${t.desc}</span>
            </span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function bindTimeStep() {
  document.querySelector('.quiz-back').addEventListener('click', () => {
    quizState.step = 0;
    renderStep();
  });
  document.querySelectorAll('.quiz-option[data-time]').forEach((btn) => {
    btn.addEventListener('click', () => {
      quizState.time = btn.getAttribute('data-time');
      quizState.step = 2;
      renderStep();
    });
  });
}

function renderEraStep() {
  const root = document.getElementById('cinematch-root');
  root.innerHTML = `
    <div class="quiz-step">
      ${progressBar(100)}
      <button type="button" class="quiz-back"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <p class="quiz-step__eyebrow">STEP 3 OF 3</p>
      <h2 class="quiz-step__question">Any era in particular?</h2>
      <div class="quiz-options">
        ${CONFIG.MOOD_ERA_OPTIONS.map((e) => `
          <button type="button" class="quiz-option quiz-option--wide" data-era="${e.key}">
            <span class="quiz-option__title">${e.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function bindEraStep() {
  document.querySelector('.quiz-back').addEventListener('click', () => {
    quizState.step = 1;
    renderStep();
  });
  document.querySelectorAll('.quiz-option[data-era]').forEach((btn) => {
    btn.addEventListener('click', () => {
      quizState.era = btn.getAttribute('data-era');
      quizState.step = 3;
      renderStep();
    });
  });
}

function parseYearStart(yearStr) {
  const m = String(yearStr || '').match(/\d{4}/);
  return m ? parseInt(m[0], 10) : 0;
}

async function computeResults() {
  const mood = CONFIG.MOODS.find((m) => m.key === quizState.mood);
  const era = CONFIG.MOOD_ERA_OPTIONS.find((e) => e.key === quizState.era);
  const seedList = (mood && mood[quizState.time]) || [];

  const settled = await Promise.allSettled(seedList.map((term) => API.search(term, { page: 1 })));
  let items = [];
  const seen = new Set();
  settled.forEach((r) => {
    if (r.status === 'fulfilled' && r.value.Search && r.value.Search[0]) {
      const item = r.value.Search[0];
      if (!seen.has(item.imdbID)) {
        seen.add(item.imdbID);
        items.push(item);
      }
    }
  });

  if (era) items = items.filter((item) => era.test(parseYearStart(item.Year)));
  return items;
}

async function renderResults() {
  const root = document.getElementById('cinematch-root');
  root.innerHTML = `
    <div class="quiz-step quiz-results-loading">
      <div class="spinner"></div>
      <p>Matching you with something great…</p>
    </div>
  `;

  const mood = CONFIG.MOODS.find((m) => m.key === quizState.mood);
  const time = CONFIG.MOOD_TIME_OPTIONS.find((t) => t.key === quizState.time);
  const era = CONFIG.MOOD_ERA_OPTIONS.find((e) => e.key === quizState.era);
  const heading = `${mood.label} · ${time.label} · ${era.label}`;

  let items = [];
  try {
    items = await computeResults();
  } catch {
    items = [];
  }

  if (!items.length) {
    root.innerHTML = `
      <div class="quiz-step">
        <div class="quiz-ticket">
          <span class="quiz-ticket__eyebrow">Your CineMatch</span>
          <h2>${heading}</h2>
        </div>
        <div class="empty-state">
          <i class="fa-solid fa-clapperboard"></i>
          <h3>Couldn't find a match this time</h3>
          <p>Try a different mood or era — the catalog has plenty more to offer.</p>
          <button class="btn btn--primary" id="quiz-retake-btn" type="button"><i class="fa-solid fa-arrows-rotate"></i> Retake the Quiz</button>
        </div>
      </div>
    `;
    document.getElementById('quiz-retake-btn').addEventListener('click', restartQuiz);
    return;
  }

  root.innerHTML = `
    <div class="quiz-step">
      <div class="quiz-ticket">
        <span class="quiz-ticket__eyebrow">Your CineMatch</span>
        <h2>${heading}</h2>
        <span class="quiz-ticket__stub"><i class="fa-solid ${mood.icon}"></i></span>
      </div>
      <div class="grid" id="quiz-results-grid"></div>
      <button class="btn btn--outline" id="quiz-retake-btn" type="button"><i class="fa-solid fa-arrows-rotate"></i> Retake the Quiz</button>
    </div>
  `;
  UI.renderGrid(document.getElementById('quiz-results-grid'), items);
  document.getElementById('quiz-retake-btn').addEventListener('click', restartQuiz);
}
