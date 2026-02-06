/**
 * Remove Exclusion Modal - Confirmation Dialog
 */

import React, { useState } from 'react';
import { AlertTriangle, X, Loader2, Shield, UserMinus } from 'lucide-react';
import { CaPolicy, ExcludedUser } from './ca.types';

interface RemoveExclusionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    policy: CaPolicy;
    selectedUsers: ExcludedUser[];
}

export const RemoveExclusionModal: React.FC<RemoveExclusionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    policy,
    selectedUsers
}) => {
    const [isRemoving, setIsRemoving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsRemoving(true);
        setError(null);
        try {
            await onConfirm();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to remove exclusions');
        } finally {
            setIsRemoving(false);
        }
    };

    const directUsers = selectedUsers.filter(u => u.exclusionType === 'Direct');
    const groupBasedUsers = selectedUsers.filter(u => u.exclusionType === 'Group-based');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                            <UserMinus className="w-5 h-5 text-red-400" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Remove Exclusions</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isRemoving}
                        className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Warning */}
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-400">Important Warning</p>
                            <p className="text-xs text-amber-400/80 mt-1">
                                Removing users from exclusions means they will be subject to this Conditional Access policy.
                                {policy.state === 'Enabled' && (
                                    <strong> This policy is ENABLED and will immediately affect these users.</strong>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Policy Info */}
                    <div className="p-4 bg-slate-800/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            <span className="text-sm font-bold text-white">{policy.displayName}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${policy.state === 'Enabled' ? 'bg-emerald-500/20 text-emerald-400' :
                                policy.state === 'Disabled' ? 'bg-slate-500/20 text-slate-400' :
                                    'bg-amber-500/20 text-amber-400'
                            }`}>
                            {policy.state}
                        </span>
                    </div>

                    {/* Users to remove */}
                    <div>
                        <p className="text-sm text-slate-400 mb-2">Users to remove from exclusions:</p>
                        <div className="max-h-40 overflow-y-auto bg-slate-800/30 rounded-lg p-3 space-y-1">
                            {directUsers.map(user => (
                                <div key={user.id} className="flex items-center gap-2 text-xs">
                                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[9px]">Direct</span>
                                    <span className="text-slate-300">{user.displayName}</span>
                                    <span className="text-slate-500">({user.userPrincipalName})</span>
                                </div>
                            ))}
                            {groupBasedUsers.map(user => (
                                <div key={user.id} className="flex items-center gap-2 text-xs opacity-50">
                                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[9px]">Group</span>
                                    <span className="text-slate-300 line-through">{user.displayName}</span>
                                    <span className="text-red-400 text-[9px]">(Cannot remove)</span>
                                </div>
                            ))}
                        </div>
                        {groupBasedUsers.length > 0 && (
                            <p className="text-xs text-red-400 mt-2">
                                ⚠️ {groupBasedUsers.length} group-based exclusion(s) cannot be removed directly. Remove them from the Azure AD group instead.
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isRemoving}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isRemoving || directUsers.length === 0}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isRemoving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Removing...
                            </>
                        ) : (
                            <>
                                <UserMinus className="w-4 h-4" />
                                Remove {directUsers.length} User{directUsers.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RemoveExclusionModal;
