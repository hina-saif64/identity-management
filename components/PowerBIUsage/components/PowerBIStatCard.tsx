import React from 'react';
import { LucideIcon } from 'lucide-react';

/**
 * Props for the PowerBIStatCard component
 */
interface PowerBIStatCardProps {
    /** Card title/label */
    title: string;
    /** Main value to display */
    value: string | number;
    /** Lucide icon component */
    icon: LucideIcon;
    /** Color theme for the card */
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    /** Optional subtitle text */
    subtitle?: string;
}

/**
 * Color theme configurations for stat cards
 */
const colorClasses = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
    green: { bg: 'bg-green-100 dark:bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
    red: { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400' }
};

/**
 * PowerBI Statistics Card Component
 * 
 * Displays key metrics and statistics in a visually appealing card format.
 * Supports multiple color themes and optional subtitles for additional context.
 * 
 * Features:
 * - Responsive design with dark mode support
 * - Multiple color themes
 * - Icon integration with Lucide icons
 * - Optional subtitle for additional context
 * - Consistent typography and spacing
 * 
 * @param title - The card title/label
 * @param value - Main value to display (string or number)
 * @param icon - Lucide icon component to display
 * @param color - Color theme for the card
 * @param subtitle - Optional subtitle text
 * 
 * @example
 * ```tsx
 * <PowerBIStatCard
 *   title="Total Users"
 *   value={1234}
 *   icon={Users}
 *   color="blue"
 *   subtitle="Active this month"
 * />
 * ```
 */
export const PowerBIStatCard: React.FC<PowerBIStatCardProps> = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle
}) => {
    const classes = colorClasses[color];

    return (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className={`p-2 ${classes.bg} rounded-lg`}>
                    <Icon className={`w-5 h-5 ${classes.text}`} />
                </div>
                <div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{title}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                    {subtitle && (
                        <p className={`text-sm font-bold ${classes.text}`}>{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
};
