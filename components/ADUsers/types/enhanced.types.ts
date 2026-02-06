// Enhanced User Intelligence Module - TypeScript Type Definitions
// Label: ENHANCED-USER-INTEL-TYPES

import type { ADUser } from '../../../types';

// Re-export base ADUser for backward compatibility
export type { ADUser };

// Enhanced User Data Model
export interface EnhancedUser {
    // Identity (primary keys for correlation)
    id: string;                    // Primary identifier (AD DN)
    upn: string;                   // User Principal Name
    samAccountName: string;        // SAM account name

    // Basic Attributes (existing - preserved for backward compatibility)
    name: string;
    email: string;
    status: 'Active' | 'Disabled' | 'Locked';
    department?: string;
    distinguishedName: string;
    lastLogin?: string;
    lastPasswordSet?: string;
    createdDate?: string;
    description?: string;
    extAttribute7?: string;
    extAttribute10?: string;
    extAttribute14?: string;

    // AD-Specific Attributes
    license?: string;              // M365 License (from AD Groups)

    // Multi-Source Presence Flags
    sources: {
        ad: boolean;               // Exists in Active Directory
        entra: boolean;            // Exists in Entra ID
        exchange: boolean;         // Has Exchange mailbox
    };

    // Entra ID Enrichment
    entraData?: {
        objectId: string;
        lastSignIn?: Date;
        mfaEnabled: boolean;
        licenseAssignments: string[];
        userType: 'Member' | 'Guest';
        accountEnabled: boolean;
        riskLevel?: 'Low' | 'Medium' | 'High';
        complianceState?: 'Compliant' | 'NonCompliant' | 'Unknown';
        adminRoles?: string[];
    };

    // Exchange Online Enrichment  
    exchangeData?: {
        mailboxType: 'UserMailbox' | 'SharedMailbox' | 'RoomMailbox';
        mailboxSize?: number;
        lastActivity?: Date;
        forwardingEnabled: boolean;
        archiveEnabled: boolean;
        litigationHoldEnabled: boolean;
    };

    // Consolidated Cloud Usage Data (from Cloud Reporting)
    usageData?: {
        licenseType?: string;          // E5, E3, F3, etc.
        lastInteractiveSignIn?: string;
        exchangeLastActivity?: string; // Date string
        teamsLastActivity?: string;    // Date string
        sharepointLastActivity?: string; // Future use
    };

    // Calculated Intelligence
    healthStatus: 'Active' | 'Warning' | 'Stale' | 'Disabled';
    riskFactors: string[];
    recommendations: string[];

    // Special Categories
    isGuest: boolean;              // Entra ID guest user
    isTarget: boolean;             // UPN contains "target.ae#EXT#@"
    isPrivileged: boolean;         // Has admin roles
    isServiceAccount: boolean;     // Identified as service account
}

// Multi-Source Collection Result
export interface UserCollectionResult {
    users: EnhancedUser[];
    sources: {
        ad: { success: boolean; count: number; duration: number; error?: string };
        entra: { success: boolean; count: number; duration: number; error?: string };
        exchange: { success: boolean; count: number; duration: number; error?: string };
    };
    correlationStats: {
        totalUsers: number;
        adOnly: number;
        entraOnly: number;
        exchangeOnly: number;
        allSources: number;
        partialSources: number;
    };
    performance: {
        totalDuration: number;
        cacheHits: number;
        apiCalls: number;
    };
}

// Enhanced Dashboard Summary
export interface UserSummary {
    // Existing tiles (preserved for backward compatibility)
    total: number;
    enabled: number;
    disabled: number;
    withEmail: number;
    neverChanged: number;
    stalled: number;
    neverLogin: number;
    passwordExpired: number;
    licenseE5: number;
    licenseE3: number;
    licenseE1: number;
    licenseF3: number;
    noMfa: number;

    // New enhanced tiles
    guestUsers: number;            // Entra ID guest users
    targetUsers: number;           // Users with target.ae#EXT#@ pattern
    privilegedUsers: number;       // Users with admin roles
    serviceAccounts: number;       // Identified service accounts
    multiSourceUsers: number;      // Users present in multiple sources
    healthyUsers: number;          // Users with 'Active' health status
    atRiskUsers: number;          // Users with warnings or risks

    // Source distribution
    adOnlyUsers: number;       // Strict: AD Only (Unsynced)
    entraOnlyUsers: number;    // Strict: Entra Only (Cloud Native)
    exchangeOnlyUsers: number;
    allSourcesUsers: number;

    // Total Source Counts (Inclusive)
    totalAdUsers: number;      // All users present in AD
    totalEntraUsers: number;   // All users present in Entra
}

// Multi-Source Credentials
export interface MultiSourceCredentials {
    ad?: ADCredentials;
    entra?: EntraCredentials;
    exchange?: ExchangeCredentials;
}

export interface ADCredentials {
    server: string;
    domain: string;
    username?: string;
    password?: string;
    useCurrentUser?: boolean;
    sessionId?: string;
}

export interface EntraCredentials {
    tenantId: string;
    clientId: string;
    clientSecret?: string;
    certificateThumbprint?: string;
    accessToken?: string;
}

export interface ExchangeCredentials {
    tenantId?: string;
    appId?: string;
    organization: string;
    certificateThumbprint?: string;
    accessToken?: string;
}

// Collector Interfaces
export interface IUserCollector<TCredentials = any, TUser = any> {
    fetchUsers(credentials: TCredentials): Promise<TUser[]>;
    validateCredentials(credentials: TCredentials): Promise<boolean>;
    getSourceName(): string;
    getHealthStatus(): Promise<CollectorHealthStatus>;
}

export interface CollectorHealthStatus {
    isHealthy: boolean;
    lastSuccessfulFetch?: Date;
    lastError?: string;
    responseTime?: number;
}

// Cache Interface
export interface TTLCache<T> {
    get(key: string): T | null;
    set(key: string, value: T, ttl?: number): void;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
}

// Tile Configuration Types
export interface TileConfig {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    getValue: (summary: UserSummary) => number;
    getFilter: () => string;
    isNew?: boolean; // Mark new tiles for visual distinction
    category?: 'basic' | 'enhanced' | 'source' | 'health';
}

export interface TileClickEvent {
    tileId: string;
    filter: string;
    count: number;
}

// Enhanced Dashboard Models
export interface DashboardState {
    summary: UserSummary | null;
    selectedTile: string | null;
    activeFilters: EnhancedFilters;
    loadingStates: {
        ad: boolean;
        entra: boolean;
        exchange: boolean;
        summary: boolean;
    };
    errors: {
        ad?: string;
        entra?: string;
        exchange?: string;
    };
}

export interface EnhancedFilters {
    // Existing filters (preserved)
    searchString?: string;
    status?: 'All' | 'Active' | 'Disabled';
    upnSuffix?: string;
    searchBase?: string;
    stalledDays?: number;
    passwordAge?: number;
    department?: string;

    // New enhanced filters
    userType?: 'All' | 'Member' | 'Guest' | 'Target' | 'Privileged' | 'Service';
    healthStatus?: 'All' | 'Active' | 'Warning' | 'Stale' | 'Disabled';
    sources?: ('ad' | 'entra' | 'exchange')[];
    riskLevel?: 'All' | 'Low' | 'Medium' | 'High';
    hasMailbox?: boolean;
    mfaEnabled?: boolean;
    licenseType?: string[];
}

// Progressive Loading Types
export interface ProgressiveLoadingState {
    phase: 'initializing' | 'loading-ad' | 'loading-entra' | 'loading-exchange' | 'correlating' | 'complete' | 'error';
    completedSources: string[];
    totalSources: number;
    currentSource?: string;
    progress: number; // 0-100
    estimatedTimeRemaining?: number;
}

export interface SourceLoadingIndicator {
    source: 'ad' | 'entra' | 'exchange';
    status: 'pending' | 'loading' | 'success' | 'error' | 'skipped';
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    error?: string;
    count?: number;
}

// Error Recovery Types
export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

export interface CircuitBreakerState {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime?: Date;
    nextAttemptTime?: Date;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
    count: number;
    duration: number;
    totalAvailable?: number;
    isLimited?: boolean;
    cacheHitRate?: number;
    apiCallCount?: number;
    averageResponseTime?: number;
    sourceBreakdown?: {
        ad?: number;
        entra?: number;
        exchange?: number;
    };
}

// Bulk Operations Types (enhanced)
export type EnhancedBulkActionType =
    | 'enable'
    | 'disable'
    | 'move'
    | 'suffix'
    | 'resetPassword'
    | 'removeFromGroup'
    | 'addToGroup'
    | 'assignLicense'
    | 'removeLicense'
    | 'enableMfa'
    | 'disableMfa';

export interface EnhancedBulkActionParams {
    action: EnhancedBulkActionType;
    userIds: string[];
    targetValue?: string;
    sourceFilter?: ('ad' | 'entra' | 'exchange')[];
    confirmationRequired?: boolean;
}

// Search and Filtering Types
export interface SearchResult {
    users: EnhancedUser[];
    totalCount: number;
    searchTerm: string;
    appliedFilters: EnhancedFilters;
    highlights: SearchHighlight[];
    facets: SearchFacet[];
}

export interface SearchHighlight {
    userId: string;
    field: string;
    matches: { start: number; end: number; text: string }[];
}

export interface SearchFacet {
    field: string;
    values: { value: string; count: number }[];
}

// Export/Import Types
export interface ExportOptions {
    format: 'csv' | 'json' | 'xlsx';
    includeColumns: string[];
    includeEntraData: boolean;
    includeExchangeData: boolean;
    filterApplied: EnhancedFilters;
}

export interface ImportResult {
    success: boolean;
    processedCount: number;
    errorCount: number;
    errors: ImportError[];
    warnings: ImportWarning[];
}

export interface ImportError {
    row: number;
    field: string;
    value: string;
    message: string;
}

export interface ImportWarning {
    row: number;
    field: string;
    value: string;
    message: string;
}