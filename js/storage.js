

const Storage = (() => {
  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function getList(storageKey) {
    return safeGet(storageKey, []);
  }

  function isInList(storageKey, imdbID) {
    return getList(storageKey).some((item) => item.imdbID === imdbID);
  }

  function addToList(storageKey, item) {
    const list = getList(storageKey);
    if (list.some((i) => i.imdbID === item.imdbID)) return false; 
    list.unshift({
      imdbID: item.imdbID,
      Title: item.Title,
      Year: item.Year,
      Poster: item.Poster,
      Type: item.Type
    });
    safeSet(storageKey, list);
    return true;
  }

  function removeFromList(storageKey, imdbID) {
    const list = getList(storageKey).filter((i) => i.imdbID !== imdbID);
    safeSet(storageKey, list);
    return true;
  }

  function toggleInList(storageKey, item) {
    if (isInList(storageKey, item.imdbID)) {
      removeFromList(storageKey, item.imdbID);
      return false; 
    }
    addToList(storageKey, item);
    return true; 
  }

  const Favorites = {
    getAll: () => getList(CONFIG.STORAGE_KEYS.FAVORITES),
    has: (id) => isInList(CONFIG.STORAGE_KEYS.FAVORITES, id),
    toggle: (item) => toggleInList(CONFIG.STORAGE_KEYS.FAVORITES, item),
    remove: (id) => removeFromList(CONFIG.STORAGE_KEYS.FAVORITES, id)
  };

  const Watchlist = {
    getAll: () => getList(CONFIG.STORAGE_KEYS.WATCHLIST),
    has: (id) => isInList(CONFIG.STORAGE_KEYS.WATCHLIST, id),
    toggle: (item) => toggleInList(CONFIG.STORAGE_KEYS.WATCHLIST, item),
    remove: (id) => removeFromList(CONFIG.STORAGE_KEYS.WATCHLIST, id)
  };

  const Theme = {
    get: () => safeGet(CONFIG.STORAGE_KEYS.THEME, 'dark'),
    set: (theme) => safeSet(CONFIG.STORAGE_KEYS.THEME, theme)
  };

  const RecentSearches = {
    getAll: () => safeGet(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, []),
    add: (term) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      let list = safeGet(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, []);
      list = list.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
      list.unshift(trimmed);
      list = list.slice(0, CONFIG.MAX_RECENT_SEARCHES);
      safeSet(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, list);
    },
    clear: () => safeSet(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, [])
  };

  const Ratings = {
    getAll: () => safeGet(CONFIG.STORAGE_KEYS.RATINGS, {}),
    get: (imdbID) => safeGet(CONFIG.STORAGE_KEYS.RATINGS, {})[imdbID] || 0,
    set: (imdbID, value) => {
      const all = safeGet(CONFIG.STORAGE_KEYS.RATINGS, {});
      const v = Math.max(0, Math.min(5, Math.round(value)));
      if (v === 0) delete all[imdbID];
      else all[imdbID] = v;
      safeSet(CONFIG.STORAGE_KEYS.RATINGS, all);
      document.dispatchEvent(new CustomEvent('cine:rating-changed', { detail: { imdbID, value: v } }));
      return v;
    }
  };

  const WatchedEpisodes = {
    has: (episodeID) => !!safeGet(CONFIG.STORAGE_KEYS.WATCHED_EPISODES, {})[episodeID],
    toggle: (episodeID) => {
      const all = safeGet(CONFIG.STORAGE_KEYS.WATCHED_EPISODES, {});
      if (all[episodeID]) delete all[episodeID];
      else all[episodeID] = true;
      safeSet(CONFIG.STORAGE_KEYS.WATCHED_EPISODES, all);
      return !!all[episodeID];
    },
    countWatched: (episodeIDs) => {
      const all = safeGet(CONFIG.STORAGE_KEYS.WATCHED_EPISODES, {});
      return episodeIDs.reduce((n, id) => n + (all[id] ? 1 : 0), 0);
    }
  };

  const RecentlyViewed = {
    getAll: () => safeGet(CONFIG.STORAGE_KEYS.RECENTLY_VIEWED, []),
    add: (item) => {
      if (!item || !item.imdbID) return;
      let list = safeGet(CONFIG.STORAGE_KEYS.RECENTLY_VIEWED, []);
      list = list.filter((i) => i.imdbID !== item.imdbID);
      list.unshift({
        imdbID: item.imdbID,
        Title: item.Title,
        Year: item.Year,
        Poster: item.Poster,
        Type: item.Type
      });
      list = list.slice(0, CONFIG.MAX_RECENTLY_VIEWED);
      safeSet(CONFIG.STORAGE_KEYS.RECENTLY_VIEWED, list);
    }
  };

  return { Favorites, Watchlist, Theme, RecentSearches, Ratings, WatchedEpisodes, RecentlyViewed };
})();
