/**
 * CA Policy Tiles Component
 * Displays all CA policies as clickable cards
 */

import React from 'react';
import { Shield, Users, Layers, Clock } from 'lucide-react';
import { CaPolicy } from './ca.types';
import { PolicyStateBadge } from './PolicyStateBadge';

interface CaPolicyTilesProps {
    policies: CaPolicy[];
    selectedPolicyId: string | null;
    onSelectPolicy: (policy: CaPolicy) => void;
    isLoading: boolean;
}

export const CaPolicyTiles: React.FC<CaPolicyTilesProps> = ({
    policies,
    selectedPolicyId,
    onSelectPolicy,
    isLoading
}) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="animate-pulse bg-slate-800/50 rounded-xl p-4 h-32" />
                ))}
            </div>
        );
    }

    if (policies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Shield className="w-16 h-16 text-slate-600 mb-4" />
                <h3 className="text-lg font-bold text-slate-400">No Conditional Access Policies</h3>
                <p className="text-sm text-slate-500 mt-1">No policies found in your tenant</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((policy) => {
                const isSelected = selectedPolicyId === policy.id;
                const totalExclusions = policy.excludedUsersCount + policy.excludedGroupsCount;

                return (
                    <button
                        key={policy.id}
                        onClick={() => onSelectPolicy(policy)}
                        className={`
              relative p-4 rounded-xl border text-left transition-all
              ${isSelected
                                ? 'bg-indigo-600/20 border-indigo-500/50 ring-2 ring-indigo-500/30'
                                : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600'
                            }
            `}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${policy.state === 'Enabled' ? 'bg-emerald-500/20' : 'bg-slate-700/50'}
                `}>
                                    <Shield className={`w-4 h-4 ${policy.state === 'Enabled' ? 'text-emerald-400' : 'text-slate-500'}`} />
                                </div>
                                <PolicyStateBadge state={policy.state} />
                            </div>
                        </div>

                        {/* Policy Name */}
                        <h3 className="text-sm font-bold text-white mb-2 line-clamp-2">
                            {policy.displayName}
                        </h3>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                            <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                <span>{policy.excludedUsersCount} users</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5" />
                                <span>{policy.excludedGroupsCount} groups</span>
                            </div>
                        </div>

                        {/* Total badge */}
                        {totalExclusions > 0 && (
                            <div className="absolute top-3 right-3">
                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-full">
                                    {totalExclusions} excluded
                                </span>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export default CaPolicyTiles;
