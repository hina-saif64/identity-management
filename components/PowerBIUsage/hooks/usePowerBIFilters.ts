import { useState, useMemo } from 'react';
import { PowerBIActivity } from '../powerbi.types';

/**
 * Custom hook for filtering and searching PowerBI usage data
 * 
 * Provides client-side filtering capabilities for PowerBI activity data:
 * - Text search across user IDs, IP addresses, and item names
 * - Operation type filtering
 * - Date range filtering support
 * - Automatic extraction of unique operation types
 * 
 * @param data - Array of PowerBI activity records to filter
 * @returns Object containing filter state, filtered data, and clear function
 * 
 * @example
 * ```tsx
 * const {
 *   searchTerm,
 *   setSearchTerm,
 *   filteredData,
 *   uniqueOperations
 * } = usePowerBIFilters(usageData?.data || []);
 * ```
 */
export const usePowerBIFilters = (data: PowerBIActivity[] = []) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [daysBack, setDaysBack] = useState(7);
    const [operationFilter, setOperationFilter] = useState('All');

    /**
     * Filtered data based on current search and filter criteria
     * 
     * Applies text search and operation filtering to the input data.
     * Search matches against user IDs, client IPs, and item names.
     */
    const filteredData = useMemo(() => {
        return data.filter(item => {
            const matchesSearch =
                String(item.userIds || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(item.clientIP || '').includes(searchTerm) ||
                (item.itemName && String(item.itemName).toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesOperation = operationFilter === 'All' || item.operations === operationFilter;

            // Date filtering is handled by backend fetch mostly, but we can double check here or add more granular frontend filtering if needed
            return matchesSearch && matchesOperation;
        });
    }, [data, searchTerm, operationFilter]);

    /**
     * Unique operation types extracted from the data
     * 
     * Automatically generates a sorted list of all unique operation
     * types found in the data for use in filter dropdowns.
     */
    const uniqueOperations = useMemo(() => {
        return Array.from(new Set(data.map(item => item.operations))).sort();
    }, [data]);

    /**
     * Clear all filters and reset to default state
     */
    const clearFilters = () => {
        setSearchTerm('');
        setOperationFilter('All');
    };

    return {
        searchTerm,
        setSearchTerm,
        daysBack,
        setDaysBack,
        operationFilter,
        setOperationFilter,
        filteredData,
        uniqueOperations,
        clearFilters
    };
};
