import React from 'react';
import { BarChart3, Database } from 'lucide-react';

/**
 * Props for the PowerBIEmptyState component
 */
interface PowerBIEmptyStateProps {
    /** Type of empty state to display */
    type: 'offline' | 'no-data';
}

/**
 * PowerBI Empty State Component
 * 
 * Displays appropriate empty states for different scenarios:
 * - Offline: When not connected to cloud services
 * - No Data: When no usage data is found
 * 
 * Features:
 * - Different icons and messages for each state
 * - Consistent styling with dashed borders
 * - Centered layout with proper spacing
 * - Dark mode support
 * 
 * @param type - Type of empty state ('offline' | 'no-data')
 * 
 * @example
 * ```tsx
 * <PowerBIEmptyState type="offline" />
 * <PowerBIEmptyState type="no-data" />
 * ```
 */
export const PowerBIEmptyState: React.FC<PowerBIEmptyStateProps> = ({ type }) => {
    const config = {
        offline: {
            icon: BarChart3,
            title: 'PowerBI Analytics Offline',
            message: 'Connect to cloud services to access PowerBI usage analytics.'
        },
        'no-data': {
            icon: Database,
            title: 'No Usage Data Found',
            message: 'No PowerBI activity detected in the selected time range.'
        }
    };

    const { icon: Icon, title, message } = config[type];

    return (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-100 dark:bg-slate-900/20 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-[3rem] text-center">
            <Icon className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-6" />
            <h3 className="text-xl font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</h3>
            <p className="text-slate-500 mt-2 text-sm max-w-sm">{message}</p>
        </div>
    );
};