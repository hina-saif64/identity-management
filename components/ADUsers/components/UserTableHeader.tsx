// User Table Header Component with Sorting
// Label: AD-HEADER

import React from 'react';
import { CheckSquare, Square, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { UserTableHeaderProps } from '../types/adUsers.types';

/**
 * @module ADUsers/UserTableHeader
 * @label AD-HEADER
 * @description Table header with select-all functionality and sortable column headers
 */
export const UserTableHeader: React.FC<UserTableHeaderProps> = ({
    allSelected,
    onToggleSelectAll,
    hasUsers,
    sortColumn,
    sortDirection,
    onSort,
}) => {
    const renderSortIcon = (column: string) => {
        if (sortColumn !== column) {
            return <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
        }
        return sortDirection === 'asc' ? (
            <ArrowUp className="w-2.5 h-2.5 text-blue-600" />
        ) : (
            <ArrowDown className="w-2.5 h-2.5 text-blue-600" />
        );
    };

    const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
        <th className="px-2 py-1.5 text-left group">
            <button
                onClick={() => onSort?.(column)}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
                <span className="text-[10px] font-normal text-slate-600 dark:text-slate-400 uppercase tracking-wider group-hover:text-blue-600">
                    {children}
                </span>
                {renderSortIcon(column)}
            </button>
        </th>
    );

    return (
        <thead className="bg-slate-50 dark:bg-slate-950/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
            <tr>
                {/* Select All */}
                <th className="px-2 py-1.5 text-left">
                    <button
                        onClick={onToggleSelectAll}
                        className="hover:scale-110 transition-transform"
                        disabled={!hasUsers}
                    >
                        {allSelected && hasUsers ? (
                            <CheckSquare className="w-3 h-3 text-indigo-600" />
                        ) : (
                            <Square className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                        )}
                    </button>
                </th>

                {/* Sortable Column Headers */}
                <SortableHeader column="name">Name</SortableHeader>
                <SortableHeader column="samAccountName">SAM Account</SortableHeader>
                <SortableHeader column="email">UPN/Email</SortableHeader>
                <SortableHeader column="status">Status</SortableHeader>
                <SortableHeader column="department">Department</SortableHeader>
                <SortableHeader column="license">License</SortableHeader>
                <SortableHeader column="mfa">MFA</SortableHeader>
                <SortableHeader column="ou">OU</SortableHeader>
                <SortableHeader column="created">Created</SortableHeader>
                <SortableHeader column="lastLogin">Last Login</SortableHeader>
                <SortableHeader column="lastPasswordSet">Pwd Changed</SortableHeader>
                <SortableHeader column="extAttribute7">Ext7</SortableHeader>
                <SortableHeader column="extAttribute10">Ext10</SortableHeader>
                <SortableHeader column="extAttribute14">Ext14</SortableHeader>
            </tr>
        </thead>
    );
};
