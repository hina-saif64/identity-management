// Custom Hook: User Selection Management
// Label: AD-HOOK-SELECTION

import { useState, useCallback } from 'react';

/**
 * Manages user selection state and operations
 * 
 * @returns {Object} Selection state and handlers
 * 
 * @example
 * const { selectedIds, toggleSelect, toggleSelectAll, clearSelection } = useUserSelection(users);
 */
export const useUserSelection = (users: any[]) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedIds.size === users.length && users.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(users.map(u => u.id)));
        }
    }, [selectedIds.size, users]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const isSelected = useCallback((id: string) => {
        return selectedIds.has(id);
    }, [selectedIds]);

    return {
        selectedIds,
        toggleSelect,
        toggleSelectAll,
        clearSelection,
        isSelected,
        selectedCount: selectedIds.size,
    };
};
