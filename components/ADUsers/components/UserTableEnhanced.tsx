// Enhanced User Table - Dense style matching Device Inventory
// Label: USER-TABLE-ENHANCED

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, CheckCircle, XCircle, AlertTriangle, Shield, Copy, User, Mail, Building, Ticket, MoreVertical, UserCheck, Key } from 'lucide-react';
import type { EnhancedUser } from '../types/enhanced.types';
import { ENHANCED_DEV_LABELS } from '../constants/enhanced.constants';

interface UserTableEnhancedProps {
    users: EnhancedUser[];
    onUserSelect?: (userId: string) => void;
    highlightTerm?: string;
    filter?: string; // Controlled filter from Dashboard
    // Lifted selection state
    selectedUsers?: Set<string>;
    onSelectAll?: (allIds: string[]) => void;
    onClearSelection?: () => void;
    onAction?: (action: string, user: EnhancedUser) => void;
}

type SortField = 'name' | 'email' | 'status' | 'healthStatus' | 'lastLogin' | 'department' | 'lastInteractive' | 'license' | 'lastAdLogin' | 'lastExchangeActivity' | 'lastTeamsActivity' | 'createdDate' | 'lastEntraLogin';
type SortDir = 'asc' | 'desc';

// --- Memoized Row Component for Performance ---
interface UserTableRowProps {
    user: EnhancedUser;
    isSelected: boolean;
    onToggle: (id: string) => void;
    searchTerm: string;
    getHealthColor: (status: string) => string;
    onAction: (action: string, user: EnhancedUser) => void;
}

const HighlightedText = ({ text, term }: { text: string; term: string }) => {
    if (!term || !text) return <>{text}</>;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === term.toLowerCase() ? (
                    <span key={i} className="bg-yellow-100 dark:bg-yellow-900/40 text-gray-900 dark:text-white font-bold rounded-sm px-0.5">
                        {part}
                    </span>
                ) : part
            )}
        </>
    );
};

const UserTableRow = React.memo(({ user, isSelected, onToggle, searchTerm, getHealthColor, onAction }: UserTableRowProps) => {
    const formatDate = (dateStr?: string | Date): string => {
        if (!dateStr || dateStr === 'Never') return '-';
        try {
            return new Date(dateStr).toLocaleDateString();
        } catch {
            return String(dateStr);
        }
    };

    return (
        <tr
            className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 ${isSelected ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}
        >
            <td className="px-1.5 py-1">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(user.id)}
                    className="w-3 h-3 rounded border-slate-300 dark:border-slate-500"
                />
            </td>
            <td className="px-1.5 py-1">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate">
                        {(user.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]" title={user.name}>
                            <HighlightedText text={user.name || ''} term={searchTerm} />
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={user.samAccountName}>
                            <HighlightedText text={user.samAccountName || 'Unknown'} term={searchTerm} />
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-1.5 py-1">
                <div className="truncate max-w-[160px] text-slate-700 dark:text-slate-300 flex items-center gap-1" title={user.email}>
                    {user.email && <Mail className="w-3 h-3 text-slate-400" />}
                    <HighlightedText text={user.email || ''} term={searchTerm} />
                </div>
                <div className="truncate max-w-[160px] text-[10px] text-slate-500 dark:text-slate-400" title={user.upn}>
                    <HighlightedText text={user.upn || ''} term={searchTerm} />
                </div>
            </td>

            {/* Department / OU */}
            <td className="px-1.5 py-1">
                <div className="min-w-0">
                    <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={user.department}>
                        <HighlightedText text={user.department || 'General'} term={searchTerm} />
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[140px]" title={user.distinguishedName}>
                        {user.distinguishedName}
                    </div>
                </div>
            </td>

            {/* License Column */}
            <td className="px-1.5 py-1">
                {user.license ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        <Ticket className="w-2.5 h-2.5 mr-1" />
                        {user.license}
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600 text-[10px]">-</span>
                )}
            </td>

            <td className="px-1.5 py-1">
                <div className="flex gap-0.5">
                    {user.sources.ad && <span className="text-[9px] px-1 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium select-none">AD</span>}
                    {user.sources.entra && <span className="text-[9px] px-1 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-medium select-none">ID</span>}
                    {user.sources.exchange && <span className="text-[9px] px-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium select-none">EX</span>}
                </div>
            </td>

            {/* Status */}
            <td className="px-1.5 py-1">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${getHealthColor(user.healthStatus)}`}>
                    {user.healthStatus}
                </span>
            </td>

            {/* Date Created */}
            <td className="px-1.5 py-1">
                <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono" title={`Created: ${user.createdDate || 'Unknown'}`}>
                    {formatDate(user.createdDate)}
                </div>
            </td>

            {/* Last Logon (AD) */}
            <td className="px-1.5 py-1">
                <div className="flex flex-col gap-0.5">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono" title={`Last Logon (AD/Exchange): ${user.lastLogin}`}>
                        {formatDate(user.lastLogin)}
                    </div>
                </div>
            </td>

            {/* Last Logon (Entra) */}
            <td className="px-1.5 py-1">
                <div className="flex flex-col gap-0.5">
                    <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono" title={`Last Logon (Entra): ${user.entraData?.lastSignIn}`}>
                        {formatDate(user.entraData?.lastSignIn)}
                    </div>
                </div>
            </td>

            {/* Actions */}
            <td className="px-1.5 py-1 text-right">
                <div className="relative group inline-block">
                    <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {/* Hover Menu */}
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <div className="p-1 flex flex-col gap-0.5">
                            <button onClick={() => onAction('enable', user)} className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-left w-full">
                                <UserCheck className="w-3 h-3 text-green-600" /> Enable
                            </button>
                            <button onClick={() => onAction('disable', user)} className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-left w-full">
                                <XCircle className="w-3 h-3 text-red-600" /> Disable
                            </button>
                            <button onClick={() => onAction('unlock', user)} className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-left w-full">
                                <Shield className="w-3 h-3 text-amber-600" /> Unlock
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-slate-700 my-0.5" />
                            <button onClick={() => onAction('move', user)} className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-left w-full">
                                <Building className="w-3 h-3 text-blue-600" /> Move OU
                            </button>
                            <button onClick={() => onAction('resetPassword', user)} className="flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded text-left w-full">
                                <Key className="w-3 h-3 text-orange-600" /> Reset Pwd
                            </button>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    );
}, (prev, next) => {
    // Custom comparison for performance
    return prev.isSelected === next.isSelected &&
        prev.user === next.user &&
        prev.searchTerm === next.searchTerm;
});


export const UserTableEnhanced: React.FC<UserTableEnhancedProps> = ({
    users,
    onUserSelect,
    highlightTerm: initialSearchTerm = '',
    filter = 'all',
    selectedUsers = new Set(), // Default to empty set if not provided (fallback)
    onSelectAll,
    onClearSelection,
    onAction = () => { } // Default no-op
}) => {
    // Local state for sort/filter since we aren't lifting it all up yet
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [internalSelectedUsers, setInternalSelectedUsers] = useState<Set<string>>(new Set());
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // Use props if provided, otherwise local state (backward compatibility)
    const activeSelectedUsers = onUserSelect && onSelectAll ? selectedUsers : internalSelectedUsers;

    // Sorting Logic updated for new columns
    const filteredUsers = useMemo(() => {
        let result = [...users];

        // 1. Dashboard Tile Filter (Simplified logic as per previous implementation)
        if (filter && filter !== 'all') {
            switch (filter) {
                case 'active': result = result.filter(u => u.status === 'Active'); break;
                case 'disabled': result = result.filter(u => u.status === 'Disabled'); break;
                case 'never-login': result = result.filter(u => u.lastLogin === 'Never'); break;
                case 'ad-total': result = result.filter(u => u.sources.ad && !u.isGuest && !u.isTarget); break;
                case 'entra-total': result = result.filter(u => u.sources.entra && !u.isGuest && !u.isTarget); break;
                case 'ad-unsynced': result = result.filter(u => u.sources.ad && !u.sources.entra && !u.sources.exchange && !u.isGuest && !u.isTarget); break;
                case 'entra-cloud-only': result = result.filter(u => !u.sources.ad && u.sources.entra && !u.sources.exchange && !u.isGuest && !u.isTarget); break;
                case 'guests': result = result.filter(u => u.isGuest); break;
                case 'privileged': result = result.filter(u => u.isPrivileged); break;
                case 'with-email': result = result.filter(u => !!u.email); break;
                case 'no-mfa': result = result.filter(u => u.entraData && !u.entraData.mfaEnabled); break;
                case 'synced': result = result.filter(u => u.sources.ad && u.sources.entra); break;
            }
        } else {
            // Default View ('all'): Exclude Guests and B2B (#EXT#)
            result = result.filter(u => !u.isGuest && !u.upn?.toLowerCase().includes('#ext#'));
        }

        // 2. Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(u =>
                (u.name || '').toLowerCase().includes(term) ||
                (u.email || '').toLowerCase().includes(term) ||
                (u.samAccountName || '').toLowerCase().includes(term) ||
                (u.upn || '').toLowerCase().includes(term) ||
                (u.department || '').toLowerCase().includes(term)
            );
        }

        result.sort((a, b) => {
            let aVal: any = a[sortField] || '';
            let bVal: any = b[sortField] || '';

            if (sortField === 'healthStatus') {
                aVal = a.healthStatus || 'Active';
                bVal = b.healthStatus || 'Active';
            }
            if (sortField === 'lastInteractive') {
                aVal = a.usageData?.lastInteractiveSignIn || '';
                bVal = b.usageData?.lastInteractiveSignIn || '';
            }
            if (sortField === 'license') {
                aVal = a.license || '';
                bVal = b.license || '';
            }
            if (sortField === 'lastAdLogin') {
                aVal = a.lastLogin || '';
                bVal = b.lastLogin || '';
            }
            if (sortField === 'createdDate') {
                aVal = a.createdDate || '';
                bVal = b.createdDate || '';
            }
            if (sortField === 'lastEntraLogin') {
                aVal = a.entraData?.lastSignIn || '';
                bVal = b.entraData?.lastSignIn || '';
            }
            if (sortField === 'lastExchangeActivity') {
                aVal = a.usageData?.exchangeLastActivity || '';
                bVal = b.usageData?.exchangeLastActivity || '';
            }
            if (sortField === 'lastTeamsActivity') {
                aVal = a.usageData?.teamsLastActivity || '';
                bVal = b.usageData?.teamsLastActivity || '';
            }

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [users, searchTerm, sortField, sortDir, filter]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const handleToggle = useCallback((id: string) => {
        if (onUserSelect) {
            onUserSelect(id);
        } else {
            // Fallback to local state
            setInternalSelectedUsers(prev => {
                const newSet = new Set(prev);
                if (newSet.has(id)) newSet.delete(id);
                else newSet.add(id);
                return newSet;
            });
        }
    }, [onUserSelect]);

    const handleSelectAll = () => {
        const allIds = filteredUsers.map(u => u.id);
        const allSelected = allIds.every(id => activeSelectedUsers.has(id));

        if (onSelectAll && onClearSelection) {
            if (allSelected) {
                onClearSelection();
            } else {
                onSelectAll(allIds);
            }
        } else {
            // Fallback
            if (allSelected) {
                setInternalSelectedUsers(new Set());
            } else {
                setInternalSelectedUsers(new Set(allIds));
            }
        }
    };

    const SortHeader = ({ field, label, className = '' }: { field: SortField; label: string; className?: string }) => (
        <th
            className={`px-1.5 py-1 text-left text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase cursor-pointer hover:text-slate-900 dark:hover:text-white ${className}`}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-0.5">
                {label}
                {sortField === field && (
                    sortDir === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                )}
            </div>
        </th>
    );

    const getHealthColor = useCallback((status: string) => {
        switch (status) {
            case 'Active': return 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20';
            case 'Disabled': return 'text-slate-600 bg-slate-200 dark:text-slate-400 dark:bg-slate-500/20';
            case 'Warning': return 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/20';
            default: return 'text-slate-600 bg-slate-200 dark:text-slate-400 dark:bg-slate-500/20';
        }
    }, []);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Reset page when filter/search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchTerm, sortField, sortDir, initialSearchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredUsers.length);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    const handlePageChange = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    if (users.length === 0) {
        return (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                No users found. Connect sources or refresh.
            </div>
        );
    }

    return (
        <div className="space-y-2" data-dev-label={ENHANCED_DEV_LABELS.USER_INTELLIGENCE}>
            {/* Search and count */}
            <div className="flex items-center gap-3 p-2 border-b border-gray-100 dark:border-gray-700/50">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users by name, email, UPN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Showing {startIndex + 1}-{endIndex} of {filteredUsers.length} users
                    {activeSelectedUsers.size > 0 && ` • ${activeSelectedUsers.size} selected`}
                    {filter !== 'all' && ` • Filter: ${filter}`}
                </span>
            </div>

            {/* Table */}
            <div className="rounded-lg border-0 dark:border-slate-700/50 overflow-hidden bg-white dark:bg-transparent">
                <div className="max-h-[600px] overflow-auto">
                    <table className="w-full" style={{ fontSize: '11px' }}>
                        <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-1.5 py-1 text-left w-8">
                                    <input
                                        type="checkbox"
                                        checked={paginatedUsers.length > 0 && paginatedUsers.every(u => activeSelectedUsers.has(u.id))}
                                        onChange={handleSelectAll}
                                        className="w-3 h-3 rounded border-slate-300 dark:border-slate-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </th>
                                <SortHeader field="name" label="User Identity" className="min-w-[180px]" />
                                <SortHeader field="email" label="Contact" />
                                <SortHeader field="department" label="Department / OU" />
                                <SortHeader field="license" label="License" />
                                <th className="px-1.5 py-1 text-left text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase">Sources</th>
                                <SortHeader field="healthStatus" label="Status" />
                                <SortHeader field="createdDate" label="Date Created" />
                                <SortHeader field="lastAdLogin" label="Last Logon (AD)" />
                                <SortHeader field="lastEntraLogin" label="Last Logon (Entra)" />
                                <th className="px-1.5 py-1 text-right text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase w-10">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                            {paginatedUsers.map((user) => (
                                <UserTableRow
                                    key={user.id}
                                    user={user}
                                    isSelected={activeSelectedUsers.has(user.id)}
                                    onToggle={handleToggle}
                                    searchTerm={searchTerm}
                                    getHealthColor={getHealthColor}
                                    onAction={onAction}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100 dark:border-gray-700/50 bg-slate-50 dark:bg-slate-800/30">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-600 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-700"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-600 disabled:opacity-50 hover:bg-white dark:hover:bg-slate-700"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};