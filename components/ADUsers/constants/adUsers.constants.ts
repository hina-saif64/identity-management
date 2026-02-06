// User Intelligence Module - Constants
// Label: USER-INTEL-CONSTANTS

// Table configuration
export const TABLE_CONFIG = {
    MAX_HEIGHT: '600px',
    MIN_WIDTH: '1000px',
    PAGE_SIZE: 1000,
    RESULT_PAGE_SIZE: 1000,
} as const;

// Filter defaults
export const DEFAULT_FILTERS = {
    searchString: '',
    status: 'All' as const,
    upnSuffix: '',
    searchBase: '',
    stalledDays: 0,
    passwordAge: 0,
};

// Animation classes
export const ANIMATION_CLASSES = {
    ENABLE: 'animate-pulse bg-green-100 dark:bg-green-900/20',
    DISABLE: 'animate-pulse bg-red-100 dark:bg-red-900/20',
    MOVE: 'animate-pulse bg-blue-100 dark:bg-blue-900/20',
    SUFFIX: 'animate-pulse bg-purple-100 dark:bg-purple-900/20',
    RESET_PASSWORD: 'animate-pulse bg-orange-100 dark:bg-orange-900/20',
} as const;

// Avatar animation classes
export const AVATAR_ANIMATIONS = {
    ENABLE: 'bg-green-500 animate-bounce',
    DISABLE: 'bg-red-500 animate-pulse',
    MOVE: 'bg-blue-500 animate-spin',
    SUFFIX: 'bg-purple-500 animate-bounce',
    RESET_PASSWORD: 'bg-orange-500 animate-pulse',
} as const;

// Action emojis
export const ACTION_EMOJIS = {
    ENABLE: '✅',
    DISABLE: '❌',
    MOVE: '📁',
    SUFFIX: '🏷️',
    RESET_PASSWORD: '🔐',
    PROCESSING: '⚡',
} as const;

// Status messages
export const ACTION_MESSAGES = {
    ENABLE: '🔄 Enabling...',
    DISABLE: '🔄 Disabling...',
    MOVE: '🔄 Moving to OU...',
    SUFFIX: '🔄 Changing UPN...',
    RESET_PASSWORD: '🔄 Resetting Password...',
    PROCESSING: '🔄 Processing...',
} as const;

// Export formats
export const EXPORT_FORMATS = {
    CSV: 'csv',
    JSON: 'json',
} as const;

// Development labels (only in development mode)
export const DEV_LABELS = {
    MAIN: 'AD-USERS',
    METRICS: 'AD-METRICS',
    FILTER_PANEL: 'AD-FILTER-PANEL',
    FILTER_SEARCH: 'AD-FILTER-SEARCH',
    FILTER_STATUS: 'AD-FILTER-STATUS',
    FILTER_DOMAIN: 'AD-FILTER-DOMAIN',
    FILTER_BUTTON: 'AD-FILTER-BUTTON',
    HEADER: 'AD-HEADER',
    ROW: 'AD-ROW',
    CELL_NAME: 'AD-CELL-NAME',
    CELL_STATUS: 'AD-CELL-STATUS',
    CELL_ACTIONS: 'AD-CELL-ACTIONS',
    BULK_BAR: 'AD-BULK-BAR',
    BULK_ENABLE: 'AD-BULK-ENABLE',
    BULK_DISABLE: 'AD-BULK-DISABLE',
    BULK_MOVE: 'AD-BULK-MOVE',
    BULK_UPN: 'AD-BULK-UPN',
    BULK_RESET: 'AD-BULK-RESET',
    MODAL_OU: 'AD-MODAL-OU',
    MODAL_UPN: 'AD-MODAL-UPN',
    EMPTY_STATE: 'AD-EMPTY',
    LOADING_STATE: 'AD-LOADING',
    ERROR_STATE: 'AD-ERROR',
} as const;

// Cache TTL
export const CACHE_TTL = 30000; // 30 seconds

// Rate limiting
export const RATE_LIMIT = {
    MAX_REQUESTS: 10,
    WINDOW_MS: 60000, // 1 minute
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
    MAX_SEARCH_LENGTH: 2000,
    MAX_SELECTED_USERS: 100,
    MIN_PASSWORD_LENGTH: 8,
    MAX_STALLED_DAYS: 365,
    MAX_PASSWORD_AGE: 365,
} as const;
