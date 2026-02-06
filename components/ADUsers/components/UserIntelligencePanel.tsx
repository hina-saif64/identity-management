// User Intelligence Panel - Enhanced Multi-Source User Management
// Label: USER-INTELLIGENCE-PANEL

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Download, Timer, Database } from 'lucide-react';
import XLSX from 'xlsx-js-style';
import type {
    EnhancedUser,
    UserCollectionResult,
    UserSummary,
    MultiSourceCredentials,
    DashboardState,
    ProgressiveLoadingState,
    SourceLoadingIndicator
} from '../types/enhanced.types';
import { MultiSourceCollector, multiSourceCollector } from '../services/MultiSourceCollector';
import { ENHANCED_TILES, ENHANCED_DEV_LABELS } from '../constants/enhanced.constants';
import { UserDashboard } from './UserDashboard';
import { UserTableEnhanced } from './UserTableEnhanced';
import { BulkActionBar } from './BulkActions/BulkActionBar';
import { apiService } from '../../../services/apiService';
import { CloudUsageEntry } from '../../../types';
import { UserFilters, UserFiltersState } from './Filters/UserFilters';
import { filterUsers } from '../../../modules/access-intelligence/utils/userFiltering';

import type { ConnectionState, CloudConnectionState, ExchangeConnectionState } from '../../../types';

interface UserIntelligencePanelProps {
    connection: ConnectionState;
    cloudConnection?: CloudConnectionState;
    exchangeConnection?: ExchangeConnectionState;
    addLog: (message: string, module: string, level?: string) => void;
    persistedState?: any;
    onStateChange?: (state: any) => void;
}

export const UserIntelligencePanel: React.FC<UserIntelligencePanelProps> = ({
    connection,
    cloudConnection,
    exchangeConnection,
    addLog,
    persistedState,
    onStateChange
}) => {
    // State management for multi-source data
    const [dashboardState, setDashboardState] = useState<DashboardState>({
        summary: null,
        selectedTile: null,
        activeFilters: {
            searchString: '',
            status: 'All',
            userType: 'All',
            healthStatus: 'All',
            sources: []
        },
        loadingStates: {
            ad: false,
            entra: false,
            exchange: false,
            summary: false
        },
        errors: {}
    });

    const [users, setUsers] = useState<EnhancedUser[]>([]);
    const [collectionResult, setCollectionResult] = useState<UserCollectionResult | null>(null);
    const [progressiveState, setProgressiveState] = useState<ProgressiveLoadingState>({
        phase: 'initializing',
        completedSources: [],
        totalSources: 0,
        progress: 0
    });

    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isActing, setIsActing] = useState(false);

    // const [collector] = useState(() => new MultiSourceCollector()); // REFACTORED: Using singleton multiSourceCollector

    // Refs to track loading state and prevent infinite loops
    const persistenceLoadedRef = useRef(false);
    const hasLoadedOnMountRef = useRef(false);
    const addLogRef = useRef(addLog);
    addLogRef.current = addLog;

    // Load persisted data on mount ONLY ONCE
    useEffect(() => {
        // Guard: only run once per mount
        if (hasLoadedOnMountRef.current) {
            return;
        }

        if (persistedState?.users && persistedState.users.length > 0) {
            console.log('🔄 Loading persisted user data...');
            setUsers(persistedState.users);
            setCollectionResult(persistedState.collectionResult || null);
            setDashboardState(prev => ({
                ...prev,
                summary: persistedState.summary || null
            }));

            // Mark as loaded from persistence to prevent immediate save-back
            persistenceLoadedRef.current = true;
            hasLoadedOnMountRef.current = true;

            addLogRef.current('Loaded persisted user intelligence data', 'USER-INTELLIGENCE', 'info');
        } else {
            // No persisted data, fetch fresh data if we have connections
            if (connection.isConnected || cloudConnection?.isConnected || exchangeConnection?.isConnected) {
                console.log('🔄 No persisted data, fetching fresh user data...');
                hasLoadedOnMountRef.current = true;
                fetchUsers();
            }
        }
    }, []); // Empty dependency array - run only on mount

    // Persist state changes (with ref to avoid infinite loop)
    const onStateChangeRef = useRef(onStateChange);
    onStateChangeRef.current = onStateChange;

    useEffect(() => {
        if (users.length > 0 && onStateChangeRef.current) {
            // If just loaded from persistence, skip saving back to parent
            // This prevents an infinite loop of Load -> Save -> Parent Update -> Remount -> Load
            if (persistenceLoadedRef.current) {
                persistenceLoadedRef.current = false;
                return;
            }

            const stateToSave = {
                users,
                collectionResult,
                summary: dashboardState.summary,
                lastFetched: new Date().toISOString()
            };
            onStateChangeRef.current(stateToSave);
        }
    }, [users, collectionResult, dashboardState.summary]);

    // Progressive loading handler
    const handleProgressUpdate = useCallback((phase: string, progress: number, source?: string) => {
        setProgressiveState(prev => ({
            ...prev,
            phase: phase as any,
            progress,
            currentSource: source
        }));

        // Update loading states
        if (source) {
            setDashboardState(prev => ({
                ...prev,
                loadingStates: {
                    ...prev.loadingStates,
                    [source.replace('loading-', '')]: phase === 'complete'
                }
            }));
        }
    }, []);

    // Fetch users from all available sources
    // Fetch users from all available sources - FAST UNIFIED APPROACH
    // Fetch users from all available sources - FAST UNIFIED APPROACH (Background Persistent)
    const fetchUsers = useCallback(async (forceRefresh = false) => {
        try {
            console.log('🔍 DEBUG: fetchUsers called - Delegating to Background Singleton');
            addLog('🚀 Starting background user collection...', 'USER-INTELLIGENCE', 'info');

            setDashboardState(prev => ({
                ...prev,
                loadingStates: {
                    ad: connection.isConnected,
                    entra: !!cloudConnection?.isConnected,
                    exchange: !!exchangeConnection?.isConnected,
                    summary: true
                },
                errors: {}
            }));

            // Delegated to Singleton Service
            const result = await multiSourceCollector.collectUnifiedUsers(
                connection.backendUrl || 'http://localhost:3001',
                connection.sessionId,
                {
                    cloud: !!cloudConnection?.isConnected,
                    exchange: !!exchangeConnection?.isConnected
                },
                forceRefresh
            );

            // Once resolved (even if component re-mounted), update UI
            console.log('🔍 DEBUG: Enhanced users:', result.users.length);
            setUsers(result.users);

            // Use the summary from the result logic
            const summary = generateUserSummary(result.users);

            setDashboardState(prev => ({
                ...prev,
                summary,
                loadingStates: { ad: false, entra: false, exchange: false, summary: false }
            }));

            // Store collection result
            setCollectionResult(result);

            addLog(`✅ Collection completed: ${result.users.length} users processed`, 'USER-INTELLIGENCE', 'success');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('🔍 DEBUG: Unified fetch error:', error);
            addLog(`❌ Unified user collection failed: ${errorMessage}`, 'USER-INTELLIGENCE', 'error');

            setDashboardState(prev => ({
                ...prev,
                loadingStates: { ad: false, entra: false, exchange: false, summary: false },
                errors: { ad: errorMessage }
            }));
        }
    }, [connection, cloudConnection, exchangeConnection, addLog]);

    // Generate user summary for tiles
    const generateUserSummary = (users: EnhancedUser[]): UserSummary => {
        return {
            // Existing tiles (preserved for backward compatibility)
            // SURGICAL FIX: Total should EXCLUDE Guests, Targets, and #EXT# users (Case Insensitive)
            total: users.filter(u => !u.isGuest && !u.isTarget && !u.upn?.toLowerCase().includes('#ext#')).length,
            enabled: users.filter(u => u.status === 'Active' && !u.isGuest && !u.isTarget && !u.upn?.toLowerCase().includes('#ext#')).length,
            disabled: users.filter(u => u.status === 'Disabled' && !u.isGuest && !u.isTarget && !u.upn?.toLowerCase().includes('#ext#')).length,
            withEmail: users.filter(u => u.email && u.email.trim() !== '' && !u.isGuest && !u.isTarget).length,
            // SURGICAL FIX: Old Pwd - Exclude #EXT# users
            neverChanged: users.filter(u => u.lastPasswordSet === 'Never' && !u.isGuest && !u.isTarget && !u.upn?.toLowerCase().includes('#ext#')).length,
            // FIXED: Stale users - Active users with no activity for > 90 days. Excludes Guests/B2B.
            stalled: users.filter(u => {
                // 1. Must be ACTIVE
                if (u.status !== 'Active') return false;

                // 2. AGGRESSIVE GUEST EXCLUSION
                // Exclude if explicitly marked as guest
                if (u.isGuest) return false;

                // Exclude if Entra UserType is Guest
                if (u.entraData?.userType === 'Guest') return false;

                // Exclude if CreationType is Invitation
                if (u.entraData?.creationType === 'Invitation') return false;

                // Exclude if UPN looks like a B2B guest (#EXT#)
                if ((u.upn || '').toLowerCase().includes('#ext#')) return false;

                // Exclude known target/service patterns
                if (u.isTarget) return false;

                // 3. Activity Check
                // Get latest login date from AD, Entra, or usage data
                const adLastLogin = u.lastLogin && u.lastLogin !== 'Never' ? new Date(u.lastLogin) : null;
                const entraLastLogin = u.entraData?.lastSignIn ? new Date(u.entraData.lastSignIn) : null;
                const usageLastLogin = u.usageData?.lastInteractiveSignIn ? new Date(u.usageData.lastInteractiveSignIn) : null;

                // Use the most recent date
                const latestLogin = [adLastLogin, entraLastLogin, usageLastLogin]
                    .filter(d => d !== null)
                    .sort((a, b) => b.getTime() - a.getTime())[0];

                if (!latestLogin) return false; // No login data (counted as 'Never Login', not Stale)

                // Stale if no activity in last 90 days
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                return latestLogin < ninetyDaysAgo;
            }).length,
            // SURGICAL FIX: No Login - Exclude #EXT# users
            neverLogin: users.filter(u => u.lastLogin === 'Never' && !u.isGuest && !u.isTarget && !u.upn?.toLowerCase().includes('#ext#')).length,
            passwordExpired: users.filter(u => u.healthStatus === 'Warning' && u.lastPasswordSet !== 'Never' && !u.isGuest && !u.isTarget).length,
            // DO NOT TOUCH - License tiles working 100%
            licenseE5: users.filter(u => u.license?.includes('E5') && !u.isGuest && !u.isTarget).length,
            licenseE3: users.filter(u => u.license?.includes('E3') && !u.isGuest && !u.isTarget).length,
            licenseE1: users.filter(u => u.license?.includes('E1') && !u.isGuest && !u.isTarget).length,
            licenseF3: users.filter(u => u.license?.includes('F3') && !u.isGuest && !u.isTarget).length,
            noMfa: users.filter(u => u.entraData && !u.entraData.mfaEnabled && !u.isGuest && !u.isTarget).length,

            // New enhanced tiles
            // SURGICAL FIX: Guests - Directly count Entra guests by UserType
            guestUsers: users.filter(u => u.entraData?.userType === 'Guest').length,
            targetUsers: users.filter(u => u.isTarget).length,
            privilegedUsers: users.filter(u => u.isPrivileged && !u.isGuest && !u.isTarget).length,
            serviceAccounts: users.filter(u => u.isServiceAccount && !u.isGuest && !u.isTarget).length,
            multiSourceUsers: users.filter(u => Object.values(u.sources).filter(Boolean).length > 1 && !u.isGuest && !u.isTarget).length,
            healthyUsers: users.filter(u => u.healthStatus === 'Active' && !u.isGuest && !u.isTarget).length,
            atRiskUsers: users.filter(u => u.riskFactors.length > 0 && !u.isGuest && !u.isTarget).length,

            // Source distribution (Source of Truth: AD Only means strictly AD and nothing else)
            adOnlyUsers: users.filter(u => u.sources.ad && !u.sources.entra && !u.sources.exchange && !u.isGuest && !u.isTarget).length,
            // SURGICAL FIX: Entra Only - Cloud-only users, exclude guests and #EXT#
            entraOnlyUsers: users.filter(u => !u.sources.ad && u.sources.entra && !u.isGuest && !u.isTarget && !u.upn?.toLowerCase().includes('#ext#')).length,
            exchangeOnlyUsers: users.filter(u => !u.sources.ad && !u.sources.entra && u.sources.exchange && !u.isGuest && !u.isTarget).length,
            allSourcesUsers: users.filter(u => u.sources.ad && u.sources.entra && u.sources.exchange && !u.isGuest && !u.isTarget).length,

            // Total Source Counts (Inclusive new requirements)
            // SURGICAL FIX: AD Total - Exclude #EXT# users
            totalAdUsers: users.filter(u => u.sources.ad && !u.isGuest && !u.isTarget && !u.upn?.toLowerCase().includes('#ext#')).length,
            totalEntraUsers: users.filter(u => u.sources.entra && !u.isGuest && !u.isTarget).length,
        };
    };

    // Handle tile clicks for filtering
    const handleTileClick = useCallback((tileId: string) => {
        setDashboardState(prev => ({
            ...prev,
            selectedTile: prev.selectedTile === tileId ? null : tileId
        }));

        addLog(`Filtered users by: ${tileId}`, 'USER-INTELLIGENCE', 'info');
    }, [addLog]);

    // Handle advanced filter changes
    const handleFilterChange = useCallback((newFilters: UserFiltersState) => {
        setDashboardState(prev => ({
            ...prev,
            activeFilters: newFilters
        }));
    }, []);

    // Filter users based on active filters and selected tile
    const filteredUsers = React.useMemo(() => {
        return filterUsers(
            users,
            dashboardState.activeFilters,
            dashboardState.selectedTile,
            !!dashboardState.summary
        );
    }, [users, dashboardState.selectedTile, dashboardState.activeFilters, dashboardState.summary]);

    // Export functionality - "What You See Is What You Export"
    const handleExport = useCallback(() => {
        if (filteredUsers.length === 0) {
            addLog('No users to export', 'USER-INTELLIGENCE', 'warning');
            return;
        }

        // Export filtered users with comprehensive data
        const exportData = filteredUsers.map(user => ({
            'Name': user.name || '',
            'UPN': user.upn || '',
            'SAM Account Name': user.samAccountName || '',
            'Email': user.email || '',
            'Status': user.status || '',
            'Health Status': user.healthStatus || '',
            'Department': user.department || '',
            'Description': user.description || '',
            'Distinguished Name': user.distinguishedName || '',
            'Last Login': user.lastLogin || '',
            'Last Password Set': user.lastPasswordSet || '',
            'Created Date': user.createdDate || '',
            'Sources': Object.entries(user.sources || {})
                .filter(([_, hasSource]) => hasSource)
                .map(([source, _]) => source.toUpperCase())
                .join(', '),
            'AD Present': user.sources?.ad ? 'Yes' : 'No',
            'Entra ID Present': user.sources?.entra ? 'Yes' : 'No',
            'Exchange Present': user.sources?.exchange ? 'Yes' : 'No',
            'MFA Enabled': user.entraData?.mfaEnabled ? 'Yes' : 'No',
            'User Type': user.entraData?.userType || '',
            'Account Enabled': user.entraData?.accountEnabled ? 'Yes' : 'No',
            'Risk Level': user.entraData?.riskLevel || '',
            'Compliance State': user.entraData?.complianceState || '',
            'Admin Roles': user.entraData?.adminRoles?.join(', ') || '',
            'License Assignments': user.entraData?.licenseAssignments?.join(', ') || '',
            'License Type': user.license || '',
            'Last Interactive Sign-In': user.usageData?.lastInteractiveSignIn || '',
            'Exchange Last Activity': user.usageData?.exchangeLastActivity || '',
            'Teams Last Activity': user.usageData?.teamsLastActivity || '',
            'Mailbox Type': user.exchangeData?.mailboxType || '',
            'Mailbox Size (MB)': user.exchangeData?.mailboxSize || '',
            'Forwarding Enabled': user.exchangeData?.forwardingEnabled ? 'Yes' : 'No',
            'Archive Enabled': user.exchangeData?.archiveEnabled ? 'Yes' : 'No',
            'Litigation Hold': user.exchangeData?.litigationHoldEnabled ? 'Yes' : 'No',
            'Risk Factors': user.riskFactors?.join(', ') || '',
            'Recommendations': user.recommendations?.join(', ') || '',
            'Is Guest': user.isGuest ? 'Yes' : 'No',
            'Is Privileged': user.isPrivileged ? 'Yes' : 'No',
            'Is Service Account': user.isServiceAccount ? 'Yes' : 'No',
            'Is Target User': user.isTarget ? 'Yes' : 'No',
            'Ext Attribute 7': user.extAttribute7 || '',
            'Ext Attribute 10': user.extAttribute10 || '',
            'Ext Attribute 14': user.extAttribute14 || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);

        // Apply styling based on active filter (similar to Device Inventory)
        if (dashboardState.selectedTile) {
            const range = XLSX.utils.decode_range(ws['!ref'] || '');
            for (let R = range.s.r + 1; R <= range.e.r; ++R) { // Start from 1 to skip header
                const userIndex = R - 1;
                const user = filteredUsers[userIndex];

                if (user) {
                    let fillColor = null;

                    // Apply different colors based on user categories
                    if (user.isGuest) {
                        fillColor = { rgb: "FEF3C7" }; // Yellow for guests
                    } else if (user.isPrivileged) {
                        fillColor = { rgb: "DBEAFE" }; // Blue for privileged
                    } else if (user.status === 'Disabled') {
                        fillColor = { rgb: "FEE2E2" }; // Red for disabled
                    } else if (user.healthStatus === 'Active') {
                        fillColor = { rgb: "D1FAE5" }; // Green for active/healthy
                    } else if (user.riskFactors?.length > 0) {
                        fillColor = { rgb: "FECACA" }; // Light red for at-risk users
                    }

                    if (fillColor) {
                        // Apply to all columns in this row
                        for (let C = range.s.c; C <= range.e.c; ++C) {
                            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                            if (!ws[cellRef]) continue;

                            if (!ws[cellRef].s) ws[cellRef].s = {};
                            ws[cellRef].s.fill = { fgColor: fillColor };
                        }
                    }
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "User Intelligence");

        // Generate filename with current filter info
        const filterInfo = dashboardState.selectedTile ? `_${dashboardState.selectedTile}` : '';
        const filename = `Hyperion_User_Intelligence${filterInfo}_${new Date().toISOString().split('T')[0]}.xlsx`;

        XLSX.writeFile(wb, filename);
        addLog(`Exported ${filteredUsers.length} users to Excel (${filename})`, 'USER-INTELLIGENCE', 'success');
    }, [filteredUsers, dashboardState.selectedTile, addLog]);

    const handleBulkAction = async (action: string, value?: string, manualTargetIds?: string[]) => {
        const targetIds = manualTargetIds ? manualTargetIds : Array.from(selectedUsers);

        if (targetIds.length === 0) {
            addLog('No users selected for action', 'USER-ACTION', 'warning');
            return;
        }

        setIsActing(true);
        addLog(`Executing ${action} on ${targetIds.length} users`, 'USER-ACTION', 'info');

        try {
            // Restore REAL API call matching V1
            await apiService.bulkAction(
                connection.backendUrl || 'http://localhost:3001',
                connection.sessionId,
                action,
                targetIds,
                value
            );

            // Fetch fresh data after action
            await fetchUsers(true);

            // Clear selection after success
            if (!manualTargetIds) {
                setSelectedUsers(new Set());
            }

            addLog(`Successfully executed ${action} on ${targetIds.length} users`, 'USER-ACTION', 'success');
        } catch (err: any) {
            addLog(`Action failed: ${err.message}`, 'USER-ACTION', 'error');
        } finally {
            setIsActing(false);
        }
    };

    const handleInlineAction = useCallback((action: string, user: EnhancedUser) => {
        // Handle actions that need input (like password reset)
        if (action === 'resetPassword') {
            const password = prompt(`Enter new password for ${user.name}:`);
            if (password && password.length >= 8) {
                handleBulkAction('resetPassword', password, [user.id]);
            } else if (password) {
                alert('Password must be at least 8 characters long.');
            }
            return;
        }

        // Handle other actions directly
        handleBulkAction(action, undefined, [user.id]);
    }, [handleBulkAction]);

    // Check if we have any data loading
    const isLoading = Object.values(dashboardState.loadingStates).some(Boolean);
    const hasAnyConnection = connection.isConnected || cloudConnection?.isConnected || exchangeConnection?.isConnected;

    console.log('🔍 DEBUG: Connection states:', {
        ad: connection.isConnected,
        cloud: cloudConnection?.isConnected,
        exchange: exchangeConnection?.isConnected,
        hasAnyConnection,
        isLoading
    });

    console.log('🔍 DEBUG: UserIntelligencePanel rendering...');

    return (
        <div className="space-y-4" data-dev-label={ENHANCED_DEV_LABELS.USER_INTELLIGENCE}>
            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                        {users.length} users collected from {Object.values(collectionResult?.sources || {}).filter((s: any) => s.success).length} sources
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        disabled={filteredUsers.length === 0}
                        className="px-3 py-1.5 text-sm rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        title={`Export ${filteredUsers.length} filtered users to Excel`}
                    >
                        <Download className="w-4 h-4" />
                        Export ({filteredUsers.length})
                    </button>

                    <button
                        onClick={async () => {
                            try {
                                const testResponse = await fetch(`${connection.backendUrl || 'http://localhost:3001'}/api/health`);
                                console.log('Checking health...', testResponse.status);
                            } catch (err) {
                                console.error('Health check failed', err);
                            }
                        }}
                        className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 text-xs font-medium dark:bg-gray-800 dark:text-gray-400"
                    >
                        Check Health
                    </button>
                    <button
                        onClick={() => fetchUsers(true)}
                        disabled={isLoading || !hasAnyConnection}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-medium"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Updating...
                            </>
                        ) : (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Enhanced Loading with PowerShell-style Logs */}
            {isLoading && (
                <div className="space-y-4">
                    {/* Real-time Log Viewer - PowerShell Style */}
                    <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-green-300 font-semibold">🔍 Real-time Collection Progress</h4>
                            <span className="text-xs text-gray-400">Live updates from backend</span>
                        </div>
                        <div className="space-y-1">
                            <div className="text-green-400">🚀 Starting unified user collection with detailed progress...</div>
                            <div className="text-blue-400">📡 Connecting to data sources...</div>
                            <div className="text-yellow-400">⏳ Processing users from multiple sources...</div>
                            <div className="text-cyan-400">🔗 Correlating user data across AD and Entra ID...</div>
                            <div className="text-gray-400">💡 Tip: Check the Backend Logs panel for detailed real-time progress</div>
                            <div className="text-purple-400">📊 This provides the same detailed logging as PowerShell scripts</div>
                        </div>
                    </div>
                </div>
            )}

            {/* PERFORMANCE METRIC BADGES (Restored from V1) */}
            {collectionResult && !isLoading && (
                <div className="flex items-center flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                        <Timer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                            {collectionResult.performance.totalDuration}ms Response Time
                        </span>
                    </div>
                    <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                        <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            {collectionResult.correlationStats.totalUsers.toLocaleString()} Objects Cached
                        </span>
                    </div>
                </div>
            )}

            {/* Dashboard Tiles */}
            <UserDashboard
                summary={dashboardState.summary}
                isLoading={isLoading}
                loadingStates={dashboardState.loadingStates}
                onTileClick={handleTileClick}
            />

            {/* Main Table Area */}
            {users.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <UserTableEnhanced
                        users={users}
                        onUserSelect={(userId) => {
                            setSelectedUsers(prev => {
                                const next = new Set(prev);
                                if (next.has(userId)) next.delete(userId);
                                else next.add(userId);
                                return next;
                            });
                        }}
                        selectedUsers={selectedUsers}
                        onSelectAll={(allIds) => setSelectedUsers(new Set(allIds))}
                        onClearSelection={() => setSelectedUsers(new Set())}
                        filter={dashboardState.selectedTile || 'all'}
                        onAction={handleInlineAction}
                    />
                </div>
            ) : (
                /* Empty / Initial State */
                !isLoading && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users loaded</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {!hasAnyConnection
                                ? 'Please establish a connection to Active Directory, Entra ID, or Exchange Online.'
                                : dashboardState.errors.ad
                                    ? dashboardState.errors.ad
                                    : 'Click "Refresh" to load users from available sources.'
                            }
                        </p>
                    </div>
                )
            )}

            {/* Enhanced Collection Statistics - PowerShell Style */}
            {collectionResult && !isLoading && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        📊 Collection Statistics
                        <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded-full">
                            PowerShell-style detailed reporting
                        </span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Performance Metrics */}
                        <div className="space-y-3">
                            <h5 className="font-medium text-gray-700 dark:text-gray-300">⏱️ Performance</h5>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Total Duration:</span>
                                    <span className="font-medium">{collectionResult.performance.totalDuration}ms</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">API Calls:</span>
                                    <span className="font-medium">{collectionResult.performance.apiCalls}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Cache Hits:</span>
                                    <span className="font-medium text-green-600">{collectionResult.performance.cacheHits}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Avg per User:</span>
                                    <span className="font-medium">{collectionResult.correlationStats.totalUsers > 0 ? Math.round(collectionResult.performance.totalDuration / collectionResult.correlationStats.totalUsers) : 0}ms</span>
                                </div>
                            </div>
                        </div>

                        {/* Source Breakdown */}
                        <div className="space-y-3">
                            <h5 className="font-medium text-gray-700 dark:text-gray-300">🔗 Data Sources</h5>
                            <div className="space-y-2 text-sm">
                                {Object.entries(collectionResult.sources).map(([source, info]: [string, any]) => (
                                    <div key={source} className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                                            {source === 'ad' ? '🏢 Active Directory' :
                                                source === 'entra' ? '☁️ Entra ID' :
                                                    '📧 Exchange Online'}:
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{info.count}</span>
                                            {info.success ? (
                                                <span className="text-green-600 text-xs">✅</span>
                                            ) : (
                                                <span className="text-red-600 text-xs">❌</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Correlation Stats */}
                        <div className="space-y-3">
                            <h5 className="font-medium text-gray-700 dark:text-gray-300">🔄 Data Correlation</h5>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Total Users:</span>
                                    <span className="font-medium">{collectionResult.correlationStats.totalUsers}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">AD-Only:</span>
                                    <span className="font-medium text-blue-600">{collectionResult.correlationStats.adOnly}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Entra-Only:</span>
                                    <span className="font-medium text-purple-600">{collectionResult.correlationStats.entraOnly}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Multi-Source:</span>
                                    <span className="font-medium text-green-600">{collectionResult.correlationStats.partialSources}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quality Metrics */}
                        <div className="space-y-3">
                            <h5 className="font-medium text-gray-700 dark:text-gray-300">📈 Data Quality</h5>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">With Email:</span>
                                    <span className="font-medium">{users.filter(u => u.email && u.email.trim() !== '').length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Guest Users:</span>
                                    <span className="font-medium text-orange-600">{users.filter(u => u.isGuest).length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Never Logged In:</span>
                                    <span className="font-medium text-red-600">{users.filter(u => u.lastLogin === 'Never').length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Active Users:</span>
                                    <span className="font-medium text-green-600">{users.filter(u => u.status === 'Active').length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PowerShell-style Summary */}
                    <div className="mt-6 p-4 bg-gray-800 text-green-400 rounded-lg font-mono text-sm">
                        <div className="text-green-300 font-semibold mb-2">📋 PowerShell-style Summary:</div>
                        <div>✅ Successfully processed {collectionResult.correlationStats.totalUsers} users from {collectionResult.performance.apiCalls} data sources</div>
                        <div>🔗 Found {collectionResult.correlationStats.partialSources} users across multiple sources</div>
                        <div>⏱️ Total execution time: {collectionResult.performance.totalDuration}ms ({(collectionResult.performance.totalDuration / 1000).toFixed(2)}s)</div>
                        <div>📊 Average processing time per user: {collectionResult.correlationStats.totalUsers > 0 ? Math.round(collectionResult.performance.totalDuration / collectionResult.correlationStats.totalUsers) : 0}ms</div>
                        <div className="text-yellow-400 mt-2">💡 This detailed reporting matches the PowerShell script experience you're familiar with!</div>
                    </div>
                </div>
            )}

            {/* Bulk Action Bar - Fixed Bottom */}
            <BulkActionBar
                selectedCount={selectedUsers.size}
                onAction={(action, value) => handleBulkAction(action, value)}
                onClearSelection={() => setSelectedUsers(new Set())}
                isActing={isActing}
                onShowOUSelector={() => handleBulkAction('move')}
                onShowUPNSelector={() => handleBulkAction('suffix')}
            />
        </div>
    );
};