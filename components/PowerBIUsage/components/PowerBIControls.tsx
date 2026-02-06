import React, { useState } from 'react';
import { Search, Calendar, Download, RefreshCw, Loader2, Filter, ChevronDown, FileSpreadsheet, FileJson, FileText as FilePdf } from 'lucide-react';
import { PowerBIUsageReport } from '../powerbi.types';

/**
 * Props for the PowerBIControls component
 */
interface PowerBIControlsProps {
    /** Current search term */
    searchTerm: string;
    /** Search term setter */
    setSearchTerm: (term: string) => void;
    /** Number of days to look back */
    daysBack: number;
    /** Days back setter */
    setDaysBack: (days: number) => void;
    /** Current operation filter */
    operationFilter: string;
    /** Operation filter setter */
    setOperationFilter: (filter: string) => void;
    /** Available operations for filtering */
    uniqueOperations: string[];
    /** Current usage data for export */
    usageData: PowerBIUsageReport | null;
    /** Loading state */
    isLoading: boolean;
    /** Export handler */
    onExport: (format: 'csv' | 'xlsx' | 'json') => void;
}

/**
 * Enhanced PowerBI Controls Component
 * 
 * Provides search, filtering, and action controls matching Cloud Reporting design.
 * Features professional search bar, advanced filtering, and export dropdown.
 * 
 * Features:
 * - Professional search bar design
 * - Advanced filtering with operation types
 * - Export dropdown (CSV, Excel, PDF)
 * - Responsive layout matching Cloud Reporting
 * - Enhanced visual hierarchy
 * 
 * @param searchTerm - Current search term
 * @param setSearchTerm - Function to update search term
 * @param daysBack - Number of days to look back
 * @param setDaysBack - Function to update days back
 * @param operationFilter - Current operation filter
 * @param setOperationFilter - Function to update operation filter
 * @param uniqueOperations - Available operations for filtering
 * @param usageData - Current usage data for export
 * @param isLoading - Loading state for export button
 * @param onExport - Handler for export button click
 * 
 * @example
 * ```tsx
 * <PowerBIControls
 *   searchTerm={searchTerm}
 *   setSearchTerm={setSearchTerm}
 *   daysBack={daysBack}
 *   setDaysBack={setDaysBack}
 *   operationFilter={operationFilter}
 *   setOperationFilter={setOperationFilter}
 *   uniqueOperations={uniqueOperations}
 *   usageData={usageData}
 *   isLoading={isLoading}
 *   onFetch={handleFetch}
 *   onExport={exportData}
 * />
 * ```
 */
export const PowerBIControls: React.FC<PowerBIControlsProps> = ({
    searchTerm,
    setSearchTerm,
    daysBack,
    setDaysBack,
    operationFilter,
    setOperationFilter,
    uniqueOperations,
    usageData,
    isLoading,
    onExport
}) => {
    const [showExportDropdown, setShowExportDropdown] = useState(false);

    const exportReport = (format: 'csv' | 'xlsx' | 'pdf') => {
        if (format === 'pdf') {
            window.print();
            return;
        }
        
        onExport(format);
        setShowExportDropdown(false);
    };

    return (
        <div className="flex flex-col lg:flex-row items-center gap-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm print:hidden">
            <div className="flex items-center gap-3 flex-1 px-3 w-full border border-transparent focus-within:border-purple-500/50 focus-within:bg-purple-500/[0.02] rounded-xl transition-all">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by User ID, Operation, or IP Address..."
                    className="bg-transparent border-none outline-none text-xs w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-400 py-1.5"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <select
                        value={daysBack}
                        onChange={(e) => setDaysBack(parseInt(e.target.value))}
                        className="bg-transparent border-none outline-none text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest cursor-pointer w-full lg:w-20"
                    >
                        <option value={7}>7 Days</option>
                        <option value={30}>30 Days</option>
                        <option value={60}>60 Days</option>
                        <option value={90}>90 Days</option>
                        <option value={180}>180 Days</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                        value={operationFilter}
                        onChange={(e) => setOperationFilter(e.target.value)}
                        className="bg-transparent border-none outline-none text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest cursor-pointer w-full lg:w-32"
                    >
                        <option value="All">All Operations</option>
                        {uniqueOperations.map(op => (
                            <option key={op} value={op}>{op}</option>
                        ))}
                    </select>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowExportDropdown(!showExportDropdown)}
                        disabled={!usageData?.data || usageData.data.length === 0}
                        className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-purple-600 rounded-xl shadow-sm transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" /> Export Data
                    </button>
                    {showExportDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[60] p-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <button onClick={() => exportReport('csv')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                                <FileJson className="w-4 h-4 text-blue-500" /> CSV Format
                            </button>
                            <button onClick={() => exportReport('xlsx')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                                <FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel (.xlsx)
                            </button>
                            <button onClick={() => exportReport('pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                                <FilePdf className="w-4 h-4 text-red-500" /> PDF Report
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};