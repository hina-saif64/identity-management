/**
 * Results Modal
 * Shows success/failure results after device actions
 */

import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Monitor } from 'lucide-react';

interface ActionResult {
    deviceName: string;
    systems: {
        entra?: { success: boolean; error?: string };
        intune?: { success: boolean; error?: string };
        ad?: { success: boolean; error?: string };
    };
}

interface ResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    action: string;
    results: ActionResult[];
    totalDevices: number;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
    isOpen,
    onClose,
    action,
    results,
    totalDevices
}) => {
    if (!isOpen) return null;

    const getSystemIcon = (system: string) => {
        switch (system) {
            case 'entra': return '☁️';
            case 'intune': return '📱';
            case 'ad': return '🏢';
            default: return '❓';
        }
    };

    const getSystemName = (system: string) => {
        switch (system) {
            case 'entra': return 'Entra ID';
            case 'intune': return 'Intune';
            case 'ad': return 'Active Directory';
            default: return system;
        }
    };

    const successCount = results.filter(r => 
        Object.values(r.systems).every(s => s?.success !== false)
    ).length;
    
    const partialCount = results.filter(r => 
        Object.values(r.systems).some(s => s?.success === true) &&
        Object.values(r.systems).some(s => s?.success === false)
    ).length;
    
    const failureCount = results.filter(r => 
        Object.values(r.systems).every(s => s?.success === false)
    ).length;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Action Results
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Summary */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalDevices}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Total Devices</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{successCount}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Fully Successful</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{partialCount}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Partially Successful</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{failureCount}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Failed</div>
                        </div>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3">
                        {results.map((result, index) => {
                            const systemResults = Object.entries(result.systems);
                            const allSuccess = systemResults.every(([_, r]) => r?.success !== false);
                            const allFailed = systemResults.every(([_, r]) => r?.success === false);
                            
                            return (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg border ${
                                        allSuccess 
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                            : allFailed
                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            {allSuccess ? (
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            ) : allFailed ? (
                                                <XCircle className="w-5 h-5 text-red-600" />
                                            ) : (
                                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                            )}
                                            <span className="font-medium text-slate-900 dark:text-white">
                                                {result.deviceName}
                                            </span>
                                        </div>
                                        
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            {allSuccess ? 'Success' : allFailed ? 'Failed' : 'Partial'}
                                        </div>
                                    </div>

                                    {/* System Results */}
                                    <div className="mt-2 space-y-1">
                                        {systemResults.map(([system, systemResult]) => (
                                            <div key={system} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span>{getSystemIcon(system)}</span>
                                                    <span className="text-slate-700 dark:text-slate-300">
                                                        {getSystemName(system)}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center gap-2">
                                                    {systemResult?.success ? (
                                                        <div className="flex items-center gap-1 text-green-600">
                                                            <CheckCircle className="w-3 h-3" />
                                                            <span className="text-xs">Success</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-red-600">
                                                            <XCircle className="w-3 h-3" />
                                                            <span className="text-xs">Failed</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Error Messages */}
                                    {systemResults.some(([_, r]) => r?.error) && (
                                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                                            {systemResults.map(([system, systemResult]) => 
                                                systemResult?.error && (
                                                    <div key={system} className="text-xs text-red-600 dark:text-red-400">
                                                        <strong>{getSystemName(system)}:</strong> {systemResult.error}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};