import React from 'react';
import { Users, Activity, Calendar, TrendingUp } from 'lucide-react';
import { PowerBIUsageReport, PowerBIActivity } from '../powerbi.types';
import { PowerBIStatCard } from './PowerBIStatCard';

/**
 * Props for the PowerBIStats component
 */
interface PowerBIStatsProps {
    /** Usage data containing summary statistics */
    usageData: PowerBIUsageReport;
    /** Filtered data array for comparison */
    filteredData: PowerBIActivity[];
}

/**
 * PowerBI Statistics Cards Component
 * 
 * Displays key metrics and statistics in a grid of stat cards.
 * Shows unique users, total activities, date range, and data status.
 * 
 * Features:
 * - Responsive grid layout (1-4 columns)
 * - Color-coded stat cards
 * - Filtered data comparison
 * - Date range display
 * - Data status indicators
 * 
 * @param usageData - Usage data containing summary statistics
 * @param filteredData - Filtered data array for comparison
 * 
 * @example
 * ```tsx
 * <PowerBIStats 
 *   usageData={usageData} 
 *   filteredData={filteredData} 
 * />
 * ```
 */
export const PowerBIStats: React.FC<PowerBIStatsProps> = ({ usageData, filteredData }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <PowerBIStatCard
                title="Unique Users"
                value={usageData.summary?.uniqueUsers || 0}
                icon={Users}
                color="blue"
            />
            <PowerBIStatCard
                title="Total Activities"
                value={usageData.summary?.totalActivities || 0}
                icon={Activity}
                color="green"
            />
            <PowerBIStatCard
                title="Date Range"
                value={`${usageData.dateRange?.daysBack || 0} Days`}
                icon={Calendar}
                color="purple"
                subtitle={usageData.dateRange?.start ? new Date(usageData.dateRange.start).toLocaleDateString() : 'Last 90 Days'}
            />
            <PowerBIStatCard
                title="Data Status"
                value={(usageData.data?.length || 0) > 0 ? "Active" : "No Data"}
                icon={TrendingUp}
                color="orange"
                subtitle={filteredData.length !== (usageData.data?.length || 0) ? `Filtered: ${filteredData.length}` : undefined}
            />
        </div>
    );
};