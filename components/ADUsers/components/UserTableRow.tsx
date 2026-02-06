// User Table Row Component
// Label: AD-ROW

import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { DevLabel } from './DevLabel';
import type { UserTableRowProps } from '../types/adUsers.types';

/**
 * @module ADUsers/UserTableRow
 * @label AD-ROW
 * @description Individual user row with separate columns for all fields
 */
export const UserTableRow: React.FC<UserTableRowProps> = ({
    user,
    selected,
    onSelect,
    isProcessing,
    actionType,
}) => {
    // Animation classes based on action type
    let animationClass = '';
    if (isProcessing) {
        switch (actionType) {
            case 'enable':
                animationClass = 'animate-pulse bg-green-50 dark:bg-green-900/10';
                break;
            case 'disable':
                animationClass = 'animate-pulse bg-red-50 dark:bg-red-900/10';
                break;
            case 'resetPassword':
                animationClass = 'animate-pulse bg-orange-50 dark:bg-orange-900/10';
                break;
            case 'move':
                animationClass = 'animate-pulse bg-blue-50 dark:bg-blue-900/10';
                break;
            case 'suffix':
                animationClass = 'animate-pulse bg-purple-50 dark:bg-purple-900/10';
                break;
            default:
                animationClass = 'animate-pulse bg-slate-50 dark:bg-slate-900/10';
        }
    }

    // Format date to show only date part (YYYY-MM-DD)
    const formatDateOnly = (dateStr: string) => {
        if (!dateStr || dateStr === 'Never' || dateStr === 'N/A') return dateStr;
        try {
            return dateStr.split(' ')[0]; // Get only date part before space
        } catch {
            return dateStr;
        }
    };

    return (
        <tr
            className={`hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors border-b border-slate-100 dark:border-slate-800 ${selected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                } ${animationClass}`}
        >
            {/* Select */}
            <td className="px-2 py-1">
                <button
                    onClick={() => onSelect(user.id)}
                    className="hover:scale-110 transition-transform"
                >
                    {selected ? (
                        <CheckSquare className="w-3 h-3 text-indigo-600" />
                    ) : (
                        <Square className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                    )}
                </button>
            </td>

            {/* Name */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-900 dark:text-white truncate block max-w-[120px]">
                    {user.name}
                </span>
            </td>

            {/* UPN (SAM Account Name) */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate block max-w-[100px]">
                    {user.samAccountName}
                </span>
            </td>

            {/* Email */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate block max-w-[150px]">
                    {user.email || '-'}
                </span>
            </td>

            {/* Status */}
            <td className="px-2 py-1">
                <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${user.status === 'Active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                >
                    {user.status}
                </span>
            </td>

            {/* Department */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate block max-w-[100px]">
                    {user.department || '-'}
                </span>
            </td>

            {/* License */}
            <td className="px-2 py-1">
                <span className={`text-[10px] font-semibold ${(user as any).license ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                    {(user as any).license || '-'}
                </span>
            </td>

            {/* MFA */}
            <td className="px-2 py-1">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${(user as any).mfa === 'YES'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                    {(user as any).mfa || 'NO'}
                </span>
            </td>

            {/* OU (extracted - starts with OU=) */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono truncate block max-w-[180px]" title={(user as any).ou || user.distinguishedName}>
                    {(user as any).ou || '-'}
                </span>
            </td>

            {/* Created Date */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                    {formatDateOnly((user as any).created)}
                </span>
            </td>

            {/* Last Login (date only) */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                    {formatDateOnly(user.lastLogin)}
                </span>
            </td>

            {/* Password Changed */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                    {formatDateOnly(user.lastPasswordSet)}
                </span>
            </td>

            {/* Ext7 */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate block max-w-[80px]">
                    {(user as any).extAttribute7 || '-'}
                </span>
            </td>

            {/* Ext10 */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate block max-w-[80px]">
                    {(user as any).extAttribute10 || '-'}
                </span>
            </td>

            {/* Ext14 */}
            <td className="px-2 py-1">
                <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate block max-w-[80px]">
                    {(user as any).extAttribute14 || '-'}
                </span>
            </td>
        </tr>
    );
};

// Memoize the row to prevent unnecessary re-renders on selection
export const MemoizedUserTableRow = React.memo(UserTableRow, (prevProps, nextProps) => {
    return (
        prevProps.selected === nextProps.selected &&
        prevProps.isProcessing === nextProps.isProcessing &&
        prevProps.actionType === nextProps.actionType &&
        prevProps.user.id === nextProps.user.id &&
        prevProps.user.status === nextProps.user.status
    );
});
