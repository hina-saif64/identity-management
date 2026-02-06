import React from 'react';
import { Users, Activity, Calendar, TrendingUp, BarChart, Database, Clock } from 'lucide-react';
import { PowerBIUsageReport, PowerBIActivity } from '../powerbi.types';

/**
 * Props for the PowerBIMetrics component
 */
interface PowerBIMetricsProps {
    /** Usage data containing summary statistics */
    usageData: PowerBIUsageReport | null;
    /** Filtered data array for comparison */
    filteredData: PowerBIActivity[];
    /** Search term to show filtered state */
    searchTerm: string;
    /** Current operation filter */
    operationFilter: string;
    /** Function to clear all filters */
    onClearFilters: () => void;
}

/**
 * PowerBI Interactive Metrics Component
 * 
 * Displays key metrics in interactive tiles matching Cloud Reporting design.
 * Features clickable tiles for filtering and enhanced visual hierarchy.
 * 
 * Features:
 * - Interactive metric tiles (2x4 grid)
 * - Click-to-filter functionality
 * - Visual indicators for active filters
 * - Professional design matching Cloud Reporting
 * - Responsive layout
 * 
 * @param usageData - Usage data containing summary statistics
 * @param filteredData - Filtered data array for comparison
 * @param searchTerm - Current search term
 * @param operationFilter - Current operation filter
 * @param setOperationFilter - Function to set operation filter
 * @param onClearFilters - Function to clear all filters
 * 
 * @example
 * ```tsx
 * <PowerBIMetrics 
 *   usageData={usageData} 
 *   filteredData={filteredData}
 *   searchTerm={searchTerm}
 *   operationFilter={operationFilter}
 *   onClearFilters={clearFilters}
 * />
 * ```
 */
export const PowerBIMetrics: React.FC<PowerBIMetricsProps> = ({
    usageData,
    filteredData,
    searchTerm,
    operationFilter,
    setOperationFilter,
    onClearFilters
}) => {
    const hasFilters = searchTerm || operationFilter !== 'All';
    const isFiltered = filteredData.length !== (usageData?.data?.length || 0);

    // Calculate unique operations for metrics
    const uniqueOperations = [...new Set(usageData?.data?.map(item => item.operations) || [])];
    const viewOperations = usageData?.data?.filter(item =>
        item.operations?.toLowerCase().includes('view') ||
        item.operations?.toLowerCase().includes('report')
    ).length || 0;

    // Show metrics even without data (like Cloud Reporting)
    const totalUsers = usageData?.summary?.uniqueUsers || 0;
    const totalActivities = usageData?.summary?.totalActivities || 0;
    const daysBack = usageData?.dateRange?.daysBack || 7;
    const dateStart = usageData?.dateRange?.start ? new Date(usageData.dateRange.start).toLocaleDateString() : 'Ready';

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 print:hidden">
            {/* Total Users */}
            <div className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl relative group shadow-sm">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-blue-500" /> Total Users
                </p>
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {totalUsers}
                </h4>
                {isFiltered && (
                    <p className="text-[8px] text-blue-600 dark:text-blue-400 mt-1">
                        Filtered: {[...new Set(filteredData.map(item => item.userIds))].length}
                    </p>
                )}
            </div>

            {/* Total Activities - Click to Reset */}
            <div
                onClick={onClearFilters}
                className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl relative group shadow-sm transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-[1.02] hover:border-green-500/30"
            >
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-green-500" /> Activities
                </p>
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {totalActivities}
                </h4>
                {isFiltered && (
                    <p className="text-[8px] text-green-600 dark:text-green-400 mt-1">
                        Filtered: {filteredData.length}
                    </p>
                )}
            </div>

            {/* Date Range */}
            <div className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl relative group shadow-sm">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-purple-500" /> Time Range
                </p>
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {daysBack}d
                </h4>
                <p className="text-[8px] text-purple-600 dark:text-purple-400 mt-1">
                    {dateStart}
                </p>
            </div>

            {/* Operations - Click to Reset/Show All */}
            <div
                onClick={onClearFilters}
                className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl relative group shadow-sm transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-[1.02] hover:border-indigo-500/30"
            >
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-indigo-500" /> Operations
                </p>
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {uniqueOperations.length}
                </h4>
                <p className="text-[8px] text-indigo-600 dark:text-indigo-400 mt-1">
                    Types
                </p>
            </div>

            {/* View Activities - Click to Filter */}
            <div
                onClick={() => setOperationFilter('ViewReport')}
                className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl relative group shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-[1.02] hover:border-orange-500/30 transition-all"
            >
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <BarChart className="w-3 h-3 text-orange-500" /> Views
                </p>
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {viewOperations}
                </h4>
                <p className="text-[8px] text-orange-600 dark:text-orange-400 mt-1">
                    Dashboard/Report
                </p>
            </div>

            {/* Data Status */}
            <div className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl relative group shadow-sm">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-emerald-500" /> Status
                </p>
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {(usageData?.data?.length || 0) > 0 ? "Active" : "Ready"}
                </h4>
                <p className="text-[8px] text-emerald-600 dark:text-emerald-400 mt-1">
                    {usageData?.data?.length || 0} Records
                </p>
            </div>

            {/* Clear Filters */}
            {hasFilters && (
                <button
                    onClick={onClearFilters}
                    className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl relative group shadow-sm hover:bg-red-500/20 transition-all"
                >
                    <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Clear Filters
                    </p>
                    <h4 className="text-xl font-black text-red-600 leading-tight">
                        Reset
                    </h4>
                    <p className="text-[8px] text-red-600 mt-1">
                        Show All
                    </p>
                </button>
            )}
        </div>
    );
};