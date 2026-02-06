/**
 * System Selection Modal
 * Allows user to choose which systems (Entra/Intune/AD) to perform actions on
 */

import React, { useState } from 'react';
import { X, Cloud, Server, Database, AlertTriangle } from 'lucide-react';

interface SystemSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedSystems: string[]) => void;
    action: 'disable' | 'delete';
    deviceCount: number;
}

export const SystemSelectionModal: React.FC<SystemSelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    action,
    deviceCount
}) => {
    const [selectedSystems, setSelectedSystems] = useState<string[]>([]);

    if (!isOpen) return null;

    const handleSystemToggle = (system: string) => {
        setSelectedSystems(prev => 
            prev.includes(system) 
                ? prev.filter(s => s !== system)
                : [...prev, system]
        );
    };

    const handleConfirm = () => {
        if (selectedSystems.length > 0) {
            onConfirm(selectedSystems);
            setSelectedSystems([]);
            onClose();
        }
    };

    const actionText = action === 'disable' ? 'disable' : 'delete';
    const actionColor = action === 'disable' ? 'orange' : 'red';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-5 h-5 text-${actionColor}-500`} />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {action === 'disable' ? 'Disable' : 'Delete'} Devices
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Select which systems to {actionText} <strong>{deviceCount}</strong> device{deviceCount !== 1 ? 's' : ''} from:
                    </p>

                    {/* System Checkboxes */}
                    <div className="space-y-3">
                        {/* Entra ID */}
                        <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedSystems.includes('entra')}
                                onChange={() => handleSystemToggle('entra')}
                                className="w-4 h-4 text-cyan-600 rounded border-slate-300 dark:border-slate-500"
                            />
                            <Cloud className="w-5 h-5 text-cyan-600" />
                            <div>
                                <div className="font-medium text-slate-900 dark:text-white">Microsoft Entra ID</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Cloud identity platform</div>
                            </div>
                        </label>

                        {/* Intune */}
                        <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedSystems.includes('intune')}
                                onChange={() => handleSystemToggle('intune')}
                                className="w-4 h-4 text-green-600 rounded border-slate-300 dark:border-slate-500"
                            />
                            <Server className="w-5 h-5 text-green-600" />
                            <div>
                                <div className="font-medium text-slate-900 dark:text-white">Microsoft Intune</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Device management platform</div>
                            </div>
                        </label>

                        {/* Active Directory */}
                        <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedSystems.includes('ad')}
                                onChange={() => handleSystemToggle('ad')}
                                className="w-4 h-4 text-orange-600 rounded border-slate-300 dark:border-slate-500"
                            />
                            <Database className="w-5 h-5 text-orange-600" />
                            <div>
                                <div className="font-medium text-slate-900 dark:text-white">Active Directory</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">On-premises directory</div>
                            </div>
                        </label>
                    </div>

                    {/* Warning */}
                    {action === 'delete' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-red-700 dark:text-red-300">
                                    <strong>Warning:</strong> This action cannot be undone. Devices will be permanently removed from selected systems.
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedSystems.length === 0}
                        className={`px-4 py-2 text-sm font-medium text-white bg-${actionColor}-600 hover:bg-${actionColor}-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors`}
                    >
                        {action === 'disable' ? 'Disable' : 'Delete'} from {selectedSystems.length} system{selectedSystems.length !== 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};