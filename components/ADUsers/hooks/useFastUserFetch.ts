// Custom Hook: Fast Single-Batch User Fetching
// Label: AD-HOOK-FAST-FETCH
// Replaces progressive loading with single fast fetch

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiService } from '../../../services/apiService';
import type { ConnectionState, AdFetchFilters, PerformanceMetrics } from '../types/adUsers.types';
import type { ADUser } from '../../../types';
import type { UserSummary } from '../types/enhanced.types';

/**
 * Fast single-batch user fetching
 * Fetches ALL users in one request (like AD Computers in Device Inventory)
 */
export const useFastUserFetch = (
    connection: ConnectionState,
    addLog: (message: string, module: string, level?: string) => void
) => {
    const [users, setUsers] = useState<ADUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics | null>(null);
    const [summary, setSummary] = useState<UserSummary | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    // Calculate summary from users array
    const calculateSummary = useCallback((userList: ADUser[]): UserSummary => {
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        let enabled = 0;
        let disabled = 0;
        let withEmail = 0;
        let neverChangedPassword = 0;
        let stalled90Days = 0;
        let neverLoggedIn = 0;
        let passwordExpired = 0;
        let licenseE5 = 0;
        let licenseE3 = 0;
        let licenseE1 = 0;
        let licenseF3 = 0;
        let noMFA = 0;

        for (const user of userList) {
            const u = user as any;

            // Status
            if (user.status === 'Active') {
                enabled++;
            } else {
                disabled++;
            }

            // Has email
            if (user.email && user.email.includes('@')) {
                withEmail++;
            }

            // Never changed password
            if (user.lastPasswordSet === 'Never' || !user.lastPasswordSet) {
                neverChangedPassword++;
            }

            // Never logged in
            if (user.lastLogin === 'Never' || !user.lastLogin) {
                neverLoggedIn++;
            } else {
                // Stalled 90+ days
                const lastLoginDate = new Date(user.lastLogin);
                if (!isNaN(lastLoginDate.getTime()) && lastLoginDate < ninetyDaysAgo) {
                    stalled90Days++;
                }
            }

            // Password expired - check if password is old (e.g., > 90 days)
            if (user.lastPasswordSet && user.lastPasswordSet !== 'Never') {
                const pwdDate = new Date(user.lastPasswordSet);
                if (!isNaN(pwdDate.getTime()) && pwdDate < ninetyDaysAgo) {
                    passwordExpired++;
                }
            }

            // License counts
            if (u.license) {
                if (u.license.includes('E5')) licenseE5++;
                if (u.license.includes('E3')) licenseE3++;
                if (u.license.includes('E1')) licenseE1++;
                if (u.license.includes('F3')) licenseF3++;
            }

            // MFA count
            if (u.mfa === 'NO') {
                noMFA++;
            }
        }

        return {
            total: userList.length,
            enabled,
            disabled,
            withEmail,
            neverChanged: neverChangedPassword,
            stalled: stalled90Days,
            neverLogin: neverLoggedIn,
            passwordExpired,
            licenseE5,
            licenseE3,
            licenseE1,
            licenseF3,
            noMFA
        };
    }, []);

    const fetchUsers = useCallback(async (filters: AdFetchFilters = {}) => {
        if (!connection.sessionId) {
            setError('No active session');
            return;
        }

        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        const startTime = Date.now();

        try {
            addLog('🔄 Fetching all users from Active Directory...', 'AD-USERS', 'info');

            // Use existing search endpoint without pagination limit
            const result = await apiService.fetchUsers(
                connection.backendUrl,
                connection.sessionId,
                {
                    status: 'All' as const,
                    stalledDays: 0,
                    passwordAge: 0,
                    ...filters,
                } as any
            );

            if (result.error) {
                throw new Error(result.detail || result.error);
            }

            const userList = result.users || [];
            const duration = Date.now() - startTime;

            // Set users
            setUsers(userList);

            // Calculate and set summary
            const userSummary = calculateSummary(userList);
            setSummary(userSummary);

            // Set performance metrics
            setPerfMetrics({
                count: userList.length,
                duration: result.duration || duration,
                totalAvailable: result.totalFound || userList.length,
                isLimited: result.isLimited || false
            });

            addLog(`✅ Fetched ${userList.length} users in ${duration}ms`, 'AD-USERS', 'success');

        } catch (err: any) {
            if (err.name === 'AbortError') {
                addLog('⏹️ Fetch cancelled', 'AD-USERS', 'warning');
            } else {
                const errorMessage = err.message || 'Failed to fetch users';
                setError(errorMessage);
                addLog(`❌ Fetch failed: ${errorMessage}`, 'AD-USERS', 'error');
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, [connection.sessionId, connection.backendUrl, addLog, calculateSummary]);

    const cancelFetch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            addLog('⏹️ Cancelling fetch...', 'AD-USERS', 'info');
        }
    }, [addLog]);

    // Recalculate summary when users change (for optimistic updates)
    const recalculateSummary = useCallback(() => {
        if (users.length > 0) {
            setSummary(calculateSummary(users));
        }
    }, [users, calculateSummary]);

    // Auto-recalculate summary when users change (fixes tiles after setUsers)
    useEffect(() => {
        if (users.length > 0 && !loading) {
            setSummary(calculateSummary(users));
        }
    }, [users, loading, calculateSummary]);

    return {
        users,
        loading,
        error,
        perfMetrics,
        summary,
        fetchUsers,
        cancelFetch,
        setUsers,
        recalculateSummary
    };
};
