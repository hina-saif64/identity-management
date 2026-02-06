// Custom Hook: Bulk Actions Management
// Label: AD-HOOK-BULK

import { useState, useCallback } from 'react';
import { apiService } from '../../../services/apiService';
import type { ConnectionState, BulkActionType } from '../types/adUsers.types';
import type { ADUser, LogEntry } from '../../../types';

/**
 * Manages bulk operations on user intelligence
 * 
 * @param {ConnectionState} connection - AD connection state
 * @param {Function} addLog - Log handler
 * @param {Function} onSuccess - Success callback
 * @returns {Object} Bulk action state and handlers
 * 
 * @example
 * const { isActing, actioningUsers, userActionTypes, executeBulkAction } = useBulkActions(connection, addLog);
 */
export const useBulkActions = (
    connection: ConnectionState,
    addLog: (message: string, module: string, level?: string) => void,
    onSuccess?: () => void
) => {
    const [isActing, setIsActing] = useState(false);
    const [actioningUsers, setActioningUsers] = useState<Set<string>>(new Set());
    const [userActionTypes, setUserActionTypes] = useState<Map<string, string>>(new Map());

    const executeBulkAction = useCallback(async (
        action: BulkActionType,
        selectedIds: Set<string>,
        targetValue?: string
    ) => {
        if (selectedIds.size === 0 || !connection.sessionId) return;

        setIsActing(true);

        // Set up animation state
        const newActioningUsers = new Set(selectedIds);
        const newActionTypes = new Map<string, string>();
        selectedIds.forEach(id => newActionTypes.set(id, action));

        setActioningUsers(newActioningUsers);
        setUserActionTypes(newActionTypes);

        try {
            await apiService.bulkAction(
                connection.backendUrl,
                connection.sessionId,
                action,
                Array.from(selectedIds),
                targetValue
            );

            addLog(
                `✅ Bulk ${action} completed for ${selectedIds.size} users`,
                'AD-USERS',
                'success'
            );

            // Call success callback after delay for animation
            setTimeout(() => {
                setActioningUsers(new Set());
                setUserActionTypes(new Map());
                onSuccess?.();
            }, 1500);
        } catch (err: any) {
            addLog(
                `❌ Bulk ${action} failed: ${err.message}`,
                'AD-USERS',
                'error'
            );
            setActioningUsers(new Set());
            setUserActionTypes(new Map());
        } finally {
            setIsActing(false);
        }
    }, [connection.sessionId, connection.backendUrl, addLog, onSuccess]);

    return {
        isActing,
        actioningUsers,
        userActionTypes,
        executeBulkAction,
    };
};
