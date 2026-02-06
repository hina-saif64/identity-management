// Bulk Action Bar Component
// Label: AD-BULK-BAR
// Restored to original design from backup

import React from 'react';
import { X, UserCheck, Move, Key, Loader2, UserPlus, CheckSquare } from 'lucide-react';
import { DevLabel } from '../DevLabel';
import type { BulkActionBarProps } from '../../types/adUsers.types';

/**
 * @module ADUsers/BulkActionBar
 * @label AD-BULK-BAR
 * @description Bulk action bar for selected users - Original design restored
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
    selectedCount,
    onAction,
    onClearSelection,
    isActing,
    onShowOUSelector,
    onShowUPNSelector,
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <DevLabel label="AD-BULK-BAR" />

            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-1.5 flex items-center gap-2">
                {/* Selection Counter */}
                <div className="flex items-center gap-1.5 text-white px-1">
                    <CheckSquare className="w-3 h-3 text-indigo-400" />
                    <span className="text-[9px] font-bold">{selectedCount}</span>
                </div>

                <div className="w-px h-5 bg-slate-700" />

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Enable */}
                    <div className="group relative">
                        <button
                            onClick={() => onAction('enable')}
                            disabled={isActing}
                            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                        >
                            <UserCheck className="w-4 h-4 text-green-500 group-hover:text-green-400 group-hover:animate-bounce" />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Enable Users
                        </div>
                    </div>

                    {/* Disable */}
                    <div className="group relative">
                        <button
                            onClick={() => onAction('disable')}
                            disabled={isActing}
                            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                        >
                            <X className="w-4 h-4 text-red-500 group-hover:text-red-400 group-hover:animate-pulse" />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Disable Users
                        </div>
                    </div>

                    {/* Move to OU */}
                    <div className="group relative">
                        <button
                            onClick={onShowOUSelector}
                            disabled={isActing}
                            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                        >
                            <Move className="w-4 h-4 text-blue-500 group-hover:text-blue-400 group-hover:animate-spin" />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Move to OU
                        </div>
                    </div>

                    {/* Change UPN */}
                    <div className="group relative">
                        <button
                            onClick={onShowUPNSelector}
                            disabled={isActing}
                            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                        >
                            <UserPlus className="w-4 h-4 text-purple-500 group-hover:text-purple-400 group-hover:animate-bounce" />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Change UPN
                        </div>
                    </div>

                    {/* Reset Password */}
                    <div className="group relative">
                        <button
                            onClick={() => {
                                const password = prompt('Enter new password (will require change at next logon):');
                                if (password && password.length >= 8) {
                                    onAction('resetPassword', password);
                                } else if (password) {
                                    alert('Password must be at least 8 characters long.');
                                }
                            }}
                            disabled={isActing}
                            className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50 group"
                        >
                            <Key className="w-3.5 h-3.5 text-orange-500 group-hover:text-orange-400 group-hover:animate-pulse" />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            Reset Password
                        </div>
                    </div>
                </div>

                <div className="w-px h-5 bg-slate-700" />

                {/* Clear Selection */}
                <div className="group relative">
                    <button
                        onClick={onClearSelection}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors group"
                    >
                        <X className="w-3 h-3 group-hover:animate-spin" />
                    </button>
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Clear Selection
                    </div>
                </div>

                {/* Processing Indicator */}
                {isActing && (
                    <div className="flex items-center gap-1 text-blue-400 px-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
};
