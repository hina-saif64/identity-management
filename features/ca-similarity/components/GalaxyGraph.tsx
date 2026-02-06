/**
 * GalaxyGraph Component
 * Visualizes Policy Clusters as "Galaxies" where similar policies orbit a central node.
 * Uses pure SVG for zero-dependency rendering.
 */

import React, { useMemo } from 'react';
import { PolicyCluster, SimilarityResult } from '../types/ca-similarity.types';
import { CaPolicy } from '../../ca-exclusions/ca.types';

interface GalaxyGraphProps {
    clusters: PolicyCluster[];
    policies: CaPolicy[];
    onSelectPolicy: (policy: CaPolicy) => void;
    selectedPolicyId: string | null;
}

export const GalaxyGraph: React.FC<GalaxyGraphProps> = ({
    clusters,
    policies,
    onSelectPolicy,
    selectedPolicyId
}) => {
    // 🚀 NASA LEVEL: Enhanced theme logic with conflict detection
    const getTheme = (score: number, hasConflict?: boolean, conflictSeverity?: string) => {
        // 🚨 Conflict themes override similarity themes
        if (hasConflict) {
            if (conflictSeverity === 'CRITICAL') return {
                color: '#dc2626',
                gradient: 'url(#grad-critical)',
                glow: 'rgba(220, 38, 38, 0.8)',
                label: '🚨 CRITICAL CONFLICT'
            };
            if (conflictSeverity === 'HIGH') return {
                color: '#ea580c',
                gradient: 'url(#grad-conflict)',
                glow: 'rgba(234, 88, 12, 0.7)',
                label: '⚠️ HIGH CONFLICT'
            };
            return {
                color: '#f59e0b',
                gradient: 'url(#grad-warning)',
                glow: 'rgba(245, 158, 11, 0.6)',
                label: '⚠️ CONFLICT DETECTED'
            };
        }

        // Original similarity themes
        if (score >= 90) return {
            color: '#ef4444',
            gradient: 'url(#grad-red)',
            glow: 'rgba(239, 68, 68, 0.6)',
            label: '🔥 CRITICAL MATCH'
        };
        if (score >= 70) return {
            color: '#f59e0b',
            gradient: 'url(#grad-orange)',
            glow: 'rgba(245, 158, 11, 0.5)',
            label: '🔶 HIGH SIMILARITY'
        };
        return {
            color: '#06b6d4',
            gradient: 'url(#grad-cyan)',
            glow: 'rgba(6, 182, 212, 0.5)',
            label: '🔗 RELATED'
        };
    };

    // 🧮 Calculate Layout
    const layout = useMemo(() => {
        const nodes: any[] = [];
        const links: any[] = [];
        const width = 1000;
        const height = 600;

        // Dynamic Grid
        const cols = clusters.length > 4 ? 3 : 2;
        const cellW = width / cols;
        const cellH = height / Math.ceil(clusters.length / cols);

        clusters.forEach((cluster, idx) => {
            const cx = (idx % cols) * cellW + cellW / 2;
            const cy = Math.floor(idx / cols) * cellH + cellH / 2;
            const radius = Math.min(cellW, cellH) * 0.3;

            const theme = getTheme(cluster.avgSimilarity);

            // Center Node (Sun)
            nodes.push({
                id: cluster.centerPolicyId,
                x: cx,
                y: cy,
                type: 'center',
                clusterId: cluster.id,
                label: cluster.label,
                theme,
                score: cluster.avgSimilarity
            });

            // Satellite Nodes (Planets)
            const satellites = cluster.members.filter(m => m !== cluster.centerPolicyId);
            satellites.forEach((satId, sIdx) => {
                // Orbital Math
                const orbitRadius = radius * (0.6 + (sIdx % 2) * 0.2); // Vary orbital distance
                const angle = (sIdx / satellites.length) * Math.PI * 2;

                // Static position (fallback)
                const sx = cx + Math.cos(angle) * orbitRadius;
                const sy = cy + Math.sin(angle) * orbitRadius;

                nodes.push({
                    id: satId,
                    x: sx,
                    y: sy,
                    centerX: cx,      // For animation ref
                    centerY: cy,      // For animation ref
                    orbitRadius,      // For animation radius
                    startAngle: angle,// For animation offset
                    type: 'satellite',
                    clusterId: cluster.id,
                    theme
                });

                links.push({
                    source: cluster.centerPolicyId,
                    target: satId,
                    strength: cluster.avgSimilarity,
                    theme
                });
            });
        });

        return { nodes, links };
    }, [clusters]);

    const getPolicyName = (id: string) => policies.find(p => p.id === id)?.displayName || id;

    if (clusters.length === 0) {
        return (
            <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-950/50">
                <div className="w-20 h-20 rounded-full bg-slate-900/50 flex items-center justify-center animate-pulse mb-4">
                    <span className="text-4xl">🌌</span>
                </div>
                <p className="text-slate-400 font-bold">No similarity clusters found.</p>
                <p className="text-slate-600 text-sm">Your galaxy is perfectly balanced.</p>
            </div>
        );
    }

    return (
        <div className="w-full bg-[#0B1121] rounded-3xl border border-slate-800 p-1 relative overflow-hidden shadow-2xl group">

            {/* 🌌 CSS Animations */}
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                    100% { transform: translateY(0px); }
                }
                @keyframes pulse-glow {
                    0% { filter: drop-shadow(0 0 5px currentColor); opacity: 0.8; }
                    50% { filter: drop-shadow(0 0 20px currentColor); opacity: 1; }
                    100% { filter: drop-shadow(0 0 5px currentColor); opacity: 0.8; }
                }
                @keyframes orbit {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes counter-orbit {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(-360deg); }
                }
                .star {
                    animation: float 4s ease-in-out infinite;
                }
            `}</style>

            {/* 🌠 Starry Background */}
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full star" style={{ animationDelay: '0s' }} />
                <div className="absolute top-40 right-20 w-2 h-2 bg-indigo-500 blur-[2px] rounded-full star" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-20 left-1/3 w-1.5 h-1.5 bg-cyan-400 blur-[1px] rounded-full star" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-transparent to-purple-900/10" />
            </div>

            {/* Legend */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700/50">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]"></div>
                    <span className="text-[10px] text-slate-400 font-bold">CRITICAL MATCH (90%+)</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700/50">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]"></div>
                    <span className="text-[10px] text-slate-400 font-bold">HIGH (70%+)</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-lg border border-slate-700/50">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"></div>
                    <span className="text-[10px] text-slate-400 font-bold">RELATED</span>
                </div>
            </div>

            <svg viewBox="0 0 1000 600" className="w-full h-[500px]">
                <defs>
                    <linearGradient id="grad-red" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#b91c1c" />
                    </linearGradient>
                    <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" />
                        <stop offset="100%" stopColor="#0891b2" />
                    </linearGradient>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* 🔗 Links (Orbit Rings in visualization) */}
                {layout.nodes.filter(n => n.type === 'satellite').map((node, i) => (
                    <circle
                        key={`orbit-${i}`}
                        cx={node.centerX}
                        cy={node.centerY}
                        r={node.orbitRadius}
                        fill="none"
                        stroke={node.theme.color}
                        strokeWidth="1"
                        strokeOpacity="0.1"
                        strokeDasharray="4 4"
                    />
                ))}

                {/* 🔭 Nodes */}
                {layout.nodes.map((node) => {
                    const isCenter = node.type === 'center';
                    const isSelected = selectedPolicyId === node.id;
                    const r = isCenter ? 20 : 8;

                    return (
                        <g
                            key={node.id}
                            onClick={() => onSelectPolicy(policies.find(p => p.id === node.id)!)}
                            className="cursor-pointer"
                        >
                            {/* Orbital Group Wrapper for Animation */}
                            {!isCenter && (
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from={`0 ${node.centerX} ${node.centerY}`}
                                    to={`360 ${node.centerX} ${node.centerY}`}
                                    dur={`${20 + (node.orbitRadius / 5)}s`} // Variable speed
                                    repeatCount="indefinite"
                                    additive="sum"
                                />
                            )}

                            {/* Counter-rotate content to keep text upright if we had text inside satellites */}

                            {/* Selection Ring */}
                            {isSelected && (
                                <circle
                                    cx={node.x} cy={node.y} r={r + 8}
                                    fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.5"
                                    className="animate-pulse"
                                />
                            )}

                            {/* Main Body */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={r}
                                fill={node.theme.gradient}
                                stroke="#fff"
                                strokeWidth={isCenter ? 2 : 1}
                                strokeOpacity={0.8}
                                filter="url(#glow)"
                            >
                                {/* Gentle Pulse for Centers */}
                                {isCenter && (
                                    <animate
                                        attributeName="r"
                                        values={`${r};${r + 2};${r}`}
                                        dur="3s"
                                        repeatCount="indefinite"
                                    />
                                )}
                            </circle>

                            {/* Label for Centers */}
                            {isCenter && (
                                <g transform={`translate(${node.x}, ${node.y + 35})`}>
                                    <rect x="-60" y="-10" width="120" height="20" rx="4" fill="rgba(15, 23, 42, 0.7)" />
                                    <text
                                        textAnchor="middle"
                                        fill="#e2e8f0"
                                        fontSize="10"
                                        fontWeight="bold"
                                        dy="4"
                                        className="uppercase tracking-wider font-mono"
                                    >
                                        {node.theme.label} ({Math.round(node.score)}%)
                                    </text>
                                </g>
                            )}

                            {/* Hover Title (Simple browser tooltip for now, clearer than overlapping labels) */}
                            <title>{getPolicyName(node.id)}</title>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
