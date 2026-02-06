/**
 * Confirmation Modal
 * Shows confirmation dialog before executing device actions
 */

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    action: string;
    deviceCount: number;
    systems: string[];
    targetOU?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    action,
    deviceCount,
    systems,
    targetOU
}) => {
    const [isConfirmed, setIsConfirmed] = useState(false);

    if (!isOpen) return null;

    const getActionText = () => {
        switch (action) {
            case 'disable': return 'disable';
            case 'delete': return 'permanently delete';
            case 'move': return 'move';
            default: return action;
        }
    };

    const getActionColor = () => {
        switch (action) {
            case 'disable': return 'orange';
            case 'delete': return 'red';
            case 'move': return 'blue';
            default: return 'gray';
        }
    };

    const getSystemNames = () => {
        const systemMap: { [key: string]: string } = {
            'entra': 'Microsoft Entra ID',
            'intune': 'Microsoft Intune',
            'ad': 'Active Directory'
        };
        return systems.map(s => systemMap[s] || s).join(', ');
    };

    const handleConfirm = () => {
        if (isConfirmed) {
            onConfirm();
            setIsConfirmed(false);
            onClose();
        }
    };

    const actionColor = getActionColor();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-5 h-5 text-${actionColor}-500`} />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Confirm Action
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
                    <div className="text-center">
                        <p className="text-slate-900 dark:text-white font-medium">
                            Are you sure you want to {getActionText()} <strong>{deviceCount}</strong> device{deviceCount !== 1 ? 's' : ''}?
                        </p>
                    </div>

                    {/* Action Details */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <div className="text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Action:</span>
                            <span className={`ml-2 text-${actionColor}-600 dark:text-${actionColor}-400 font-medium`}>
                                {getActionText().charAt(0).toUpperCase() + getActionText().slice(1)}
                            </span>
                        </div>
                        
                        <div className="text-sm">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Systems:</span>
                            <span className="ml-2 text-slate-600 dark:text-slate-300">
                                {getSystemNames()}
                            </span>
                        </div>

                        {targetOU && (
                            <div className="text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">Target OU:</span>
                                <div className="mt-1 font-mono text-xs bg-white dark:bg-slate-800 p-2 rounded border">
                                    {targetOU}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Warning for destructive actions */}
                    {action === 'delete' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-red-700 dark:text-red-300">
                                    <strong>Warning:</strong> This action cannot be undone. Devices will be permanently removed from the selected systems.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Confirmation Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isConfirmed}
                            onChange={(e) => setIsConfirmed(e.target.checked)}
                            className={`w-4 h-4 text-${actionColor}-600 rounded border-slate-300 dark:border-slate-500 mt-0.5`}
                        />
                        <div className="text-sm text-slate-700 dark:text-slate-300">
                            I understand the consequences and want to proceed with this action.
                        </div>
                    </label>
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
                        disabled={!isConfirmed}
                        className={`px-4 py-2 text-sm font-medium text-white bg-${actionColor}-600 hover:bg-${actionColor}-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors`}
                    >
                        {getActionText().charAt(0).toUpperCase() + getActionText().slice(1)} Devices
                    </button>
                </div>
            </div>
        </div>
    );
};