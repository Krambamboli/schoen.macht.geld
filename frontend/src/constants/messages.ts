// Centralized German UI messages for display pages

export const LOADING_MESSAGES = {
  default: 'LADE DATEN',
  terminal: 'LADE TERMINAL',
  leaderboard: 'LADE RANGLISTE',
  marketMap: 'LADE MARKT-KARTE',
  performanceRace: 'LADE RENNDATEN',
  sectorSunburst: 'PRAKTIKANT SORTIERT AKTIEN',
  stockChart: 'LADE CHART-DATEN',
  ipoSpotlight: 'LADE IPO-DATEN',
  ticker: 'WARTE AUF MARKTDATEN',
} as const;

export const EMPTY_STATE_MESSAGES = {
  noStocks: {
    title: 'KEINE AKTIEN VERFÜGBAR',
    description: 'WARTE AUF DATEN',
  },
  noData: {
    title: 'KEINE DATEN VERFÜGBAR',
    description: 'BITTE SPÄTER ERNEUT VERSUCHEN',
  },
  noDataShort: 'Keine Daten verfügbar',
  noIpo: {
    title: 'NOCH KEINE BÖRSENGÄNGE',
    description: 'WARTE AUF ERSTE AKTIEN',
  },
  noSectors: {
    title: 'KEINE SEKTOREN VERFÜGBAR',
    description: 'NICHT GENUG AKTIEN FÜR GRUPPIERUNG',
  },
  noPriceData: {
    title: 'KEINE KURSDATEN VERFÜGBAR',
    description: 'WARTE AUF KURSDATEN',
  },
} as const;

export const LABELS = {
  // Table headers
  ticker: 'TICKER',
  name: 'NAME',
  price: 'WERT',
  change: 'CHG',
  percent: '%',

  // Field labels
  rate: 'KURS',
  changeLabel: 'ÄNDERUNG',
  ipoDate: 'BÖRSENGANG',

  // UI labels
  newOnExchange: 'NEU AN DER BÖRSE',
  next: 'NÄCHSTE',
  winners: 'GEWINNER',
  losers: 'VERLIERER',
  sectors: 'SEKTOREN',
  stocks: 'AKTIEN',
  titles: 'TITEL',
  titlesActive: 'TITEL AKTIV',
  market: 'MARKT',
  avgChange: 'Ø CHG',

  // Market stats
  highestPrice: 'HÖCHSTER KURS',
  lowestPrice: 'NIEDRIGSTER',
  biggestMove: 'GRÖSSTE BEWEGUNG',
  mostStable: 'STABILSTE',

  // Currency & units
  currency: 'CHF',

  // Actions
  retry: 'ERNEUT VERSUCHEN',
  refresh: 'NEU',
  autoScroll: 'AUTO',
  pause: 'PAUSE',
} as const;

// Formatting helpers that include labels
export const FORMAT = {
  priceWithCurrency: (value: string | number) => `${value} ${LABELS.currency}`,
  titlesCount: (count: number) => `${count} ${LABELS.titles}`,
  titlesActiveCount: (count: number) => `${count} ${LABELS.titlesActive}`,
  sectorsCount: (count: number) => `${count} ${LABELS.sectors}`,
  stocksCount: (count: number) => `${count} ${LABELS.stocks}`,
} as const;

// Layout and UI messages
export const UI_MESSAGES = {
  // Market status
  marketOpen: 'OFFEN',
  marketClosed: 'GESCHLOSSEN',

  // Loading states
  loadingMarket: 'LADE MARKT...',
  loadingPrices: 'LADE KURSDATEN...',
  preparingProfiles: 'PROFILE WERDEN VORBEREITET',

  // Swipe UI
  buy: 'BUY',
  sell: 'SELL',
  swipeHint: '← SELL │ BUY →',
  stockSwipe: 'STOCK SWIPE',

  // Empty states
  noStocksAvailable: 'KEINE AKTIEN VERFÜGBAR',
  createFirstStock: 'ADMIN-SEITE AUFRUFEN UM ERSTE AKTIE ZU ERSTELLEN',

  // General
  backToHome: 'Zurück zur Startseite',
  exchange: 'SMG BÖRSE',
  live: 'LIVE',
  settings: 'EINST.',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  generationFailed: 'GENERIERUNG FEHLGESCHLAGEN',
  fetchFailed: 'LADEN FEHLGESCHLAGEN',
  connectionLost: 'VERBINDUNG VERLOREN',
} as const;

// Event animation messages
export const EVENT_MESSAGES = {
  // Common
  tapToDismiss: '─── TIPPEN ZUM SCHLIESSEN ───',
  tapToDismissSimple: 'Tippen zum Schliessen',

  // New Leader
  newLeader: {
    breakingNews: 'BREAKING NEWS',
    tickerPrefix: '████ NEUER #1 ████',
    tickerSuffix: '████ NEUER SPITZENREITER ████',
    overtaken: 'ÜBERHOLT',
  },

  // Big Crash
  crash: {
    title: 'ABSTURZ!',
    from: 'von',
  },

  // All-Time High
  allTimeHigh: {
    title: 'ALLZEITHOCH',
    tickerPrefix: '█ NEUES ALLZEITHOCH █',
    newRecord: 'NEUER REKORD',
    previousHigh: 'VORHERIGES HOCH',
    change: 'VERÄNDERUNG',
    badge: 'ATH',
    live: 'LIVE │ ALLZEITHOCH ERREICHT',
    exchange: 'SMG BÖRSE',
  },

  // Market Open/Close
  market: {
    open: 'MARKT GEÖFFNET',
    openSubtitle: 'Die Börse ist eröffnet!',
    closed: 'MARKT GESCHLOSSEN',
    tradingDay: 'Handelstag',
    dayEnded: 'beendet',
    dayWinner: 'Tagessieger',
  },
} as const;
