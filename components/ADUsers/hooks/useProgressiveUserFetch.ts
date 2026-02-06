// Custom Hook: Progressive User Fetching with Pagination
// Label: AD-HOOK-PROGRESSIVE

import { useState, useCallback, useRef } from 'react';
import { apiService } from '../../../services/apiService';
import type { ConnectionState, AdFetchFilters, PerformanceMetrics } from '../types/adUsers.types';
import type { ADUser } from '../../../types';

interface ProgressInfo {
    current: number;
    total: number;
    percentage: number;
    estimatedTimeRemaining: number; // in seconds
}

/**
 * Progressive user fetching with pagination
 * Loads users in chunks with real-time progress tracking
 * 
 * @param {ConnectionState} connection - AD connection state
 * @param {Function} addLog - Log handler
 * @returns {Object} Users, progress, loading state, and control functions
 */
export const useProgressiveUserFetch = (
    connection: ConnectionState,
    addLog: (message: string, module: string, level?: string) => void
) => {
    const [users, setUsers] = useState<ADUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics | null>(null);
    const [progress, setProgress] = useState<ProgressInfo | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const startTimeRef = useRef<number>(0);

    const fetchUsersProgressively = useCallback(async (filters: AdFetchFilters) => {
        if (!connection.sessionId) {
            setError('No active session');
            return;
        }

        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);
        setUsers([]);
        setProgress(null);
        startTimeRef.current = Date.now();

        const pageSize = 50;
        let pageNumber = 1;
        let hasMore = true;
        let totalCount = 0;
        let accumulatedUsers: ADUser[] = [];
        let totalDuration = 0;

        try {
            addLog('🔄 Starting progressive user fetch...', 'AD-USERS', 'info');

            while (hasMore && !abortControllerRef.current.signal.aborted) {
                const pageStartTime = Date.now();

                // Fetch page using PowerShell pagination
                const result = await apiService.fetchUsersPaginated(
                    connection.backendUrl,
                    connection.sessionId,
                    filters,
                    pageSize,
                    pageNumber,
                    abortControllerRef.current.signal
                );

                if (result.error) {
                    throw new Error(result.detail || result.error);
                }

                // Update total count on first page
                if (pageNumber === 1) {
                    totalCount = result.totalCount || 0;
                    addLog(`📊 Found ${totalCount} total users`, 'AD-USERS', 'info');
                }

                // Accumulate users
                if (result.users && result.users.length > 0) {
                    accumulatedUsers = [...accumulatedUsers, ...result.users];
                    setUsers(accumulatedUsers);
                }

                // Update progress
                const currentCount = accumulatedUsers.length;
                const percentage = totalCount > 0 ? Math.round((currentCount / totalCount) * 100) : 0;

                // Calculate estimated time remaining
                const elapsedTime = (Date.now() - startTimeRef.current) / 1000; // seconds
                const avgTimePerUser = currentCount > 0 ? elapsedTime / currentCount : 0;
                const remainingUsers = totalCount - currentCount;
                const estimatedTimeRemaining = Math.ceil(avgTimePerUser * remainingUsers);

                setProgress({
                    current: currentCount,
                    total: totalCount,
                    percentage,
                    estimatedTimeRemaining
                });

                totalDuration += result.duration || 0;
                hasMore = result.hasMore;
                pageNumber++;

                addLog(
                    `📥 Loaded ${currentCount}/${totalCount} users (${percentage}%)`,
                    'AD-USERS',
                    'info'
                );

                // Small delay to prevent UI blocking
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Check if cancelled
            if (abortControllerRef.current.signal.aborted) {
                addLog(`⏹️ Fetch cancelled at ${accumulatedUsers.length}/${totalCount} users`, 'AD-USERS', 'warning');
                setPerfMetrics({
                    count: accumulatedUsers.length,
                    duration: totalDuration,
                    totalAvailable: totalCount,
                    isLimited: false
                });
            } else {
                // Success
                addLog(`✅ Loaded all ${accumulatedUsers.length} users in ${totalDuration}ms`, 'AD-USERS', 'success');
                setPerfMetrics({
                    count: accumulatedUsers.length,
                    duration: totalDuration,
                    totalAvailable: totalCount,
                    isLimited: false
                });
                setProgress(null); // Clear progress when complete
            }

        } catch (err: any) {
            if (err.name === 'AbortError') {
                addLog(`⏹️ Fetch cancelled`, 'AD-USERS', 'warning');
            } else {
                const errorMessage = err.message || 'Failed to fetch users';
                setError(errorMessage);
                addLog(`❌ Fetch failed: ${errorMessage}`, 'AD-USERS', 'error');
            }
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    }, [connection.sessionId, connection.backendUrl, addLog]);

    const cancelFetch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            addLog('⏹️ Cancelling fetch...', 'AD-USERS', 'info');
        }
    }, [addLog]);

    return {
        users,
        loading,
        error,
        perfMetrics,
        progress,
        fetchUsersProgressively,
        cancelFetch,
        setUsers, // For optimistic updates
    };
};
