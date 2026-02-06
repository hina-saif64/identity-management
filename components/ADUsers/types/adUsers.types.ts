// User Intelligence Module - TypeScript Type Definitions
// Label: USER-INTEL-TYPES

import type { ADUser as BaseADUser, ConnectionState, LogEntry } from '../../../types';

// Re-export base types
export type { BaseADUser as ADUser, ConnectionState, LogEntry };

// Filter types
export interface AdFetchFilters {
    searchString?: string;
    status?: 'All' | 'Enabled' | 'Disabled';
    upnSuffix?: string;
    searchBase?: string;
    stalledDays?: number;
    passwordAge?: number;
    department?: string; // Added to match root types.ts
}

// Domain info types
export interface DomainInfo {
    upns: string[];
    ous: OU[];
}

export interface OU {
    Name: string;
    DN: string;
}

// Performance metrics
export interface PerformanceMetrics {
    count: number;
    duration: number;
    totalAvailable?: number;
    isLimited?: boolean;
}

// Bulk action types
export type BulkActionType = 'enable' | 'disable' | 'move' | 'suffix' | 'resetPassword';

export interface BulkActionParams {
    action: BulkActionType;
    ids: string[];
    targetValue?: string;
}

// Persisted state interface
export interface ADUsersPersistedState {
    users: BaseADUser[];
    perfMetrics: PerformanceMetrics | null;
    lastFetched: string | null;
    summary?: any;
}

// Component props
export interface UserTableProps {
    connection: ConnectionState;
    addLog: (message: string, module: LogEntry['module'], level?: LogEntry['level']) => void;
    persistedState?: ADUsersPersistedState;
    onStateChange?: (state: ADUsersPersistedState) => void;
}

export interface UserTableRowProps {
    user: BaseADUser;
    selected: boolean;
    onSelect: (id: string) => void;
    isProcessing: boolean;
    actionType?: string;
}

export interface UserTableHeaderProps {
    allSelected: boolean;
    onToggleSelectAll: () => void;
    hasUsers: boolean;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (column: string) => void;
}

export interface FilterPanelProps {
    filters: AdFetchFilters;
    onFilterChange: (filters: AdFetchFilters) => void;
    onExecute: () => void;
    isFetching: boolean;
    onExport: (format: 'csv' | 'json') => void;
    isFilterCollapsed: boolean;
    onToggleCollapse: () => void;
    domainInfo: DomainInfo;
}

export interface BulkActionBarProps {
    selectedCount: number;
    onAction: (action: BulkActionType, targetValue?: string) => void;
    onClearSelection: () => void;
    isActing: boolean;
    onShowOUSelector: () => void;
    onShowUPNSelector: () => void;
}

export interface OUSelectorProps {
    show: boolean;
    onClose: () => void;
    ous: OU[];
    selectedCount: number;
    onSelect: (ou: { name: string; dn: string }) => void;
    onConfirm: (dn: string) => void;
}

export interface UPNSelectorProps {
    show: boolean;
    onClose: () => void;
    upns: string[];
    selectedCount: number;
    onSelect: (upn: string) => void;
}

export interface PerformanceMetricsProps {
    metrics: PerformanceMetrics | null;
}
