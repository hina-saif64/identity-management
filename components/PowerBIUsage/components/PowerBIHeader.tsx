import React, { useState } from 'react';
import { BarChart3, CheckCircle2, ShieldAlert, Cpu, Download, RefreshCw, Loader2, ChevronDown, FileSpreadsheet, FileJson, FileText as FilePdf } from 'lucide-react';
import { PowerBIConnectionState } from '../powerbi.types';
import { CloudConnectionState } from '../../../types';

/**
 * Props for the PowerBIHeader component
 */
interface PowerBIHeaderProps {
    /** Current Exchange Online connection state */
    connectionState: PowerBIConnectionState;
    /** Cloud connection state for enhanced status display */
    cloudConnection?: CloudConnectionState;
    /** Loading state for sync button */
    isLoading?: boolean;
    /** Fetch handler for sync button */
    onFetch?: () => void;
    /** Export handler */
    onExport?: (format: 'csv' | 'xlsx' | 'json') => void;
    /** Usage data for export availability */
    hasData?: boolean;
    /** Sync progress information */
    syncProgress?: {
        current: number;
        total: number;
        message: string;
    };
}

/**
 * PowerBI Usage Header Component
 * 
 * Displays the main header for PowerBI Usage Analytics with connection status and action buttons.
 * Enhanced to match Cloud Reporting's professional design with Export and Sync buttons.
 * 
 * Features:
 * - Professional header design matching Cloud Reporting
 * - Connection status indicators
 * - Export Report dropdown (CSV, Excel, PDF)
 * - Sync Data button
 * - Responsive layout
 * - Dark mode support
 * - Enhanced visual hierarchy
 * 
 * @param connectionState - Current connection state to display status
 * @param cloudConnection - Cloud connection state for enhanced display
 * @param isLoading - Loading state for sync button
 * @param onFetch - Handler for sync button click
 * @param onExport - Handler for export button click
 * @param hasData - Whether data is available for export
 * 
 * @example
 * ```tsx
 * <PowerBIHeader 
 *   connectionState={connectionState} 
 *   cloudConnection={cloudConnection}
 *   isLoading={isLoading}
 *   onFetch={handleFetch}
 *   onExport={exportData}
 *   hasData={!!usageData}
 * />
 * ```
 */
export const PowerBIHeader: React.FC<PowerBIHeaderProps> = ({ 
    connectionState, 
    cloudConnection, 
    isLoading = false,
    onFetch,
    onExport,
    hasData = false,
    syncProgress
}) => {
    const [showExportDropdown, setShowExportDropdown] = useState(false);

    const exportReport = (format: 'csv' | 'xlsx' | 'pdf') => {
        if (format === 'pdf') {
            window.print();
            return;
        }
        
        if (onExport) {
            onExport(format);
        }
        setShowExportDropdown(false);
    };

    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border transition-all ${cloudConnection?.isConnected ? 'bg-purple-600/10 border-purple-500/30' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                    <BarChart3 className={`w-6 h-6 ${cloudConnection?.isConnected ? 'text-purple-600 dark:text-purple-400 animate-pulse' : 'text-slate-400 dark:text-slate-600'}`} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">PowerBI Usage Analytics</h2>
                    <div className="flex items-center gap-2 mt-1">
                        {cloudConnection?.isConnected ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-500 rounded text-[9px] font-bold uppercase tracking-widest border border-green-500/20">
                                <Cpu className="w-2.5 h-2.5" /> Graph API Active
                            </div>
                        ) : connectionState.connected ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-500 rounded text-[9px] font-bold uppercase tracking-widest border border-blue-500/20">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Exchange Connected
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-500 rounded text-[9px] font-bold uppercase tracking-widest border border-red-500/20">
                                <ShieldAlert className="w-2.5 h-2.5" /> Bridge Offline
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {!cloudConnection?.isConnected ? (
                    <div className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest">
                        <ShieldAlert className="w-3.5 h-3.5" /> Not Connected - Use Universal Auth
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowExportDropdown(!showExportDropdown)}
                                disabled={!hasData}
                                className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-purple-600 rounded-xl shadow-sm transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5" /> Export Report
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
                        <div className="relative">
                            <button 
                                onClick={onFetch} 
                                disabled={isLoading} 
                                className={`px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center gap-2 shadow-xl shadow-purple-600/20 text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50 min-w-[120px]`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        {syncProgress ? `${syncProgress.current}/${syncProgress.total}` : 'Syncing...'}
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        Sync Data
                                    </>
                                )}
                            </button>
                            
                            {/* Progress Bar */}
                            {syncProgress && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-lg z-50 min-w-[250px]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            {syncProgress.message}
                                        </span>
                                        <span className="text-xs font-bold text-purple-600">
                                            {syncProgress.current}/{syncProgress.total}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                        <div 
                                            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Progress Bar */}
                        {syncProgress && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        {syncProgress.message}
                                    </span>
                                    <span className="text-xs font-bold text-purple-600">
                                        {syncProgress.current}/{syncProgress.total}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                    <div 
                                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};