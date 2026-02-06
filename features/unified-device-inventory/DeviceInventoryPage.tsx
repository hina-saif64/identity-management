/**
 * Device Inventory Page - Main page (v3)
 * With state persistence and duplicate detection
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { RefreshCw, Download, Ban, AlertTriangle, Monitor, Upload, XCircle, Filter, Database } from 'lucide-react';
import { deviceApi } from './device.api';
import { Device, DeviceSummary, DeviceCredentials, DeletedDevice, ActionResult, OUNode } from './device.types';
import { DeviceDashboard } from './DeviceDashboard';
import { DeviceTable } from './DeviceTable';
import { DeviceBulkActionBar, SystemSelectionModal, OUSelectionModal, ConfirmationModal, ResultsModal, StaleDeviceCleanupModal, DataUploadModal } from './components';

interface PersistedState {
    devices: Device[];
    summary: DeviceSummary | null;
    lastFetched: string | null;
}

type SortField = 'displayName' | 'osCategory' | 'systemPresence' | 'healthStatus' | 'defenderStatus' | 'lastSeen';
type SortDir = 'asc' | 'desc';

interface DeviceInventoryPageProps {
    cloudConnection?: {
        isConnected: boolean;
        tenantId?: string;
        appId?: string;
        vaultName?: string;
        secretName?: string;
    };
    adConnection?: {
        isConnected: boolean;
        server?: string;
        sessionId?: string;
    };
    addLog?: (message: string, module: string, level?: string) => void;
    persistedState?: PersistedState;
    onStateChange?: (state: PersistedState) => void;
}

import XLSX from 'xlsx-js-style';

// 🚀 HYPERION DUPLICATE LOGIC
// 1. Normalization: Remove 'A', 'a', '$' from end
// 2. Group by base name
// 3. Valid Group = Has "All Systems" AND Count > 1
const detectDuplicates = (devices: Device[]): Set<string> => {
    const validDuplicateNames = new Set<string>();
    const groups = new Map<string, Device[]>();

    // 1. Group by Base Name
    devices.forEach(d => {
        // Normalization: Remove 'A', 'a', or '$' from the end
        const baseName = d.displayName.replace(/[Aa$]$/, '');
        if (!groups.has(baseName)) {
            groups.set(baseName, []);
        }
        groups.get(baseName)!.push(d);
    });

    // 2. Filter Groups
    groups.forEach((groupDevices) => {
        const hasAllSystems = groupDevices.some(d => d.systemPresence === 'All Systems');
        const isMultiDevice = groupDevices.length > 1;

        // "Include a device group ... ONLY IF ... contains 'All Systems' AND ... > 1 total row"
        if (hasAllSystems && isMultiDevice) {
            groupDevices.forEach(d => validDuplicateNames.add(d.displayName));
        }
    });

    return validDuplicateNames;
};

export const DeviceInventoryPage: React.FC<DeviceInventoryPageProps> = ({
    cloudConnection,
    adConnection,
    addLog = () => { },
    persistedState,
    onStateChange
}) => {
    // Use persisted state if available, otherwise initialize fresh
    const [devices, setDevices] = useState<Device[]>(persistedState?.devices || []);
    const [summary, setSummary] = useState<DeviceSummary | null>(persistedState?.summary || null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingSource, setLoadingSource] = useState<string>('');
    const [isDisabling, setIsDisabling] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [fetchErrors, setFetchErrors] = useState<Array<{ source: string; error: string }> | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [duplicateNames, setDuplicateNames] = useState<Set<string>>(new Set());
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [deletedDevices, setDeletedDevices] = useState<DeletedDevice[]>([]);
    const [deletedCount, setDeletedCount] = useState(0);
    const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);

    // Bulk Action State
    const [isActing, setIsActing] = useState(false);
    const [showSystemModal, setShowSystemModal] = useState(false);
    const [showOUModal, setShowOUModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [currentAction, setCurrentAction] = useState<'disable' | 'delete' | 'move'>('disable');
    const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
    const [selectedOU, setSelectedOU] = useState<string>('');
    const [actionResults, setActionResults] = useState<ActionResult[]>([]);
    const [showStaleCleanupModal, setShowStaleCleanupModal] = useState(false);

    // Feature: Data Enrichment & Bulk Filter
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadMode, setUploadMode] = useState<'enrich' | 'filter'>('enrich');
    const [enrichmentData, setEnrichmentData] = useState<Map<string, { status: string; owner?: string }>>(new Map());
    const [bulkFilterSet, setBulkFilterSet] = useState<Set<string> | null>(null);

    // Filter/Sort State (Lifted from Table)
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<SortField>('healthStatus');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // Filter Logic
    const filteredDevices = useMemo(() => {
        let result = [...devices];

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(d =>
                d.displayName.toLowerCase().includes(term) ||
                d.os?.toLowerCase().includes(term) ||
                d.lastUser?.toLowerCase().includes(term)
            );
        }

        // Apply tile filter
        if (activeFilter) {
            switch (activeFilter) {
                case 'entra': result = result.filter(d => d.entra); break;
                case 'intune': result = result.filter(d => d.intune); break;
                case 'ad': result = result.filter(d => d.ad); break;
                case 'all-systems': result = result.filter(d => d.entra && d.intune && d.ad); break;
                case 'missing-entra': result = result.filter(d => !d.entra); break;
                case 'missing-intune': result = result.filter(d => !d.intune); break;
                case 'missing-ad': result = result.filter(d => !d.ad); break;
                case 'entra-only': result = result.filter(d => d.entra && !d.intune && !d.ad); break;
                case 'intune-only': result = result.filter(d => d.intune && !d.entra && !d.ad); break;
                case 'ad-only': result = result.filter(d => d.ad && !d.entra && !d.intune); break;
                case 'active': result = result.filter(d => d.healthStatus === 'Active'); break;
                case 'warning': result = result.filter(d => d.healthStatus === 'Warning'); break;
                case 'stale': result = result.filter(d => d.healthStatus === 'Stale'); break;
                case 'disabled': result = result.filter(d => d.healthStatus === 'Disabled'); break;
                case 'win11': result = result.filter(d => d.osCategory === 'Windows 11'); break;
                case 'win10': result = result.filter(d => d.osCategory === 'Windows 10'); break;
                case 'server': result = result.filter(d => d.osCategory === 'Windows Server'); break;
                case 'other': result = result.filter(d => d.osCategory === 'Other Windows' || d.osCategory === 'Unknown'); break;
                case 'duplicates': result = result.filter(d => duplicateNames.has(d.displayName)); break;
                case 'deleted':
                    // For deleted devices, we return a different data structure
                    // This will be handled separately in the component
                    break;
                case 'defender-onboarded': result = result.filter(d => d.defenderStatus === 'Onboarded'); break;
                case 'defender-not-onboarded': result = result.filter(d => d.defenderStatus === 'Not Onboarded'); break;
            }
        }

        // Apply Bulk Filter (from Upload)
        if (bulkFilterSet) {
            // Normalized check: Check if device name (normalized) exists in the set
            // Note: bulkFilterSet should already contain normalized (lowercase) names
            result = result.filter(d => bulkFilterSet.has(d.displayName.toLowerCase()));
        }

        // Sort
        result.sort((a, b) => {
            let aVal: any = a[sortField] || '';
            let bVal: any = b[sortField] || '';

            if (sortField === 'lastSeen') {
                aVal = a.lastSeen || '';
                bVal = b.lastSeen || '';
            }

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [devices, searchTerm, activeFilter, sortField, sortDir, duplicateNames, bulkFilterSet]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    // Detect duplicates when devices change
    useEffect(() => {
        if (devices.length > 0) {
            const dupes = detectDuplicates(devices);
            setDuplicateNames(dupes);
            setDuplicateCount(dupes.size);
        }
    }, [devices]);

    // Persist state when it changes
    useEffect(() => {
        if (onStateChange && (devices.length > 0 || summary)) {
            onStateChange({
                devices,
                summary,
                lastFetched: new Date().toISOString()
            });
        }
    }, [devices, summary]);

    const getCredentials = useCallback((): DeviceCredentials | null => {
        if (!cloudConnection?.isConnected || !cloudConnection.tenantId) {
            return null;
        }
        return {
            tenantId: cloudConnection.tenantId,
            appId: cloudConnection.appId || '',
            vaultName: cloudConnection.vaultName || '',
            secretName: cloudConnection.secretName || '',
            adServer: adConnection?.server,
            adSessionId: adConnection?.sessionId
        };
    }, [cloudConnection, adConnection]);

    const fetchDevices = useCallback(async () => {
        const credentials = getCredentials();
        if (!credentials) {
            setError('Please connect to cloud service first');
            return;
        }

        setIsLoading(true);
        setError(null);
        setFetchErrors(null);

        // Show loading sources progressively
        setLoadingSource('Entra ID');
        addLog('Fetching devices from Entra ID...', 'DEVICES', 'info');

        try {
            // Simulate progressive loading indicator
            setTimeout(() => setLoadingSource('Intune'), 3000);
            setTimeout(() => setLoadingSource('Active Directory'), 6000);

            const result = await deviceApi.fetchDevices(credentials);

            if (result.status === 'success') {
                setDevices(result.devices);
                setSummary(result.summary);
                setFetchErrors(result.errors);
                addLog(`Loaded ${result.devices.length} devices from all sources`, 'DEVICES', 'success');

                if (result.errors) {
                    result.errors.forEach(err => {
                        addLog(`${err.source} fetch error: ${err.error}`, 'DEVICES', 'warning');
                    });
                }
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (err: any) {
            setError(err.message);
            addLog(`Fetch failed: ${err.message}`, 'DEVICES', 'error');
        } finally {
            setIsLoading(false);
            setLoadingSource('');
        }
    }, [getCredentials, addLog]);

    const fetchDeletedDevices = useCallback(async (daysBack = 7) => {
        const credentials = getCredentials();
        if (!credentials) {
            setError('Please connect to cloud service first');
            return;
        }

        setIsLoadingDeleted(true);
        addLog(`Fetching deleted devices (last ${daysBack} days)...`, 'DEVICES', 'info');

        try {
            const result = await deviceApi.fetchDeletedDevices(credentials, daysBack);

            if (result.status === 'success') {
                setDeletedDevices(result.devices);
                setDeletedCount(result.count);
                addLog(`Found ${result.count} deleted devices (last ${daysBack} days)`, 'DEVICES', 'success');

                if (result.errors) {
                    result.errors.forEach(err => {
                        addLog(`${err.source} fetch error: ${err.error}`, 'DEVICES', 'warning');
                    });
                }
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (err: any) {
            addLog(`Fetch deleted devices failed: ${err.message}`, 'DEVICES', 'error');
        } finally {
            setIsLoadingDeleted(false);
        }
    }, [getCredentials, addLog]);

    const handleDisableAllStale = async () => {
        const credentials = getCredentials();
        if (!credentials) {
            setError('Missing credentials');
            return;
        }

        if (!credentials.adServer || !credentials.adSessionId) {
            setError('AD credentials required for this action');
            return;
        }

        const staleCount = summary?.stale || 0;
        if (!confirm(`This will disable ${staleCount} stale devices in Active Directory. Continue?`)) {
            return;
        }

        setIsDisabling(true);
        addLog(`Disabling ${staleCount} stale devices...`, 'DEVICES', 'info');

        try {
            const result = await deviceApi.disableAllStale(credentials);
            addLog(`Disabled ${result.success}/${result.total} devices`, 'DEVICES', 'success');

            if (result.failed > 0) {
                addLog(`Failed to disable ${result.failed} devices`, 'DEVICES', 'warning');
            }

            await fetchDevices();
        } catch (err: any) {
            setError(err.message);
            addLog(`Disable failed: ${err.message}`, 'DEVICES', 'error');
        } finally {
            setIsDisabling(false);
        }
    };

    const handleTileClick = (filter: string) => {
        setActiveFilter(filter);
        addLog(`Filter applied: ${filter}`, 'DEVICES', 'info');

        // If clicking on deleted devices tile, fetch deleted devices
        if (filter === 'deleted' && deletedDevices.length === 0) {
            fetchDeletedDevices(7);
        }
    };

    const handleExport = () => {
        // Export FILTERED devices ("What You See Is What You Export")
        const exportData = filteredDevices.map(d => ({
            'Device Name': d.displayName,
            'OS Category': d.osCategory,
            'OS Version': d.osVersion || '',
            'System Presence': d.systemPresence,
            'Health Status': d.healthStatus,
            'Defender Status': d.defenderStatus,
            'Last Seen': d.lastSeen ? new Date(d.lastSeen).toLocaleString() : '',
            'Last User': d.lastUser || '',
            'Entra ID': d.entra ? 'Yes' : 'No',
            'Intune': d.intune ? 'Yes' : 'No',
            'Active Directory': d.ad ? 'Yes' : 'No',
            'Recommendation': d.recommendation || ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);

        // 🎨 HYPERION STYLING LOGIC
        // If in Duplicate mode, apply Green/Red row coloring
        if (activeFilter === 'duplicates') {
            const range = XLSX.utils.decode_range(ws['!ref'] || '');
            for (let R = range.s.r + 1; R <= range.e.r; ++R) { // Start from 1 to skip header
                const deviceIndex = R - 1;
                const device = filteredDevices[deviceIndex];

                if (device) {
                    let fillColor = null;

                    // Logic: All Systems = Green (Good), Others = Red (Warning)
                    if (device.systemPresence === 'All Systems') {
                        fillColor = { rans: { rgb: "C6EFCD" } }; // Light Green
                        // xlsx-js-style format: fgColor: { rgb: "HEX" }
                        fillColor = { rgb: "D1FAE5" }; // Tailwind green-100 approx
                    } else {
                        fillColor = { rgb: "FEE2E2" }; // Tailwind red-100 approx
                    }

                    if (fillColor) {
                        // Apply to all columns in this row
                        for (let C = range.s.c; C <= range.e.c; ++C) {
                            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                            if (!ws[cellRef]) continue;

                            if (!ws[cellRef].s) ws[cellRef].s = {};
                            ws[cellRef].s.fill = { fgColor: fillColor };
                        }
                    }
                }
            }
        }

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Device Inventory");

        // Save
        XLSX.writeFile(wb, `Hyperion_Device_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
        addLog('Exported full device inventory to Excel', 'DEVICES', 'success');
    };

    // Bulk Action Handlers
    const handleBulkAction = (action: 'disable' | 'delete' | 'move') => {
        if (selectedIds.size === 0) return;

        setCurrentAction(action);

        if (action === 'move') {
            setShowOUModal(true);
        } else {
            setShowSystemModal(true);
        }
    };

    const handleSystemSelection = (systems: string[]) => {
        setSelectedSystems(systems);
        setShowSystemModal(false);
        setShowConfirmModal(true);
    };

    const handleOUSelection = (ouDN: string) => {
        setSelectedOU(ouDN);
        setShowOUModal(false);
        setShowConfirmModal(true);
    };

    const handleConfirmAction = async () => {
        const credentials = getCredentials();
        if (!credentials) {
            setError('Missing credentials');
            return;
        }

        const selectedDevices = devices.filter(d => selectedIds.has(d.displayName));

        setIsActing(true);
        setShowConfirmModal(false);

        try {
            let results: ActionResult[] = [];

            if (currentAction === 'disable') {
                const response = await deviceApi.bulkDisableDevices(credentials, selectedDevices, selectedSystems);
                results = response.results;
                addLog(`Bulk disable completed: ${selectedDevices.length} devices across ${selectedSystems.length} systems`, 'DEVICES', 'info');
            } else if (currentAction === 'delete') {
                const response = await deviceApi.bulkDeleteDevices(credentials, selectedDevices, selectedSystems);
                results = response.results;
                addLog(`Bulk delete completed: ${selectedDevices.length} devices from ${selectedSystems.length} systems`, 'DEVICES', 'info');
            } else if (currentAction === 'move') {
                const response = await deviceApi.bulkMoveDevices(credentials, selectedDevices, selectedOU);
                results = response.results;
                addLog(`Bulk move completed: ${selectedDevices.length} devices to ${selectedOU}`, 'DEVICES', 'info');
            }

            setActionResults(results);
            setShowResultsModal(true);

            // Clear selection - removed auto-refresh to improve performance
            // User can manually refresh if needed
            setSelectedIds(new Set());
            addLog(`Bulk ${currentAction} completed. Use Refresh button to update the list.`, 'DEVICES', 'info');

        } catch (err: any) {
            setError(err.message);
            addLog(`Bulk ${currentAction} failed: ${err.message}`, 'DEVICES', 'error');
        } finally {
            setIsActing(false);
        }
    };

    const handleFetchOUs = async (parentDN?: string): Promise<OUNode[]> => {
        const credentials = getCredentials();
        if (!credentials || !credentials.adServer) {
            throw new Error('AD credentials required');
        }

        const response = await deviceApi.fetchOUs(credentials, parentDN);
        return response.ous;
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
    };

    // Auto-fetch only if no persisted data
    useEffect(() => {
        if (cloudConnection?.isConnected && devices.length === 0) {
            fetchDevices();
        }
    }, [cloudConnection?.isConnected]);

    // Not connected state
    if (!cloudConnection?.isConnected) {
        return (
            <div className="p-6 text-center">
                <Monitor className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unified Device Inventory</h2>
                <p className="text-slate-500 dark:text-slate-400">Connect via Universal Auth to view devices</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Unified Device Inventory
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Entra ID, Intune, and Active Directory
                        {persistedState?.lastFetched && (
                            <span className="ml-2 text-[10px] text-slate-400">
                                • Last fetched: {new Date(persistedState.lastFetched).toLocaleTimeString()}
                            </span>
                        )}
                    </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 relative z-20">
                    <button
                        onClick={fetchDevices}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={devices.length === 0}
                        className="px-3 py-1.5 text-sm rounded-lg bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30 disabled:opacity-50 flex items-center gap-1.5"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>

                    <button
                        onClick={() => { setUploadMode('enrich'); setShowUploadModal(true); }}
                        className="px-3 py-1.5 text-sm rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 flex items-center gap-1.5 cursor-pointer relative z-30"
                        title="Import ServiceDesk/Asset Data (CSV/Excel)"
                    >
                        <Upload className="w-4 h-4" />
                        Import Asset Data
                    </button>

                    {bulkFilterSet && (
                        <button
                            onClick={() => setBulkFilterSet(null)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            title="Clear Bulk Filter"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    )}

                    {adConnection?.isConnected && (summary?.stale || 0) > 0 && (
                        <button
                            onClick={() => setShowStaleCleanupModal(true)}
                            disabled={isDisabling}
                            className="px-3 py-1.5 text-sm rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <Ban className={`w-4 h-4 ${isDisabling ? 'animate-pulse' : ''}`} />
                            Cleanup Stale ({summary?.stale})
                        </button>
                    )}
                </div>
            </div>

            {/* Errors */}
            {error && (
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {fetchErrors && fetchErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">Some sources had errors:</span>
                    </div>
                    <ul className="list-disc list-inside text-xs">
                        {fetchErrors.map((e, i) => (
                            <li key={i}>{e.source}: {e.error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Dashboard Tiles */}
            <DeviceDashboard
                summary={summary}
                isLoading={isLoading}
                loadingSource={loadingSource}
                onTileClick={handleTileClick}
                duplicateCount={duplicateCount}
                deletedCount={deletedCount}
            />

            {/* Device Table or Deleted Devices Table */}
            {activeFilter === 'deleted' ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Deleted Devices (Last 7 Days)
                        </h3>
                        {isLoadingDeleted && (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm text-red-600 dark:text-red-400">Loading deleted devices...</span>
                            </div>
                        )}
                    </div>

                    {deletedDevices.length > 0 ? (
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                                        <tr>
                                            <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Device Name</th>
                                            <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">OS</th>
                                            <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Deleted Date</th>
                                            <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Days Ago</th>
                                            <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Deleted By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                                        {deletedDevices.map((device) => (
                                            <tr key={device.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                                <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{device.displayName}</td>
                                                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{device.os}</td>
                                                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                                    {new Date(device.deletedDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${device.daysAgo <= 1 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                        device.daysAgo <= 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                                        }`}>
                                                        {device.daysAgo} day{device.daysAgo !== 1 ? 's' : ''} ago
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                                                    {device.deletedBy || 'System'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            {isLoadingDeleted ? 'Loading deleted devices...' : 'No deleted devices found in the last 7 days'}
                        </div>
                    )}
                </div>
            ) : (
                <DeviceTable
                    devices={devices}
                    filteredDevices={filteredDevices}
                    isLoading={isLoading}
                    loadingSource={loadingSource}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    filter={activeFilter}
                    duplicateNames={duplicateNames}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                    enrichmentData={enrichmentData}
                    onBulkFilterClick={() => { setUploadMode('filter'); setShowUploadModal(true); }}
                    hasActiveBulkFilter={!!bulkFilterSet}
                    onClearBulkFilter={() => setBulkFilterSet(null)}
                />
            )}

            {/* Device Bulk Action Bar */}
            <DeviceBulkActionBar
                selectedCount={selectedIds.size}
                onAction={handleBulkAction}
                onClearSelection={handleClearSelection}
                isActing={isActing}
            />

            {/* Modals */}
            <SystemSelectionModal
                isOpen={showSystemModal}
                onClose={() => setShowSystemModal(false)}
                onConfirm={handleSystemSelection}
                action={currentAction as 'disable' | 'delete'}
                deviceCount={selectedIds.size}
            />

            <OUSelectionModal
                isOpen={showOUModal}
                onClose={() => setShowOUModal(false)}
                onConfirm={handleOUSelection}
                deviceCount={selectedIds.size}
                onFetchOUs={handleFetchOUs}
            />

            <ConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmAction}
                action={currentAction}
                deviceCount={selectedIds.size}
                systems={selectedSystems}
                targetOU={selectedOU}
            />

            <ResultsModal
                isOpen={showResultsModal}
                onClose={() => setShowResultsModal(false)}
                action={currentAction}
                results={actionResults}
                totalDevices={selectedIds.size}
            />

            <DataUploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                initialMode={uploadMode}
                onEnrich={(data) => {
                    setEnrichmentData(data);
                    addLog(`Enriched inventory with ${data.size} service desk records`, 'DEVICES', 'success');
                }}
                onBulkFilter={(deviceSet) => {
                    setBulkFilterSet(deviceSet);
                    addLog(`Applied bulk filter: ${deviceSet.size} devices in scope`, 'DEVICES', 'info');
                }}
            />
            <StaleDeviceCleanupModal
                isOpen={showStaleCleanupModal}
                onClose={() => setShowStaleCleanupModal(false)}
                devices={devices}
                onConfirm={async (selectedDevices, action) => {
                    const credentials = getCredentials();
                    if (!credentials) return;

                    // Reuse the bulk action logic but trigger it from the wizard
                    setSelectedIds(new Set(selectedDevices.map(d => d.displayName))); // Temporary selection for results modal flow

                    const systems = ['ad', 'entra', 'intune']; // Cleanup usually targets all available systems where the device exists

                    try {
                        let results: ActionResult[] = [];

                        if (action === 'disable') {
                            const response = await deviceApi.bulkDisableDevices(credentials, selectedDevices, systems);
                            results = response.results;
                            addLog(`Stale Cleanup: Disabled ${selectedDevices.length} devices`, 'DEVICES', 'info');
                        } else {
                            const response = await deviceApi.bulkDeleteDevices(credentials, selectedDevices, systems);
                            results = response.results;
                            addLog(`Stale Cleanup: Deleted ${selectedDevices.length} devices`, 'DEVICES', 'info');
                        }

                        setActionResults(results);
                        setCurrentAction(action);
                        setShowResultsModal(true);

                        // Removed auto-refresh - user can manually refresh if needed
                        addLog(`Stale cleanup completed. Use Refresh button to update the list.`, 'DEVICES', 'info');
                    } catch (err: any) {
                        setError(err.message);
                        addLog(`Stale Cleanup failed: ${err.message}`, 'DEVICES', 'error');
                    }
                }}
            />
        </div>
    );
};

export default DeviceInventoryPage;
