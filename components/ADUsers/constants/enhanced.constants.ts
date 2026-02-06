// Enhanced User Intelligence Module - Constants
// Label: ENHANCED-USER-INTEL-CONSTANTS

import type { TileConfig, UserSummary, RetryConfig } from '../types/enhanced.types';

// Enhanced Tile Configuration
export const ENHANCED_TILES: TileConfig[] = [
    // Existing tiles (preserved for backward compatibility)
    {
        id: 'total',
        title: 'Total Users',
        description: 'All users in the system',
        icon: 'Users',
        color: 'blue',
        getValue: (s: UserSummary) => s.total,
        getFilter: () => 'all',
        category: 'basic'
    },
    {
        id: 'enabled',
        title: 'Active Users',
        description: 'Currently enabled accounts',
        icon: 'UserCheck',
        color: 'green',
        getValue: (s: UserSummary) => s.enabled,
        getFilter: () => 'enabled',
        category: 'basic'
    },
    {
        id: 'disabled',
        title: 'Disabled Users',
        description: 'Disabled user accounts',
        icon: 'UserX',
        color: 'red',
        getValue: (s: UserSummary) => s.disabled,
        getFilter: () => 'disabled',
        category: 'basic'
    },
    {
        id: 'withEmail',
        title: 'With Email',
        description: 'Users with email addresses',
        icon: 'Mail',
        color: 'indigo',
        getValue: (s: UserSummary) => s.withEmail,
        getFilter: () => 'withEmail',
        category: 'basic'
    },
    {
        id: 'neverChanged',
        title: 'Never Changed Password',
        description: 'Users who never changed password',
        icon: 'Lock',
        color: 'amber',
        getValue: (s: UserSummary) => s.neverChanged,
        getFilter: () => 'neverChanged',
        category: 'basic'
    },
    {
        id: 'stalled',
        title: 'Stalled Accounts',
        description: 'Accounts with no recent activity',
        icon: 'Clock',
        color: 'orange',
        getValue: (s: UserSummary) => s.stalled,
        getFilter: () => 'stalled',
        category: 'basic'
    },
    {
        id: 'neverLogin',
        title: 'Never Logged In',
        description: 'Users who never logged in',
        icon: 'UserMinus',
        color: 'gray',
        getValue: (s: UserSummary) => s.neverLogin,
        getFilter: () => 'neverLogin',
        category: 'basic'
    },
    {
        id: 'passwordExpired',
        title: 'Password Expired',
        description: 'Users with expired passwords',
        icon: 'KeyRound',
        color: 'red',
        getValue: (s: UserSummary) => s.passwordExpired,
        getFilter: () => 'passwordExpired',
        category: 'basic'
    },
    {
        id: 'noMfa',
        title: 'No MFA',
        description: 'Users without multi-factor authentication',
        icon: 'ShieldX',
        color: 'red',
        getValue: (s: UserSummary) => s.noMfa,
        getFilter: () => 'noMfa',
        category: 'basic'
    },

    // New enhanced tiles
    {
        id: 'guest',
        title: 'Guest Users',
        description: 'External users from Entra ID',
        icon: 'UserPlus',
        color: 'purple',
        getValue: (s: UserSummary) => s.guestUsers,
        getFilter: () => 'guest',
        isNew: true,
        category: 'enhanced'
    },
    {
        id: 'target',
        title: 'Target Users',
        description: 'Users with target.ae#EXT#@ pattern',
        icon: 'Target',
        color: 'orange',
        getValue: (s: UserSummary) => s.targetUsers,
        getFilter: () => 'target',
        isNew: true,
        category: 'enhanced'
    },
    {
        id: 'privileged',
        title: 'Privileged Users',
        description: 'Users with admin roles',
        icon: 'Shield',
        color: 'yellow',
        getValue: (s: UserSummary) => s.privilegedUsers,
        getFilter: () => 'privileged',
        isNew: true,
        category: 'enhanced'
    },
    {
        id: 'service',
        title: 'Service Accounts',
        description: 'Identified service accounts',
        icon: 'Bot',
        color: 'gray',
        getValue: (s: UserSummary) => s.serviceAccounts,
        getFilter: () => 'service',
        isNew: true,
        category: 'enhanced'
    },
    {
        id: 'multi-source',
        title: 'Multi-Source',
        description: 'Users in multiple systems',
        icon: 'Network',
        color: 'teal',
        getValue: (s: UserSummary) => s.multiSourceUsers,
        getFilter: () => 'multi-source',
        isNew: true,
        category: 'source'
    },
    {
        id: 'healthy',
        title: 'Healthy Users',
        description: 'Users with active health status',
        icon: 'Heart',
        color: 'green',
        getValue: (s: UserSummary) => s.healthyUsers,
        getFilter: () => 'healthy',
        isNew: true,
        category: 'health'
    },
    {
        id: 'at-risk',
        title: 'At Risk',
        description: 'Users with security risks',
        icon: 'AlertTriangle',
        color: 'red',
        getValue: (s: UserSummary) => s.atRiskUsers,
        getFilter: () => 'at-risk',
        isNew: true,
        category: 'health'
    },

    // Source distribution tiles
    {
        id: 'ad-only',
        title: 'Active Directory',
        description: 'All users from Active Directory',
        icon: 'Server',
        color: 'blue',
        getValue: (s: UserSummary) => s.adOnlyUsers,
        getFilter: () => 'ad-only',
        isNew: true,
        category: 'source'
    },
    {
        id: 'entra-only',
        title: 'Entra ID',
        description: 'All users from Entra ID',
        icon: 'Cloud',
        color: 'sky',
        getValue: (s: UserSummary) => s.entraOnlyUsers,
        getFilter: () => 'entra-only',
        isNew: true,
        category: 'source'
    },
    {
        id: 'exchange-only',
        title: 'Exchange Only',
        description: 'Users only in Exchange Online',
        icon: 'Mail',
        color: 'indigo',
        getValue: (s: UserSummary) => s.exchangeOnlyUsers,
        getFilter: () => 'exchange-only',
        isNew: true,
        category: 'source'
    },
    {
        id: 'all-sources',
        title: 'All Sources',
        description: 'Users in all three systems',
        icon: 'CheckCircle',
        color: 'emerald',
        getValue: (s: UserSummary) => s.allSourcesUsers,
        getFilter: () => 'all-sources',
        isNew: true,
        category: 'source'
    }
];

// Tile categories for organization
export const TILE_CATEGORIES = {
    BASIC: 'basic',
    ENHANCED: 'enhanced',
    SOURCE: 'source',
    HEALTH: 'health'
} as const;

// Enhanced table configuration
export const ENHANCED_TABLE_CONFIG = {
    MAX_HEIGHT: '600px',
    MIN_WIDTH: '1200px', // Increased for additional columns
    PAGE_SIZE: 1000,
    RESULT_PAGE_SIZE: 1000,
    PROGRESSIVE_LOAD_BATCH_SIZE: 100,
} as const;

// Enhanced filter defaults
export const ENHANCED_DEFAULT_FILTERS = {
    searchString: '',
    status: 'All' as const,
    upnSuffix: '',
    searchBase: '',
    stalledDays: 0,
    passwordAge: 0,
    department: '',
    userType: 'All' as const,
    healthStatus: 'All' as const,
    sources: [] as ('ad' | 'entra' | 'exchange')[],
    riskLevel: 'All' as const,
    hasMailbox: undefined,
    mfaEnabled: undefined,
    licenseType: [] as string[],
};

// Multi-source collection configuration
export const MULTI_SOURCE_CONFIG = {
    PARALLEL_COLLECTION: true,
    DEFAULT_TIMEOUT: 30000, // 30 seconds
    CACHE_TTL: 15 * 60 * 1000, // 15 minutes
    MAX_CONCURRENT_REQUESTS: 3,
    CORRELATION_TIMEOUT: 5000, // 5 seconds
} as const;

// Retry configuration for error recovery
export const RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
};

// Circuit breaker configuration
export const CIRCUIT_BREAKER_CONFIG = {
    FAILURE_THRESHOLD: 5,
    RECOVERY_TIMEOUT: 60000, // 1 minute
    HALF_OPEN_MAX_CALLS: 3,
} as const;

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
    FAST_RESPONSE: 2000, // 2 seconds
    ACCEPTABLE_RESPONSE: 5000, // 5 seconds
    SLOW_RESPONSE: 10000, // 10 seconds
    CACHE_HIT_TARGET: 0.8, // 80%
} as const;

// Health status colors and icons
export const HEALTH_STATUS_CONFIG = {
    Active: { color: 'green', icon: 'CheckCircle', description: 'User is active and healthy' },
    Warning: { color: 'yellow', icon: 'AlertTriangle', description: 'User has potential issues' },
    Stale: { color: 'orange', icon: 'Clock', description: 'User has been inactive' },
    Disabled: { color: 'red', icon: 'XCircle', description: 'User account is disabled' },
} as const;

// Risk level configuration
export const RISK_LEVEL_CONFIG = {
    Low: { color: 'green', icon: 'Shield', priority: 1 },
    Medium: { color: 'yellow', icon: 'AlertTriangle', priority: 2 },
    High: { color: 'red', icon: 'AlertOctagon', priority: 3 },
} as const;

// Source status indicators
export const SOURCE_STATUS_CONFIG = {
    pending: { color: 'gray', icon: 'Clock', description: 'Waiting to start' },
    loading: { color: 'blue', icon: 'Loader', description: 'Currently loading' },
    success: { color: 'green', icon: 'CheckCircle', description: 'Successfully loaded' },
    error: { color: 'red', icon: 'XCircle', description: 'Failed to load' },
    skipped: { color: 'gray', icon: 'Minus', description: 'Skipped due to configuration' },
} as const;

// Animation classes for enhanced features
export const ENHANCED_ANIMATION_CLASSES = {
    // Existing animations (preserved)
    ENABLE: 'animate-pulse bg-green-100 dark:bg-green-900/20',
    DISABLE: 'animate-pulse bg-red-100 dark:bg-red-900/20',
    MOVE: 'animate-pulse bg-blue-100 dark:bg-blue-900/20',
    SUFFIX: 'animate-pulse bg-purple-100 dark:bg-purple-900/20',
    RESET_PASSWORD: 'animate-pulse bg-orange-100 dark:bg-orange-900/20',

    // New enhanced animations
    PROGRESSIVE_LOAD: 'animate-pulse bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20',
    CORRELATION: 'animate-bounce bg-teal-100 dark:bg-teal-900/20',
    HEALTH_CHECK: 'animate-spin bg-yellow-100 dark:bg-yellow-900/20',
    RISK_ANALYSIS: 'animate-pulse bg-red-100 dark:bg-red-900/20',
    NEW_TILE: 'animate-bounce bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20',
} as const;

// Enhanced avatar animations
export const ENHANCED_AVATAR_ANIMATIONS = {
    // Existing animations (preserved)
    ENABLE: 'bg-green-500 animate-bounce',
    DISABLE: 'bg-red-500 animate-pulse',
    MOVE: 'bg-blue-500 animate-spin',
    SUFFIX: 'bg-purple-500 animate-bounce',
    RESET_PASSWORD: 'bg-orange-500 animate-pulse',

    // New enhanced animations
    GUEST_USER: 'bg-purple-500 animate-pulse',
    TARGET_USER: 'bg-orange-500 animate-bounce',
    PRIVILEGED_USER: 'bg-yellow-500 animate-pulse',
    SERVICE_ACCOUNT: 'bg-gray-500 animate-spin',
    MULTI_SOURCE: 'bg-teal-500 animate-bounce',
    AT_RISK: 'bg-red-500 animate-pulse',
    HEALTHY: 'bg-green-500 animate-bounce',
    PROCESSING: '⚡',
} as const;

// Enhanced action emojis
export const ENHANCED_ACTION_EMOJIS = {
    // Existing emojis (preserved)
    ENABLE: '✅',
    DISABLE: '❌',
    MOVE: '📁',
    SUFFIX: '🏷️',
    RESET_PASSWORD: '🔐',
    PROCESSING: '⚡',

    // New enhanced emojis
    GUEST_USER: '👤',
    TARGET_USER: '🎯',
    PRIVILEGED_USER: '👑',
    SERVICE_ACCOUNT: '🤖',
    MULTI_SOURCE: '🔗',
    AT_RISK: '⚠️',
    HEALTHY: '💚',
    CORRELATING: '🔄',
    LOADING_AD: '🏢',
    LOADING_ENTRA: '☁️',
    LOADING_EXCHANGE: '📧',
} as const;

// Enhanced status messages
export const ENHANCED_ACTION_MESSAGES = {
    // Existing messages (preserved)
    ENABLE: '🔄 Enabling...',
    DISABLE: '🔄 Disabling...',
    MOVE: '🔄 Moving to OU...',
    SUFFIX: '🔄 Changing UPN...',
    RESET_PASSWORD: '🔄 Resetting Password...',
    PROCESSING: '🔄 Processing...',

    // New enhanced messages
    LOADING_AD: '🏢 Loading from Active Directory...',
    LOADING_ENTRA: '☁️ Loading from Entra ID...',
    LOADING_EXCHANGE: '📧 Loading from Exchange Online...',
    CORRELATING: '🔄 Correlating user data...',
    CALCULATING_HEALTH: '💚 Calculating health status...',
    ANALYZING_RISKS: '⚠️ Analyzing security risks...',
    PROGRESSIVE_LOADING: '⚡ Progressive loading in progress...',
} as const;

// Export formats (enhanced)
export const ENHANCED_EXPORT_FORMATS = {
    CSV: 'csv',
    JSON: 'json',
    XLSX: 'xlsx',
} as const;

// Validation limits (enhanced)
export const ENHANCED_VALIDATION_LIMITS = {
    MAX_SEARCH_LENGTH: 2000,
    MAX_SELECTED_USERS: 500, // Increased for bulk operations
    MIN_PASSWORD_LENGTH: 8,
    MAX_STALLED_DAYS: 365,
    MAX_PASSWORD_AGE: 365,
    MAX_CORRELATION_TIME: 30000, // 30 seconds
    MAX_CACHE_SIZE: 1000,
    MAX_CONCURRENT_COLLECTORS: 3,
} as const;

// Development labels (enhanced)
export const ENHANCED_DEV_LABELS = {
    // Existing labels (preserved)
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

    // New enhanced labels
    USER_INTELLIGENCE: 'USER-INTELLIGENCE',
    ENHANCED_DASHBOARD: 'ENHANCED-DASHBOARD',
    MULTI_SOURCE_COLLECTOR: 'MULTI-SOURCE-COLLECTOR',
    PROGRESSIVE_LOADER: 'PROGRESSIVE-LOADER',
    CORRELATION_ENGINE: 'CORRELATION-ENGINE',
    HEALTH_ANALYZER: 'HEALTH-ANALYZER',
    RISK_EVALUATOR: 'RISK-EVALUATOR',
    TILE_DASHBOARD: 'TILE-DASHBOARD',
    SOURCE_INDICATOR: 'SOURCE-INDICATOR',
    ENHANCED_FILTER: 'ENHANCED-FILTER',
    GUEST_USER_TILE: 'GUEST-USER-TILE',
    TARGET_USER_TILE: 'TARGET-USER-TILE',
    PRIVILEGED_USER_TILE: 'PRIVILEGED-USER-TILE',
    SERVICE_ACCOUNT_TILE: 'SERVICE-ACCOUNT-TILE',
    MULTI_SOURCE_TILE: 'MULTI-SOURCE-TILE',
    HEALTH_STATUS_TILE: 'HEALTH-STATUS-TILE',
} as const;