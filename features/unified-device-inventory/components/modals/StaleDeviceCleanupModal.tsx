import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, CheckSquare, Shield, Server, Filter, Calendar, AlertOctagon, Trash2, Ban, ChevronRight, Check } from 'lucide-react';
import { Device } from '../../device.types';

interface StaleDeviceCleanupModalProps {
    isOpen: boolean;
    onClose: () => void;
    devices: Device[]; // Full device list to filter locally
    onConfirm: (selectedDevices: Device[], action: 'disable' | 'delete') => Promise<void>;
}

type Step = 'configure' | 'review' | 'execute';

export const StaleDeviceCleanupModal: React.FC<StaleDeviceCleanupModalProps> = ({
    isOpen,
    onClose,
    devices,
    onConfirm
}) => {
    // Wizard State
    const [currentStep, setCurrentStep] = useState<Step>('configure');
    const [isProcessing, setIsProcessing] = useState(false);

    // Step 1: Configuration
    const [daysInactive, setDaysInactive] = useState(90);
    const [excludeServers, setExcludeServers] = useState(true);
    const [excludeVIPs, setExcludeVIPs] = useState(true); // Placeholder for future VIP logic

    // Step 2: Selection
    const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
    const [selectedAction, setSelectedAction] = useState<'disable' | 'delete'>('disable');
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    // Filter Logic
    const staleCandidates = useMemo(() => {
        if (!isOpen) return [];

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

        return devices.filter(d => {
            // 1. Must be Stale (based on Last Seen or HealthStatus)
            // We use the stricter of the two: calculated 'daysInactive' check
            const lastSeenDate = d.lastSeen ? new Date(d.lastSeen) : null;
            const isStaleByDate = lastSeenDate ? lastSeenDate < cutoffDate : false;

            // Also include explicitly marked "Stale" devices from backend logic if they match criteria
            if (!isStaleByDate && d.healthStatus !== 'Stale') return false;

            // 2. Exclude Servers
            if (excludeServers && d.osCategory === 'Windows Server') return false;

            // 3. Exclude VIPs (Placeholder logic: look for "VIP" in name)
            if (excludeVIPs && d.displayName.toLowerCase().includes('vip')) return false;

            return true;
        });
    }, [isOpen, devices, daysInactive, excludeServers, excludeVIPs]);

    // Update selection when candidates change
    useEffect(() => {
        if (currentStep === 'configure') {
            // Auto-select all by default when moving to review
            setSelectedDeviceIds(new Set(staleCandidates.map(d => d.displayName)));
        }
    }, [staleCandidates, currentStep]);

    const handleNext = () => {
        if (currentStep === 'configure') setCurrentStep('review');
        else if (currentStep === 'review') handleExecute();
    };

    const handleExecute = async () => {
        if (selectedAction === 'delete' && deleteConfirmText !== 'DELETE') return;

        setIsProcessing(true);
        const selectedDevices = staleCandidates.filter(d => selectedDeviceIds.has(d.displayName));

        try {
            await onConfirm(selectedDevices, selectedAction);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedDeviceIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedDeviceIds(newSet);
    };

    const toggleAll = () => {
        if (selectedDeviceIds.size === staleCandidates.length) {
            setSelectedDeviceIds(new Set());
        } else {
            setSelectedDeviceIds(new Set(staleCandidates.map(d => d.displayName)));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-6 h-6 text-indigo-500" />
                            Smart Stale Cleanup
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Safely identify and remediate inactive devices
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Wizard Steps Indicator */}
                <div className="px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center gap-4">
                    <div className={`flex items-center gap-2 ${currentStep === 'configure' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === 'configure' ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}>1</div>
                        Configure
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep === 'review' ? 'bg-indigo-100 dark:bg-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800'}`}>2</div>
                        Review & Action
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {currentStep === 'configure' && (
                        <div className="space-y-8 max-w-2xl mx-auto">
                            {/* Days Threshold */}
                            <div className="space-y-4">
                                <label className="flex items-center justify-between">
                                    <span className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-slate-400" />
                                        Inactivity Threshold
                                    </span>
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{daysInactive} Days</span>
                                </label>
                                <input
                                    type="range"
                                    min="30"
                                    max="365"
                                    step="30"
                                    value={daysInactive}
                                    onChange={(e) => setDaysInactive(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>30 days</span>
                                    <span>90 days</span>
                                    <span>180 days</span>
                                    <span>365 days</span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                    Devices not seen in <strong>AD, Entra ID, or Intune</strong> for over {daysInactive} days will be flagged.
                                </p>
                            </div>

                            {/* Exclusions */}
                            <div className="space-y-4">
                                <h3 className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-slate-400" />
                                    Safety & Exclusions
                                </h3>

                                <div className="grid gap-4">
                                    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${excludeServers ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${excludeServers ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-400'}`}>
                                            {excludeServers && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <input type="checkbox" checked={excludeServers} onChange={(e) => setExcludeServers(e.target.checked)} className="hidden" />
                                        <div>
                                            <span className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                <Server className="w-4 h-4" />
                                                Exclude Servers
                                            </span>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Automatically skip any device with OS Category "Windows Server". Highly recommended.
                                            </p>
                                        </div>
                                    </label>

                                    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${excludeVIPs ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${excludeVIPs ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-400'}`}>
                                            {excludeVIPs && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <input type="checkbox" checked={excludeVIPs} onChange={(e) => setExcludeVIPs(e.target.checked)} className="hidden" />
                                        <div>
                                            <span className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                <Shield className="w-4 h-4" />
                                                Exclude VIP Devices
                                            </span>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Skip devices tagged as "VIP" or belonging to Executive groups.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 'review' && (
                        <div className="space-y-6 h-full flex flex-col">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4 shrink-0">
                                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30">
                                    <div className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">Stale Candidates</div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{staleCandidates.length}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">Selected</div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{selectedDeviceIds.size}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <div className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Threshold</div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{daysInactive}d</div>
                                </div>
                            </div>

                            {/* Action Selector */}
                            <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                                <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedAction === 'disable' ? 'bg-white dark:bg-slate-700 border-orange-500 shadow-sm' : 'border-transparent hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                                    <input type="radio" name="action" value="disable" checked={selectedAction === 'disable'} onChange={() => setSelectedAction('disable')} className="w-4 h-4 accent-orange-500" />
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Ban className="w-4 h-4 text-orange-500" />
                                            Disable Devices
                                        </div>
                                        <div className="text-xs text-slate-500">Recommended. Reversible via 'Active' view.</div>
                                    </div>
                                </label>
                                <label className={`flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedAction === 'delete' ? 'bg-red-50 dark:bg-red-900/10 border-red-500 shadow-sm' : 'border-transparent hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                                    <input type="radio" name="action" value="delete" checked={selectedAction === 'delete'} onChange={() => setSelectedAction('delete')} className="w-4 h-4 accent-red-600" />
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                            Delete Devices
                                        </div>
                                        <div className="text-xs text-slate-500">Destructive. Permanent removal.</div>
                                    </div>
                                </label>
                            </div>

                            {selectedAction === 'delete' && (
                                <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg flex items-center gap-3 text-red-800 dark:text-red-200 text-sm animate-in slide-in-from-top-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    WARNING: Deletion is permanent. BitLocker keys will be lost. Ensure you have backups.
                                </div>
                            )}

                            {/* Table */}
                            <div className="flex-1 overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col">
                                <div className="bg-slate-50 dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-medium text-slate-500">
                                    <button onClick={toggleAll} className="flex items-center gap-2 hover:text-indigo-600">
                                        <CheckSquare className="w-3 h-3" />
                                        {selectedDeviceIds.size === staleCandidates.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                    <span>{staleCandidates.length} Items</span>
                                </div>
                                <div className="overflow-y-auto flex-1 bg-white dark:bg-slate-900">
                                    {staleCandidates.map(device => {
                                        const isSelected = selectedDeviceIds.has(device.displayName);
                                        return (
                                            <div
                                                key={device.displayName}
                                                onClick={() => toggleSelection(device.displayName)}
                                                className={`flex items-center gap-3 p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer text-sm ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                                    {isSelected && <Check className="w-3 h-3" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-slate-900 dark:text-white truncate">{device.displayName}</div>
                                                    <div className="text-xs text-slate-500 truncate">{device.osCategory} • {device.osVersion || 'Unknown Ver'}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                                        {device.lastSeen ? new Date(device.lastSeen).toLocaleDateString() : 'Never'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">Last Seen</div>
                                                </div>
                                                <div className="flex gap-1">
                                                    {device.ad && <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-100 text-sky-700">AD</span>}
                                                    {device.entra && <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700">Entra</span>}
                                                    {device.intune && <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700">MDM</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                    <button
                        onClick={() => currentStep === 'review' ? setCurrentStep('configure') : onClose()}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                        {currentStep === 'review' ? 'Back' : 'Cancel'}
                    </button>

                    <div className="flex items-center gap-4">
                        {currentStep === 'review' && selectedAction === 'delete' && (
                            <input
                                type="text"
                                placeholder="Type DELETE to confirm"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="px-3 py-2 text-sm border border-red-300 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        )}

                        <button
                            onClick={handleNext}
                            disabled={isProcessing || (currentStep === 'review' && selectedDeviceIds.size === 0) || (currentStep === 'review' && selectedAction === 'delete' && deleteConfirmText !== 'DELETE')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold text-white shadow-lg transition-all flex items-center gap-2 
                                ${currentStep === 'review' && selectedAction === 'delete'
                                    ? 'bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700'
                                }`}
                        >
                            {isProcessing ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                            ) : currentStep === 'review' ? (
                                <>{selectedAction === 'delete' ? 'Delete' : 'Disable'} {selectedDeviceIds.size} Devices</>
                            ) : (
                                <>Review Candidates <ChevronRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
