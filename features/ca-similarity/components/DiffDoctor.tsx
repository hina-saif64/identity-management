/**
 * Diff Doctor Component
 * Visualizes the difference between two policies side-by-side.
 * Highlights unique elements in Red/Green and shared elements in Gray.
 */

import React from 'react';
import { PolicyVector, JaccardScore } from '../types/ca-similarity.types';
import { ArrowRight, Check, X, Shield, Lock, Globe } from 'lucide-react';

interface DiffDoctorProps {
    source: PolicyVector;
    target: PolicyVector;
    score: JaccardScore;
}

export const DiffDoctor: React.FC<DiffDoctorProps> = ({ source, target, score }) => {

    // Helper to render comparison rows
    const renderRow = (label: string, icon: any, sourceItems: string[], targetItems: string[]) => {
        const sourceSet = new Set(sourceItems);
        const targetSet = new Set(targetItems);

        const shared = [...sourceSet].filter(x => targetSet.has(x));
        const uniqueSource = [...sourceSet].filter(x => !targetSet.has(x));
        const uniqueTarget = [...targetSet].filter(x => !sourceSet.has(x));

        return (
            <div className="grid grid-cols-12 gap-4 py-4 border-b border-dashed border-slate-800/50 last:border-0">
                <div className="col-span-2 flex items-start gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                    {React.createElement(icon, { className: "w-4 h-4" })}
                    {label}
                </div>

                {/* Source Side */}
                <div className="col-span-4 space-y-2">
                    {uniqueSource.map((item, i) => (
                        <div key={i} className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-xs border border-indigo-500/20 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {item}
                        </div>
                    ))}
                    {shared.map((item, i) => (
                        <div key={`s-${i}`} className="px-2 py-1 rounded bg-slate-800/30 text-slate-500 text-xs flex items-center gap-2">
                            <Check className="w-3 h-3 opacity-50" />
                            {item}
                        </div>
                    ))}
                    {uniqueSource.length === 0 && shared.length === 0 && <span className="text-xs text-slate-600 italic">None</span>}
                </div>

                {/* Divider */}
                <div className="col-span-2 flex justify-center items-center">
                    <ArrowRight className="w-4 h-4 text-slate-700" />
                </div>

                {/* Target Side */}
                <div className="col-span-4 space-y-2">
                    {uniqueTarget.map((item, i) => (
                        <div key={i} className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            {item}
                        </div>
                    ))}
                    {shared.map((item, i) => (
                        <div key={`t-${i}`} className="px-2 py-1 rounded bg-slate-800/30 text-slate-500 text-xs flex items-center gap-2">
                            <Check className="w-3 h-3 opacity-50" />
                            {item}
                        </div>
                    ))}
                    {uniqueTarget.length === 0 && shared.length === 0 && <span className="text-xs text-slate-600 italic">None</span>}
                </div>
            </div>
        );
    };

    return (
        <div className="border border-slate-800 rounded-3xl bg-slate-900/30 overflow-hidden">
            <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Diff Doctor Analysis</h3>
                    <div className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-[10px] font-black text-white">
                        {score.total}% Match
                    </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                    Use this to identify redundancy gaps
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-12 gap-4 mb-6 border-b border-slate-700 pb-4">
                    <div className="col-span-2"></div>
                    <div className="col-span-4 text-xs font-bold text-indigo-400 uppercase tracking-wider">{source.displayName}</div>
                    <div className="col-span-2"></div>
                    <div className="col-span-4 text-xs font-bold text-purple-400 uppercase tracking-wider">{target.displayName}</div>
                </div>

                {renderRow("Grant Controls", Lock, source.controls.grant, target.controls.grant)}
                {renderRow("Users & Groups", Globe, source.users, target.users)}
                {renderRow("Applications", Shield, source.apps, target.apps)}
                {renderRow("Conditions", Shield, [
                    ...source.conditions.locations,
                    ...source.conditions.platforms
                ], [
                    ...target.conditions.locations,
                    ...target.conditions.platforms
                ])}
            </div>
        </div>
    );
};
