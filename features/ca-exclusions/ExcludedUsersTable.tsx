/**
 * Excluded Users Table Component
 * Displays excluded users with geo risk data
 * Features: Progressive sign-in loading, clickable sort headers, CSV export, user selection, remove exclusions
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, RefreshCw, Globe, Clock, MapPin, Wifi, ChevronUp, ChevronDown, Loader2, UserMinus } from 'lucide-react';
import { ExcludedUser, CaPolicy, CaCredentials } from './ca.types';
import { GeoRiskBadge } from './GeoRiskBadge';
import { PolicyStateBadge } from './PolicyStateBadge';
import { RemoveExclusionModal } from './RemoveExclusionModal';
import { caApi } from './ca.api';

type SortField = 'name' | 'upn' | 'exclusion' | 'country' | 'risk';
type SortDir = 'asc' | 'desc';

interface ExcludedUsersTableProps {
    users: ExcludedUser[];
    setUsers: React.Dispatch<React.SetStateAction<ExcludedUser[]>>;
    policy: CaPolicy | null;
    isLoading: boolean;
    onRefresh: () => void;
    getCredentials: () => CaCredentials | null;
    addLog: (message: string, module: string, level?: string) => void;
}

export const ExcludedUsersTable: React.FC<ExcludedUsersTableProps> = ({
    users,
    setUsers,
    policy,
    isLoading,
    onRefresh,
    getCredentials,
    addLog
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<SortField>('risk');  // Default: sort by geo risk
    const [sortDir, setSortDir] = useState<SortDir>('desc');  // Green (safe) first, then Orange (risky)
    const [isLoadingSignIns, setIsLoadingSignIns] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showRemoveModal, setShowRemoveModal] = useState(false);

    // Clear selection when policy changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [policy?.id]);

    // Progressively fetch sign-in data after users are loaded
    useEffect(() => {
        const fetchSignIns = async () => {
            if (users.length === 0 || isLoading) return;

            // Check if we already have sign-in data
            const hasSignInData = users.some(u => u.lastSignIn?.country);
            if (hasSignInData) return;

            const credentials = getCredentials();
            if (!credentials) return;

            setIsLoadingSignIns(true);
            addLog('Loading sign-in locations...', 'CLOUD', 'info');

            try {
                const userIds = users.map(u => u.id);
                const result = await caApi.getSignIns(credentials, userIds);

                if (result.status === 'success' && result.signIns) {
                    setUsers(prevUsers => prevUsers.map(user => {
                        const signInData = result.signIns[user.id];
                        if (signInData) {
                            return {
                                ...user,
                                lastSignIn: signInData.lastSignIn,
                                geoRisk: signInData.geoRisk
                            };
                        }
                        return user;
                    }));
                    addLog(`Loaded sign-in data for ${result.count} users`, 'CLOUD', 'success');
                }
            } catch (err: any) {
                addLog(`Sign-in fetch error: ${err.message}`, 'CLOUD', 'warning');
            } finally {
                setIsLoadingSignIns(false);
            }
        };

        fetchSignIns();
    }, [users.length, isLoading]);

    // Handle header click for sorting
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    // Toggle user selection
    const toggleSelect = (userId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    // Toggle all selection
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredUsers.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    // Get selected users
    const selectedUsers = useMemo(() =>
        users.filter(u => selectedIds.has(u.id)),
        [users, selectedIds]
    );

    // Handle remove confirmation
    const handleRemoveExclusions = async () => {
        const credentials = getCredentials();
        if (!credentials || !policy) throw new Error('Missing credentials or policy');

        const directUserIds = selectedUsers
            .filter(u => u.exclusionType === 'Direct')
            .map(u => u.id);

        if (directUserIds.length === 0) {
            throw new Error('No direct exclusions to remove');
        }

        addLog(`Removing ${directUserIds.length} exclusions from ${policy.displayName}...`, 'CLOUD', 'info');

        const result = await caApi.removeExclusions(credentials, policy.id, directUserIds);

        if (result.status === 'success') {
            addLog(`Successfully removed ${result.removedCount} exclusions`, 'CLOUD', 'success');
            setSelectedIds(new Set());
            onRefresh(); // Refresh the table
        } else {
            throw new Error(result.error || 'Failed to remove exclusions');
        }
    };

    // Render sort indicator
    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />;
    };

    // Filter and sort users
    const filteredUsers = useMemo(() => {
        let result = users;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(u =>
                u.displayName.toLowerCase().includes(term) ||
                u.userPrincipalName.toLowerCase().includes(term) ||
                (u.lastSignIn?.country || '').toLowerCase().includes(term)
            );
        }

        result = [...result].sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'name':
                    cmp = a.displayName.localeCompare(b.displayName);
                    break;
                case 'upn':
                    cmp = a.userPrincipalName.localeCompare(b.userPrincipalName);
                    break;
                case 'exclusion':
                    cmp = a.exclusionType.localeCompare(b.exclusionType);
                    break;
                case 'country':
                    cmp = (a.lastSignIn?.country || 'zzz').localeCompare(b.lastSignIn?.country || 'zzz');
                    break;
                case 'risk':
                    const riskOrder = { 'ORANGE': 0, 'GRAY': 1, 'GREEN': 2 };
                    cmp = (riskOrder[a.geoRisk] || 2) - (riskOrder[b.geoRisk] || 2);
                    break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [users, searchTerm, sortField, sortDir]);

    // Export to CSV
    const handleExport = () => {
        const headers = ['Display Name', 'UPN', 'Exclusion Type', 'Country', 'City', 'IP', 'Last Sign-In', 'Geo Risk'];
        const rows = filteredUsers.map(u => [
            u.displayName,
            u.userPrincipalName,
            u.exclusionType,
            u.lastSignIn?.country || 'N/A',
            u.lastSignIn?.city || 'N/A',
            u.lastSignIn?.ipAddress || 'N/A',
            u.lastSignIn?.timestamp || 'N/A',
            u.geoRisk
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CA_Exclusions_${policy?.displayName || 'Export'}.csv`;
        link.click();
    };

    if (!policy) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-800/30 rounded-xl border border-slate-700/50">
                <Globe className="w-12 h-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-400">Select a Policy</h3>
                <p className="text-sm text-slate-500 mt-1">Click on a policy tile to view excluded users</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700/50">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-lg font-bold text-white">{policy.displayName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <PolicyStateBadge state={policy.state} />
                                <span className="text-xs text-slate-500">{users.length} excluded users</span>
                                {isLoadingSignIns && (
                                    <span className="text-xs text-indigo-400 flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Loading locations...
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Remove Selected Button */}
                            {selectedIds.size > 0 && (
                                <button
                                    onClick={() => setShowRemoveModal(true)}
                                    className="px-3 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-xs font-bold flex items-center gap-2 transition-colors"
                                >
                                    <UserMinus className="w-4 h-4" />
                                    Remove ({selectedIds.size})
                                </button>
                            )}
                            <button
                                onClick={handleExport}
                                disabled={users.length === 0}
                                className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors disabled:opacity-50"
                                title="Export CSV"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors disabled:opacity-50"
                                title="Refresh"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name, UPN, or country..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Loading excluded users...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-slate-400">No excluded users found</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-900/30">
                                    {/* Checkbox column */}
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                                        />
                                    </th>
                                    <th
                                        className="px-4 py-3 cursor-pointer hover:text-slate-300 transition-colors"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-1">
                                            User <SortIcon field="name" />
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 cursor-pointer hover:text-slate-300 transition-colors"
                                        onClick={() => handleSort('exclusion')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Exclusion <SortIcon field="exclusion" />
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 cursor-pointer hover:text-slate-300 transition-colors"
                                        onClick={() => handleSort('country')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Last Sign-In <SortIcon field="country" />
                                        </div>
                                    </th>
                                    <th
                                        className="px-4 py-3 cursor-pointer hover:text-slate-300 transition-colors"
                                        onClick={() => handleSort('risk')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Geo Risk <SortIcon field="risk" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        className={`
                                            hover:bg-slate-700/30 transition-colors cursor-pointer
                                            ${user.geoRisk === 'ORANGE' ? 'bg-orange-500/5' : ''}
                                            ${selectedIds.has(user.id) ? 'bg-indigo-500/10' : ''}
                                        `}
                                        onClick={() => toggleSelect(user.id)}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(user.id)}
                                                onChange={() => toggleSelect(user.id)}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-white">{user.displayName}</p>
                                                <p className="text-xs text-slate-500">{user.userPrincipalName}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`
                                                px-2 py-0.5 text-[10px] font-bold rounded-full
                                                ${user.exclusionType === 'Direct'
                                                    ? 'bg-blue-500/20 text-blue-400'
                                                    : 'bg-purple-500/20 text-purple-400'
                                                }
                                            `}>
                                                {user.exclusionType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {isLoadingSignIns ? (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    <span>Loading...</span>
                                                </div>
                                            ) : user.lastSignIn?.country ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                                        <MapPin className="w-3 h-3" />
                                                        <span>{user.lastSignIn.city || 'Unknown'}, {user.lastSignIn.country}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Wifi className="w-3 h-3" />
                                                        <span>{user.lastSignIn.ipAddress || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{new Date(user.lastSignIn.timestamp || '').toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-500">No recent sign-in</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <GeoRiskBadge risk={user.geoRisk} country={user.lastSignIn?.country} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Legend */}
                <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900/30">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="font-bold uppercase">Legend:</span>
                        <span>🟢 UAE/KSA</span>
                        <span>🟠 Outside UAE/KSA</span>
                        <span>⚪ No data (48h)</span>
                    </div>
                </div>
            </div>

            {/* Remove Exclusion Modal */}
            <RemoveExclusionModal
                isOpen={showRemoveModal}
                onClose={() => setShowRemoveModal(false)}
                onConfirm={handleRemoveExclusions}
                policy={policy}
                selectedUsers={selectedUsers}
            />
        </>
    );
};

export default ExcludedUsersTable;
