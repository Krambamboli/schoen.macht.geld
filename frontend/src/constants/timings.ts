// Centralized timing/animation constants

export const TIMINGS = {
  // Spotlight/carousel durations
  spotlightDuration: 8000, // ms between spotlight slides
  stockChartRotation: 20000, // ms between stock chart rotations

  // Race animation
  raceSyncInterval: 35000, // ms for race sync
  raceEndBuffer: 5000, // ms buffer at race end

  // Auto-scroll
  autoScrollSpeed: 30, // pixels per second
  scrollPause: 2000, // ms pause at scroll boundaries
  userScrollResume: 5000, // ms before auto-scroll resumes after user interaction

  // Refresh intervals
  headlineRefresh: 120000, // ms between headline fetches
  sectorRefresh: 90000, // ms between sector data refresh

  // Animation durations
  fadeTransition: 1000, // ms for fade transitions
  springBounce: 0.3, // spring bounce factor

  // Event animation durations
  eventNewLeader: 8000, // ms for new leader celebration
  eventBigCrash: 6000, // ms for crash animation
  eventAllTimeHigh: 6000, // ms for all-time high
  eventMarketOpen: 5000, // ms for market open
  eventMarketClose: 5000, // ms for market close
} as const;

export const SEPARATORS = {
  headline: ' +++ ',
  info: ' │ ',
} as const;
