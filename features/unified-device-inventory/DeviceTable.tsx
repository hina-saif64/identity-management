/**
 * Device Table - With Defender column (v5)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, Shield, ShieldOff, Upload } from 'lucide-react';
import { Device, HealthStatus, SystemPresence, DefenderStatus } from './device.types';

interface DeviceTableProps {
    devices: Device[];
    isLoading: boolean;
    loadingSource?: string;
    selectedIds: Set<string>;
    onSelectionChange: React.Dispatch<React.SetStateAction<Set<string>>>;
    filter?: string;
    duplicateNames?: Set<string>;
    // Controlled Props
    filteredDevices: Device[];
    searchTerm: string;
    onSearchChange: (term: string) => void;
    sortField: SortField;
    sortDir: SortDir;
    onSort: (field: SortField) => void;
    enrichmentData?: Map<string, { status: string; owner?: string }>;
    onBulkFilterClick?: () => void;
    hasActiveBulkFilter?: boolean;
    onClearBulkFilter?: () => void;
}

export type SortField = 'displayName' | 'osCategory' | 'systemPresence' | 'healthStatus' | 'defenderStatus' | 'lastSeen';
export type SortDir = 'asc' | 'desc';

const getHealthColor = (status: HealthStatus) => {
    switch (status) {
        case 'Active': return 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20';
        case 'Warning': return 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/20';
        case 'Stale': return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-500/20';
        case 'Disabled': return 'text-slate-600 bg-slate-200 dark:text-slate-400 dark:bg-slate-500/20';
        default: return 'text-slate-600 bg-slate-200 dark:text-slate-400 dark:bg-slate-500/20';
    }
};

const getPresenceColor = (presence: SystemPresence) => {
    switch (presence) {
        case 'All Systems': return 'text-green-700 dark:text-green-400';
        case 'Entra Only': return 'text-cyan-700 dark:text-cyan-400';
        case 'Intune Only': return 'text-blue-700 dark:text-blue-400';
        case 'AD Only': return 'text-orange-700 dark:text-orange-400';
        default: return 'text-slate-600 dark:text-slate-400';
    }
};

const getDefenderColor = (status: DefenderStatus) => {
    switch (status) {
        case 'Onboarded': return 'text-green-700 dark:text-green-400';
        case 'Not Onboarded': return 'text-amber-700 dark:text-amber-400';
        case 'Unsupported': return 'text-slate-500 dark:text-slate-500';
        default: return 'text-slate-400 dark:text-slate-500';
    }
};

// Memoized Row Component
const DeviceTableRow = React.memo(({
    device,
    isSelected,
    isDuplicate,
    filter,
    onToggle,
    enrichmentStatus,
    enrichmentOwner
}: {
    device: Device,
    isSelected: boolean,
    isDuplicate: boolean,
    filter?: string,
    onToggle: (id: string) => void,
    enrichmentStatus?: string,
    enrichmentOwner?: string
}) => {
    return (
        <tr
            className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 ${isSelected ? 'bg-blue-50 dark:bg-blue-500/10' : ''} ${isDuplicate ? 'bg-fuchsia-50/50 dark:bg-fuchsia-500/5' : ''}`}
        >
            <td className="px-1.5 py-1">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(device.displayName)}
                    className="w-3 h-3 rounded border-slate-300 dark:border-slate-500 cursor-pointer"
                />
            </td>
            <td className="px-1.5 py-1 truncate max-w-[120px]" title={device.displayName}>
                <span className={`font-medium ${isDuplicate ? 'text-fuchsia-700 dark:text-fuchsia-400' : 'text-slate-900 dark:text-white'}`}>
                    {device.displayName}
                </span>
                {isDuplicate && <span className="ml-1 text-[9px] text-fuchsia-500">⚠ DUP</span>}
            </td>
            <td className="px-1.5 py-1 text-slate-600 dark:text-slate-300 whitespace-nowrap">{device.osCategory}</td>
            <td className={`px-1.5 py-1 font-medium whitespace-nowrap ${
                // Hyperion Coloring Rule
                filter === 'duplicates'
                    ? device.systemPresence === 'All Systems'
                        ? 'text-green-600 font-bold'
                        : 'text-red-600 font-black'
                    : getPresenceColor(device.systemPresence)
                }`}>
                {device.systemPresence}
                {filter === 'duplicates' && (
                    <span className="ml-1 text-[9px] uppercase tracking-wider opacity-70">
                        {device.systemPresence === 'All Systems' ? '(Master)' : '(Dup)'}
                    </span>
                )}
            </td>
            <td className="px-1.5 py-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getHealthColor(device.healthStatus)}`}>
                    {device.healthStatus}
                </span>
            </td>
            <td className="px-1.5 py-1 whitespace-nowrap">
                <span className={`flex items-center gap-1 text-[11px] font-medium ${getDefenderColor(device.defenderStatus)}`}>
                    {device.defenderStatus === 'Onboarded' ? (
                        <Shield className="w-3 h-3" />
                    ) : (
                        <ShieldOff className="w-3 h-3" />
                    )}
                    {device.defenderStatus}
                </span>
            </td>
            <td className="px-1.5 py-1 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                {device.lastSeen ? new Date(device.lastSeen).toLocaleDateString() : 'N/A'}
            </td>
            {/* Enrichment Columns */}
            {(enrichmentStatus !== undefined || enrichmentOwner !== undefined) && (
                <>
                    <td className="px-1.5 py-1">
                        {(() => {
                            if (!enrichmentStatus) return <span className="text-slate-300 dark:text-slate-600 text-[10px]">-</span>;

                            let colorClass = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
                            const s = enrichmentStatus.toLowerCase();
                            // Status Coloring Logic
                            if (s.includes('damage') || s.includes('broken') || s.includes('stolen') || s.includes('lost')) colorClass = "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300";
                            else if (s.includes('issue') || s.includes('active') || s.includes('deploy')) colorClass = "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300";
                            else if (s.includes('sparev') || s.includes('stock') || s.includes('invent') || s.includes('ready')) colorClass = "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300";
                            else if (s.includes('retire') || s.includes('dispose')) colorClass = "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300";

                            return (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass} truncate max-w-[80px] inline-block`} title={enrichmentStatus}>
                                    {enrichmentStatus}
                                </span>
                            );
                        })()}
                    </td>
                    <td className="px-1.5 py-1 text-slate-600 dark:text-slate-400 truncate max-w-[80px] text-[10px]" title={enrichmentOwner}>
                        {enrichmentOwner || '-'}
                    </td>
                </>
            )}
            <td className="px-1.5 py-1 text-slate-600 dark:text-slate-400 truncate max-w-[100px]" title={device.lastUser}>
                {device.lastUser}
            </td>
        </tr>
    );
});

export const DeviceTable: React.FC<DeviceTableProps> = ({
    devices,
    filteredDevices,
    isLoading,
    loadingSource,
    selectedIds,
    onSelectionChange,
    filter,
    duplicateNames = new Set(),
    searchTerm,
    onSearchChange,
    sortField,
    sortDir,
    onSort,
    enrichmentData,
    onBulkFilterClick,
    hasActiveBulkFilter,
    onClearBulkFilter
}) => {

    // Stable Toggle Handler - No dependencies on selectedIds
    const handleToggle = useCallback((id: string) => {
        onSelectionChange((prevIds) => {
            const newIds = new Set(prevIds);
            if (newIds.has(id)) {
                newIds.delete(id);
            } else {
                newIds.add(id);
            }
            return newIds;
        });
    }, [onSelectionChange]);

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === filteredDevices.length) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(filteredDevices.map(d => d.displayName)));
        }
    }, [selectedIds.size, filteredDevices, onSelectionChange]);

    const SortHeader = useCallback(({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
        <th
            className={`px-1.5 py-1 text-left text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase cursor-pointer hover:text-slate-900 dark:hover:text-white ${className}`}
            onClick={() => onSort(field)}
        >
            <div className="flex items-center gap-0.5">
                {label}
                {sortField === field && (
                    sortDir === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                )}
            </div>
        </th>
    ), [sortField, sortDir, onSort]);

    if (isLoading) {
        return (
            <div className="p-6 text-center">
                <div className="inline-flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                        {loadingSource ? `Loading from ${loadingSource}...` : 'Loading devices...'}
                    </span>
                </div>
            </div>
        );
    }

    const hasEnrichment = enrichmentData && enrichmentData.size > 0;

    return (
        <div className="space-y-2">
            {/* Search and count */}
            <div className="flex items-center gap-3 relative z-10">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search devices..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    />
                </div>

                {/* Bulk Filter Button (Inside Search Area) */}
                <button
                    onClick={onBulkFilterClick}
                    className={`p-1.5 rounded-lg border transition-colors ${hasActiveBulkFilter
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 hover:text-indigo-600 hover:border-indigo-300'}`}
                    title={hasActiveBulkFilter ? "Bulk Filter Active (Click to update)" : "Upload list to Bulk Filter"}
                >
                    <Upload className="w-3.5 h-3.5" />
                </button>

                {hasActiveBulkFilter && (
                    <button
                        onClick={onClearBulkFilter}
                        className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Clear Bulk Filter"
                    >
                        <ShieldOff className="w-3.5 h-3.5" />
                    </button>
                )}
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    {filteredDevices.length} of {devices.length}
                    {selectedIds.size > 0 && ` • ${selectedIds.size} selected`}
                    {filter && filter !== 'all' && ` • ${filter}`}
                </span>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700/50 overflow-hidden bg-white dark:bg-transparent">
                <div className="max-h-[450px] overflow-auto">
                    <table className="w-full" style={{ fontSize: '12px' }}>
                        <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0">
                            <tr>
                                <th className="px-1.5 py-1 text-left w-8">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filteredDevices.length && filteredDevices.length > 0}
                                        onChange={handleSelectAll}
                                        className="w-3 h-3 rounded border-slate-300 dark:border-slate-500 cursor-pointer"
                                    />
                                </th>
                                <SortHeader field="displayName" label="Device" className="max-w-[120px]" />
                                <SortHeader field="osCategory" label="OS" />
                                <SortHeader field="systemPresence" label="Presence" />
                                <SortHeader field="healthStatus" label="Health" />
                                <SortHeader field="defenderStatus" label="Defender" />
                                <SortHeader field="lastSeen" label="Last Seen" />
                                {hasEnrichment && (
                                    <>
                                        <th className="px-1.5 py-1 text-left text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase">Status</th>
                                        <th className="px-1.5 py-1 text-left text-[10px] font-medium text-indigo-600 dark:text-indigo-400 uppercase">Owner</th>
                                    </>
                                )}
                                <th className="px-1.5 py-1 text-left text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">User</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                            {filteredDevices.map((device) => {
                                const enriched = hasEnrichment ? enrichmentData!.get(device.displayName.toLowerCase()) : undefined;
                                return (
                                    <DeviceTableRow
                                        key={device.displayName}
                                        device={device}
                                        isSelected={selectedIds.has(device.displayName)}
                                        isDuplicate={duplicateNames.has(device.displayName)}
                                        filter={filter}
                                        onToggle={handleToggle}
                                        enrichmentStatus={enriched?.status}
                                        enrichmentOwner={enriched?.owner}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DeviceTable;
