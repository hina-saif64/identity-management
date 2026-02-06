/**
 * Policy State Badge Component
 */

import React from 'react';
import { PolicyState } from './ca.types';

interface PolicyStateBadgeProps {
    state: PolicyState;
}

export const PolicyStateBadge: React.FC<PolicyStateBadgeProps> = ({ state }) => {
    const config = {
        'Enabled': {
            bg: 'bg-emerald-500/20',
            text: 'text-emerald-400',
            border: 'border-emerald-500/30',
            label: 'Enabled'
        },
        'Disabled': {
            bg: 'bg-slate-500/20',
            text: 'text-slate-400',
            border: 'border-slate-500/30',
            label: 'Disabled'
        },
        'Report-only': {
            bg: 'bg-amber-500/20',
            text: 'text-amber-400',
            border: 'border-amber-500/30',
            label: 'Report-only'
        }
    };

    const style = config[state] || config['Disabled'];

    return (
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${style.bg} ${style.text} ${style.border}`}>
            {style.label}
        </span>
    );
};

export default PolicyStateBadge;
