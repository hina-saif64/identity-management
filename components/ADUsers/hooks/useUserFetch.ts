// Custom Hook: User Data Fetching
// Label: AD-HOOK-FETCH

import { useState, useCallback } from 'react';
import { apiService } from '../../../services/apiService';
import { taskManager } from '../../../services/taskManager';
import type { ConnectionState, AdFetchFilters, PerformanceMetrics } from '../types/adUsers.types';
import type { ADUser, LogEntry } from '../../../types';

/**
 * Manages user data fetching with task management integration
 * 
 * @param {ConnectionState} connection - AD connection state
 * @param {Function} addLog - Log handler
 * @returns {Object} Users, loading state, and fetch handler
 * 
 * @example
 * const { users, loading, error, perfMetrics, fetchUsers } = useUserFetch(connection, addLog);
 */
export const useUserFetch = (
    connection: ConnectionState,
    addLog: (message: string, module: string, level?: string) => void
) => {
    const [users, setUsers] = useState<ADUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics | null>(null);

    const fetchUsers = useCallback(async (filters: AdFetchFilters) => {
        if (!connection.sessionId) {
            setError('No active session');
            return;
        }

        const taskId = taskManager.createTask(
            'AD_FETCH',
            (progress, message) => {
                // Progress callback
            },
            (result) => {
                // Success callback
                if (result.users) {
                    setUsers(result.users);
                    setPerfMetrics({
                        count: result.count || result.users.length,
                        duration: result.duration || 0,
                        totalAvailable: result.totalFound,
                        isLimited: result.isLimited,
                    });
                    addLog(
                        `✅ Fetched ${result.users.length} users in ${result.duration}ms`,
                        'AD-USERS',
                        'success'
                    );
                }
            },
            (errorMsg) => {
                // Error callback
                setError(errorMsg);
                addLog(
                    `❌ Fetch failed: ${errorMsg}`,
                    'AD-USERS',
                    'error'
                );
            }
        );

        setLoading(true);
        setError(null);

        try {
            taskManager.updateTask(taskId, {
                progress: 10,
                message: 'Connecting to AD...',
            });

            const result = await apiService.fetchUsers(
                connection.backendUrl,
                connection.sessionId,
                filters
            );

            taskManager.updateTask(taskId, {
                progress: 100,
                message: 'Complete',
                status: 'completed',
                result,
            });
        } catch (err: any) {
            const errorMessage = err.message || 'Failed to fetch users';
            taskManager.updateTask(taskId, {
                status: 'error',
                error: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    }, [connection.sessionId, connection.backendUrl, addLog]);

    return {
        users,
        loading,
        error,
        perfMetrics,
        fetchUsers,
        setUsers, // For optimistic updates
    };
};
