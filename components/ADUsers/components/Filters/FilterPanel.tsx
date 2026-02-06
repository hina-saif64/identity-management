// Filter Panel Component
// Label: AD-FILTER-PANEL

import React from 'react';
import { Zap, ChevronDown, RefreshCw, Loader2, Download } from 'lucide-react';
import { DevLabel } from '../DevLabel';
import type { FilterPanelProps } from '../../types/adUsers.types';

/**
 * @module ADUsers/FilterPanel
 * @label AD-FILTER-PANEL
 * @description Main filter panel for AD user search
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
    filters,
    onFilterChange,
    onExecute,
    isFetching,
    onExport,
    isFilterCollapsed,
    onToggleCollapse,
    domainInfo,
}) => {
    return (
        <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">
            <DevLabel label="AD-FILTER-PANEL" />

            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-transparent">
                <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-blue-600 dark:text-blue-500" />
                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">
                        Advanced Filters
                    </span>
                </div>
                <button
                    onClick={onToggleCollapse}
                    className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all hover:scale-110 active:scale-95"
                >
                    <ChevronDown
                        className={`w-3 h-3 text-slate-500 transition-transform ${isFilterCollapsed ? 'rotate-180' : ''
                            }`}
                    />
                </button>
            </div>

            {/* Filter Content */}
            {!isFilterCollapsed && (
                <div className="p-2 bg-white dark:bg-transparent">
                    {/* Single Row: All Filters */}
                    <div className="grid grid-cols-12 gap-2">
                        {/* Search Filter - Taller */}
                        <div className="relative col-span-3">
                            <DevLabel label="AD-FILTER-SEARCH" position="top-right" />
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 block">
                                Quick Search
                            </label>
                            <textarea
                                placeholder="Name, SAM, UPN..."
                                value={filters.searchString}
                                onChange={(e) => onFilterChange({ ...filters, searchString: e.target.value })}
                                className="w-full h-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none font-medium"
                            />
                        </div>

                        {/* Status Filter - Match Domain Height */}
                        <div className="relative col-span-3">
                            <DevLabel label="AD-FILTER-STATUS" position="top-right" />
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 block">
                                Status
                            </label>
                            <div className="flex gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1.5 items-center h-16">
                                <label className="flex items-center gap-0.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.status === 'All' || filters.status === 'Enabled'}
                                        onChange={() => { }}
                                        className="w-2.5 h-2.5 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <span className="text-[8px] text-green-700 dark:text-green-400 font-bold uppercase">
                                        Active
                                    </span>
                                </label>
                                <label className="flex items-center gap-0.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={filters.status === 'All' || filters.status === 'Disabled'}
                                        onChange={() => { }}
                                        className="w-2.5 h-2.5 text-red-600 rounded focus:ring-red-500"
                                    />
                                    <span className="text-[8px] text-red-700 dark:text-red-400 font-bold uppercase">
                                        Disabled
                                    </span>
                                </label>
                                <div className="flex items-center gap-0.5 ml-1">
                                    <span className="text-[7px] font-black text-slate-500 uppercase">Stalled:</span>
                                    <input
                                        type="number"
                                        value={filters.stalledDays || ''}
                                        onChange={(e) =>
                                            onFilterChange({ ...filters, stalledDays: parseInt(e.target.value) || 0 })
                                        }
                                        className="w-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 text-[8px] text-slate-900 dark:text-white"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Domain Filter - Same Height */}
                        <div className="relative col-span-3">
                            <DevLabel label="AD-FILTER-DOMAIN" position="top-right" />
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5 block">
                                Domain
                            </label>
                            <select
                                value={filters.upnSuffix || ''}
                                onChange={(e) => onFilterChange({ ...filters, upnSuffix: e.target.value })}
                                className="w-full h-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-900 dark:text-white outline-none cursor-pointer hover:border-blue-400 transition-colors"
                            >
                                <option value="">All Domains</option>
                                {domainInfo.upns.map((upn) => (
                                    <option key={upn} value={upn}>
                                        {upn}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Execute Button - Shifted Right, 20% Smaller */}
                        <div className="relative col-span-2 flex items-end justify-end">
                            <DevLabel label="AD-FILTER-BUTTON" position="top-left" />
                            <button
                                onClick={onExecute}
                                disabled={isFetching}
                                className="w-4/5 h-16 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isFetching ? (
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-2.5 h-2.5" />
                                )}
                                Scan
                            </button>
                        </div>

                        {/* Export Button */}
                        <div className="relative col-span-1 flex items-end justify-end">
                            <button
                                onClick={() => onExport('csv')}
                                className="h-16 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                title="Export to CSV"
                            >
                                <Download className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

