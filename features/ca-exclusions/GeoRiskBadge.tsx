/**
 * Geo Risk Badge Component
 */

import React from 'react';
import { GeoRisk } from './ca.types';

interface GeoRiskBadgeProps {
    risk: GeoRisk;
    country?: string | null;
}

export const GeoRiskBadge: React.FC<GeoRiskBadgeProps> = ({ risk, country }) => {
    const config = {
        'GREEN': {
            bg: 'bg-emerald-500/20',
            text: 'text-emerald-400',
            border: 'border-emerald-500/30',
            emoji: '🟢',
            label: country || 'UAE/KSA'
        },
        'ORANGE': {
            bg: 'bg-orange-500/20',
            text: 'text-orange-400',
            border: 'border-orange-500/30',
            emoji: '🟠',
            label: country || 'Other'
        },
        'GRAY': {
            bg: 'bg-slate-500/20',
            text: 'text-slate-400',
            border: 'border-slate-500/30',
            emoji: '⚪',
            label: 'No data'
        }
    };

    const style = config[risk] || config['GRAY'];

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${style.bg} ${style.text} ${style.border}`}>
            <span>{style.emoji}</span>
            <span>{style.label}</span>
        </span>
    );
};

export default GeoRiskBadge;
