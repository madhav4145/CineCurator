
const CONFIG = Object.freeze({
  OMDB_API_KEY: 'd052170f',
  OMDB_BASE_URL: 'https://www.omdbapi.com/',

  STORAGE_KEYS: Object.freeze({
    FAVORITES: 'cinecurator_favorites',
    WATCHLIST: 'cinecurator_watchlist',
    THEME: 'cinecurator_theme',
    RECENT_SEARCHES: 'cinecurator_recent_searches',
    CACHE_PREFIX: 'cinecurator_cache_',
    RATINGS: 'cinecurator_ratings',
    WATCHED_EPISODES: 'cinecurator_watched_episodes',
    RECENTLY_VIEWED: 'cinecurator_recently_viewed'
  }),

  SEARCH_DEBOUNCE_MS: 450,
  MAX_RECENT_SEARCHES: 8,
  RESULTS_PER_PAGE: 10,
  CACHE_TTL_MS: 1000 * 60 * 30, 
  MAX_RECENTLY_VIEWED: 12,
  WHEEL_MAX_SLICES: 8,
  STATS_MAX_TITLES: 60, 

  SEED_TERMS: Object.freeze({
    trending: ['Dune', 'Oppenheimer', 'Inception', 'Interstellar', 'Joker', 'Parasite'],
    movies: ['Batman', 'Avengers', 'Matrix', 'Gladiator', 'Godfather', 'Whiplash'],
    series: ['Breaking Bad', 'Stranger Things', 'The Crown', 'Chernobyl', 'Succession', 'The Wire'],
    tvshows: ['Planet Earth', 'Friends', 'The Office', 'Sherlock', 'Cosmos', 'Black Mirror']
  }),

  GENRE_CHIPS: Object.freeze([
    'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller',
    'Romance', 'Animation', 'Fantasy', 'Crime', 'Documentary', 'Mystery'
  ]),

  MOODS: Object.freeze([
    { key: 'action', label: 'Action & Adrenaline', icon: 'fa-explosion',
      movie: ['Mad Max Fury Road', 'John Wick', 'Top Gun Maverick', 'Gladiator', 'Die Hard'],
      series: ['The Boys', 'Daredevil', 'Arcane', '24', 'Jack Ryan'] },
    { key: 'comfort', label: 'Comfort & Laughs', icon: 'fa-face-grin-beam',
      movie: ['Paddington', 'The Grand Budapest Hotel', 'School of Rock', 'Legally Blonde', 'Mamma Mia'],
      series: ['Friends', 'Ted Lasso', 'Brooklyn Nine-Nine', 'Parks and Recreation', 'The Good Place'] },
    { key: 'mindbending', label: 'Mind-Bending', icon: 'fa-brain',
      movie: ['Inception', 'Interstellar', 'The Matrix', 'Arrival', 'Shutter Island'],
      series: ['Dark', 'Westworld', 'Black Mirror', 'Severance', 'Mr Robot'] },
    { key: 'feels', label: 'Feels & Tears', icon: 'fa-heart-crack',
      movie: ['The Pursuit of Happyness', 'Coco', 'Up', 'A Star Is Born', 'The Fault in Our Stars'],
      series: ['This Is Us', 'Normal People', 'After Life', 'Greys Anatomy', 'The Crown'] },
    { key: 'spooky', label: 'Spooky & Scary', icon: 'fa-ghost',
      movie: ['Hereditary', 'A Quiet Place', 'Get Out', 'The Conjuring', 'Sinister'],
      series: ['Stranger Things', 'The Haunting of Hill House', 'American Horror Story', 'Wednesday', 'Midnight Mass'] },
    { key: 'epic', label: 'Epic & Fantastical', icon: 'fa-dragon',
      movie: ['The Lord of the Rings The Fellowship of the Ring', 'Avatar', 'Dune', 'Harry Potter and the Sorcerers Stone', 'Pirates of the Caribbean The Curse of the Black Pearl'],
      series: ['Game of Thrones', 'The Witcher', 'House of the Dragon', 'The Mandalorian', 'Shadow and Bone'] }
  ]),

  MOOD_TIME_OPTIONS: Object.freeze([
    { key: 'movie', label: 'A Movie Night', icon: 'fa-film', desc: 'One sitting, roll credits by bedtime' },
    { key: 'series', label: 'Binge Mode', icon: 'fa-layer-group', desc: 'Something to marathon all week' }
  ]),

  MOOD_ERA_OPTIONS: Object.freeze([
    { key: 'any', label: 'Anything Goes', test: () => true },
    { key: 'modern', label: '2015 → Now', test: (year) => year >= 2015 },
    { key: 'classic', label: 'Before 2000', test: (year) => year > 0 && year < 2000 }
  ])
});
