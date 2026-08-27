

document.addEventListener('DOMContentLoaded', () => {
  const sortSelect = document.getElementById('favorites-sort');
  render(sortSelect ? sortSelect.value : 'added');
  document.addEventListener('cine:favorites-changed', () => render(sortSelect ? sortSelect.value : 'added'));
  document.addEventListener('cine:rating-changed', () => {
    if (sortSelect && sortSelect.value === 'rating') render('rating');
  });
  if (sortSelect) {
    sortSelect.addEventListener('change', () => render(sortSelect.value));
  }
});

function sortItems(items, mode) {
  const sorted = items.slice();
  if (mode === 'title') {
    sorted.sort((a, b) => a.Title.localeCompare(b.Title));
  } else if (mode === 'rating') {
    sorted.sort((a, b) => Storage.Ratings.get(b.imdbID) - Storage.Ratings.get(a.imdbID));
  }
  return sorted;
}

function render(sortMode) {
  const container = document.getElementById('favorites-grid');
  const countEl = document.getElementById('favorites-count');
  if (!container) return;

  const items = sortItems(Storage.Favorites.getAll(), sortMode);
  countEl.textContent = `${items.length} title${items.length === 1 ? '' : 's'}`;

  if (items.length === 0) {
    UI.renderEmptyState(container, {
      icon: 'fa-heart-crack',
      title: 'No favorites yet',
      message: 'Tap the heart icon on any title to save it here.'
    });
    return;
  }
  UI.renderGrid(container, items);
  items.forEach((item) => {
    const cardEl = container.querySelector(`.card[data-imdb-id="${item.imdbID}"]`);
    if (cardEl) UI.attachRatingRow(cardEl, item);
  });
}
