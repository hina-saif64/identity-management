// Performance Metrics Component
// Label: AD-METRICS

import React from 'react';
import { Timer, Database, ShieldAlert } from 'lucide-react';
import { DevLabel } from './DevLabel';
import type { PerformanceMetricsProps } from '../types/adUsers.types';

/**
 * @module ADUsers/PerformanceMetrics
 * @label AD-METRICS
 * @description Displays performance metrics for AD user queries
 */
export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics }) => {
    if (!metrics) return null;

    return (
        <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-1 shadow-sm hover:shadow-md transition-shadow">
            <DevLabel label="AD-METRICS" />

            <div className="flex items-center gap-2">
                {/* Response Time */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/70 dark:bg-slate-900/70 rounded backdrop-blur-sm">
                    <Timer className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Time</span>
                        <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300">
                            {metrics.duration.toFixed(0)}ms
                        </span>
                    </div>
                </div>

                {/* Object Count */}
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/70 dark:bg-slate-900/70 rounded backdrop-blur-sm">
                    <Database className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                    <div className="flex flex-col">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider">Objects</span>
                        <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
                            {metrics.count.toLocaleString()}
                            {metrics.totalAvailable && metrics.totalAvailable > metrics.count && (
                                <span className="text-[7px] text-slate-500"> / {metrics.totalAvailable.toLocaleString()}</span>
                            )}
                        </span>
                    </div>
                </div>

                {/* Limited Results Warning */}
                {metrics.isLimited && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded">
                        <ShieldAlert className="w-2.5 h-2.5 text-orange-600 dark:text-orange-400" />
                        <span className="text-[7px] font-black text-orange-700 dark:text-orange-300 uppercase">
                            Limited to 1000
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
