// ADUsers Module - Main Export
// Exports the main component and utilities

export { ADUsersEnhanced } from './ADUsersEnhanced';
export { ADUsersEnhanced as default } from './ADUsersEnhanced';
// export { ADUsers as ADUsersStandard } from './ADUsers'; // Original component for backward compatibility
export { UserIntelligencePanel } from './components/UserIntelligencePanel';

// Re-export existing types for convenience (backward compatibility)
export type {
    AdFetchFilters,
    DomainInfo,
    PerformanceMetrics,
    BulkActionType,
} from './types/adUsers.types';

// Re-export enhanced types and constants
export type {
    EnhancedUser,
    UserCollectionResult,
    UserSummary,
    MultiSourceCredentials,
    ADCredentials,
    EntraCredentials,
    ExchangeCredentials,
    IUserCollector,
    CollectorHealthStatus,
    TTLCache,
    TileConfig,
    TileClickEvent,
    DashboardState,
    EnhancedFilters,
    ProgressiveLoadingState,
    SourceLoadingIndicator,
    RetryConfig,
    CircuitBreakerState,
    PerformanceMetrics as EnhancedPerformanceMetrics,
    EnhancedBulkActionType,
    EnhancedBulkActionParams,
    SearchResult,
    SearchHighlight,
    SearchFacet,
    ExportOptions,
    ImportResult,
    ImportError,
    ImportWarning,
} from './types/enhanced.types';

export {
    ENHANCED_TILES,
    TILE_CATEGORIES,
    ENHANCED_TABLE_CONFIG,
    ENHANCED_DEFAULT_FILTERS,
    MULTI_SOURCE_CONFIG,
    RETRY_CONFIG,
    CIRCUIT_BREAKER_CONFIG,
    PERFORMANCE_THRESHOLDS,
    HEALTH_STATUS_CONFIG,
    RISK_LEVEL_CONFIG,
    SOURCE_STATUS_CONFIG,
    ENHANCED_ANIMATION_CLASSES,
    ENHANCED_AVATAR_ANIMATIONS,
    ENHANCED_ACTION_EMOJIS,
    ENHANCED_ACTION_MESSAGES,
    ENHANCED_EXPORT_FORMATS,
    ENHANCED_VALIDATION_LIMITS,
    ENHANCED_DEV_LABELS,
} from './constants/enhanced.constants';
