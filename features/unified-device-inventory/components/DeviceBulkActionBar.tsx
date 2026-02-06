/**
 * Device Bulk Action Bar Component
 * Similar to User Intelligence action bar but for devices
 */

import React from 'react';
import { X, Monitor, Trash2, Move, Loader2, CheckSquare, Ban } from 'lucide-react';

interface DeviceBulkActionBarProps {
    selectedCount: number;
    onAction: (action: string) => void;
    onClearSelection: () => void;
    isActing: boolean;
}

export const DeviceBulkActionBar: React.FC<DeviceBulkActionBarProps> = ({
    selectedCount,
    onAction,
    onClearSelection,
    isActing,
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-1.5 flex items-center gap-2">
                {/* Selection Counter */}
                <div className="flex items-center gap-1.5 text-white px-1">
                    <CheckSquare className="w-3 h-3 text-indigo-400" />
                    <span className="text-[9px] font-bold">{selectedCount}</span>
                </div>

                <div className="w-px h-5 bg-slate-700" />

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Disable */}
                    <div className="group relative">
                        <button
                            onClick={() => onAction('disable')}
                            disabled={isActing}
                            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                        >
                            <Ban className="w-4 h-4 text-orange-500 group-hover:text-orange-400 group-hover:animate-pulse" />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Disable Devices
                        </div>
                    </div>

                    {/* Delete */}
                    <div className="group relative">
                        <button
                            onClick={() => onAction('delete')}
                            disabled={isActing}
                            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                        >
                            <Trash2 className="w-4 h-4 text-red-500 group-hover:text-red-400 group-hover:animate-bounce" />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Delete Devices
                        </div>
                    </div>

                    {/* Move to OU */}
                    <div className="group relative">
                        <button
                            onClick={() => onAction('move')}
                            disabled={isActing}
                            className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                        >
                            <Move className="w-4 h-4 text-blue-500 group-hover:text-blue-400 group-hover:animate-spin" />
                        </button>
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Move to OU
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