

const API = (() => {
  const inFlight = new Map(); 

  function cacheGet(key) {
    try {
      const raw = sessionStorage.getItem(CONFIG.STORAGE_KEYS.CACHE_PREFIX + key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CONFIG.CACHE_TTL_MS) return null;
      return data;
    } catch {
      return null;
    }
  }

  function cacheSet(key, data) {
    try {
      sessionStorage.setItem(
        CONFIG.STORAGE_KEYS.CACHE_PREFIX + key,
        JSON.stringify({ data, ts: Date.now() })
      );
    } catch {
    }
  }

  function buildUrl(params) {
    const url = new URL(CONFIG.OMDB_BASE_URL);
    url.searchParams.set('apikey', CONFIG.OMDB_API_KEY);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
    return url.toString();
  }

  async function request(params) {
    const key = JSON.stringify(params);
    const cached = cacheGet(key);
    if (cached) return cached;

    if (inFlight.has(key)) return inFlight.get(key);

    const promise = (async () => {
      let response;
      try {
        response = await fetch(buildUrl(params));
      } catch (err) {
        throw new APIError('network', 'Could not reach OMDb. Check your connection and try again.');
      } finally {
        inFlight.delete(key);
      }

      if (!response.ok) {
        throw new APIError('http', `OMDb responded with status ${response.status}.`);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new APIError('parse', 'Received an unreadable response from OMDb.');
      }

      if (data.Response === 'False') {
        const msg = data.Error || 'Unknown OMDb error.';
        if (/invalid api key/i.test(msg)) {
          throw new APIError('auth', 'The OMDb API key is invalid or has been rate-limited.');
        }
        throw new APIError('empty', msg);
      }

      cacheSet(key, data);
      return data;
    })();

    inFlight.set(key, promise);
    return promise;
  }

  function search(title, { type = '', year = '', page = 1 } = {}) {
    return request({ s: title, type, y: year, page });
  }

  function getById(imdbID) {
    return request({ i: imdbID, plot: 'full' });
  }

  function getSeason(imdbID, season) {
    return request({ i: imdbID, Season: season });
  }

  return { search, getById, getSeason };
})();

class APIError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; 
    this.name = 'APIError';
                        }
}
      
