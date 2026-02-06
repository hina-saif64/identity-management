// Custom Hook: User Filters Management
// Label: AD-HOOK-FILTERS

import { useState, useCallback } from 'react';
import type { AdFetchFilters } from '../types/adUsers.types';
import { DEFAULT_FILTERS } from '../constants/adUsers.constants';

/**
 * Manages filter state for AD user queries
 * 
 * @returns {Object} Filter state and handlers
 * 
 * @example
 * const { filters, updateFilter, resetFilters, isFilterCollapsed, toggleCollapse } = useUserFilters();
 */
export const useUserFilters = () => {
    const [filters, setFilters] = useState<AdFetchFilters>(DEFAULT_FILTERS);
    const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

    const updateFilter = useCallback(<K extends keyof AdFetchFilters>(
        key: K,
        value: AdFetchFilters[K]
    ) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateFilters = useCallback((newFilters: Partial<AdFetchFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(DEFAULT_FILTERS);
    }, []);

    const toggleCollapse = useCallback(() => {
        setIsFilterCollapsed(prev => !prev);
    }, []);

    return {
        filters,
        updateFilter,
        updateFilters,
        resetFilters,
        isFilterCollapsed,
        toggleCollapse,
        setFilters,
    };
};
