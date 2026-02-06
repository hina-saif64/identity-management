/**
 * 🦕 DINO STEP: Working Similarity Engine with existing data
 * Compares policies using available fields only
 */

import React, { useState, useMemo } from 'react';
import { CaPolicy } from '../../ca-exclusions/ca.types';
import { Search, Shield, AlertTriangle, CheckCircle, Settings, GitCompare, TrendingUp } from 'lucide-react';

interface SimilarityDashboardProps {
    policies: CaPolicy[];
    addLog: (message: string, module: string, level?: string) => void;
}

// 🚀 DEEP POLICY ANALYSIS: Compare ALL actual policy settings
const calculatePolicySimilarity = (policy1: CaPolicy, policy2: CaPolicy): number => {
    // Check if policies have any meaningful data
    const policy1HasData = hasRealPolicyData(policy1);
    const policy2HasData = hasRealPolicyData(policy2);
    
    // If neither policy has real data, they're not similar - they're just empty
    if (!policy1HasData && !policy2HasData) {
        return 0;
    }
    
    let similarity = 0;
    let totalWeight = 0;

    // 1. Grant Controls Similarity (35% weight - MOST IMPORTANT!)
    const grantSimilarity = calculateGrantControlsSimilarity(policy1, policy2);
    similarity += grantSimilarity * 35;
    totalWeight += 35;

    // 2. Application Conditions (20% weight)
    const appSimilarity = calculateApplicationSimilarity(policy1, policy2);
    similarity += appSimilarity * 20;
    totalWeight += 20;

    // 3. User/Group/Role Conditions (20% weight)
    const userSimilarity = calculateUserConditionsSimilarity(policy1, policy2);
    similarity += userSimilarity * 20;
    totalWeight += 20;

    // 4. Location & Platform Conditions (10% weight)
    const locationSimilarity = calculateArraySimilarity(
        policy1.locationConditions?.includeLocations || [],
        policy2.locationConditions?.includeLocations || []
    );
    const platformSimilarity = calculateArraySimilarity(
        policy1.platformConditions?.includePlatforms || [],
        policy2.platformConditions?.includePlatforms || []
    );
    similarity += ((locationSimilarity + platformSimilarity) / 2) * 10;
    totalWeight += 10;

    // 5. Risk Levels & Client Apps (10% weight)
    const riskSimilarity = calculateRiskLevelsSimilarity(policy1, policy2);
    const clientAppSimilarity = calculateArraySimilarity(
        policy1.clientAppTypes || [],
        policy2.clientAppTypes || []
    );
    similarity += ((riskSimilarity + clientAppSimilarity) / 2) * 10;
    totalWeight += 10;

    // 6. State Similarity (5% weight - least important)
    if (policy1.state === policy2.state) similarity += 5;
    totalWeight += 5;

    return Math.round((similarity / totalWeight) * 100);
};

// 🔍 Helper function to check if a policy has meaningful data
const hasRealPolicyData = (policy: CaPolicy): boolean => {
    const grant = policy.grantControls || {};
    const app = policy.applicationConditions || {};
    const user = policy.userConditions || {};
    const location = policy.locationConditions || {};
    const platform = policy.platformConditions || {};
    const risk = policy.riskLevels || {};
    
    return (
        (grant.builtInControls && grant.builtInControls.length > 0) ||
        (app.includeApplications && app.includeApplications.length > 0) ||
        (app.excludeApplications && app.excludeApplications.length > 0) ||
        (user.includeUsers && user.includeUsers.length > 0) ||
        (user.excludeUsers && user.excludeUsers.length > 0) ||
        (user.includeGroups && user.includeGroups.length > 0) ||
        (user.excludeGroups && user.excludeGroups.length > 0) ||
        (user.includeRoles && user.includeRoles.length > 0) ||
        (location.includeLocations && location.includeLocations.length > 0) ||
        (platform.includePlatforms && platform.includePlatforms.length > 0) ||
        (risk.signInRiskLevels && risk.signInRiskLevels.length > 0) ||
        (policy.clientAppTypes && policy.clientAppTypes.length > 0) ||
        policy.excludedUsersCount > 0 ||
        policy.excludedGroupsCount > 0
    );
};

// 🔐 Grant Controls Deep Comparison (The Heart of CA Policies)
const calculateGrantControlsSimilarity = (policy1: CaPolicy, policy2: CaPolicy): number => {
    const grant1 = policy1.grantControls || {};
    const grant2 = policy2.grantControls || {};
    
    let similarity = 0;
    let components = 0;
    
    // Compare operator (AND vs OR)
    if (grant1.operator === grant2.operator) similarity += 1;
    components += 1;
    
    // Compare built-in controls (MFA, Block, etc.)
    const builtInSimilarity = calculateArraySimilarity(
        grant1.builtInControls || [],
        grant2.builtInControls || []
    );
    similarity += builtInSimilarity;
    components += 1;
    
    // Compare custom authentication factors
    const customSimilarity = calculateArraySimilarity(
        grant1.customAuthenticationFactors || [],
        grant2.customAuthenticationFactors || []
    );
    similarity += customSimilarity;
    components += 1;
    
    // Compare terms of use
    const termsSimilarity = calculateArraySimilarity(
        grant1.termsOfUse || [],
        grant2.termsOfUse || []
    );
    similarity += termsSimilarity;
    components += 1;
    
    return components > 0 ? similarity / components : 0;
};

// 📱 Application Conditions Deep Comparison
const calculateApplicationSimilarity = (policy1: CaPolicy, policy2: CaPolicy): number => {
    const app1 = policy1.applicationConditions || {};
    const app2 = policy2.applicationConditions || {};
    
    let similarity = 0;
    let components = 0;
    
    // Include applications
    const includeSimilarity = calculateArraySimilarity(
        app1.includeApplications || [],
        app2.includeApplications || []
    );
    similarity += includeSimilarity;
    components += 1;
    
    // Exclude applications
    const excludeSimilarity = calculateArraySimilarity(
        app1.excludeApplications || [],
        app2.excludeApplications || []
    );
    similarity += excludeSimilarity;
    components += 1;
    
    // User actions
    const actionsSimilarity = calculateArraySimilarity(
        app1.includeUserActions || [],
        app2.includeUserActions || []
    );
    similarity += actionsSimilarity;
    components += 1;
    
    return components > 0 ? similarity / components : 0;
};

// 👥 User Conditions Deep Comparison
const calculateUserConditionsSimilarity = (policy1: CaPolicy, policy2: CaPolicy): number => {
    const user1 = policy1.userConditions || {};
    const user2 = policy2.userConditions || {};
    
    let similarity = 0;
    let components = 0;
    
    // Include users
    const includeUsersSimilarity = calculateArraySimilarity(
        user1.includeUsers || [],
        user2.includeUsers || []
    );
    similarity += includeUsersSimilarity;
    components += 1;
    
    // Exclude users
    const excludeUsersSimilarity = calculateArraySimilarity(
        user1.excludeUsers || [],
        user2.excludeUsers || []
    );
    similarity += excludeUsersSimilarity;
    components += 1;
    
    // Include groups
    const includeGroupsSimilarity = calculateArraySimilarity(
        user1.includeGroups || [],
        user2.includeGroups || []
    );
    similarity += includeGroupsSimilarity;
    components += 1;
    
    // Exclude groups
    const excludeGroupsSimilarity = calculateArraySimilarity(
        user1.excludeGroups || [],
        user2.excludeGroups || []
    );
    similarity += excludeGroupsSimilarity;
    components += 1;
    
    // Include roles
    const includeRolesSimilarity = calculateArraySimilarity(
        user1.includeRoles || [],
        user2.includeRoles || []
    );
    similarity += includeRolesSimilarity;
    components += 1;
    
    return components > 0 ? similarity / components : 0;
};

// ⚠️ Risk Levels Deep Comparison
const calculateRiskLevelsSimilarity = (policy1: CaPolicy, policy2: CaPolicy): number => {
    const risk1 = policy1.riskLevels || {};
    const risk2 = policy2.riskLevels || {};
    
    let similarity = 0;
    let components = 0;
    
    // Sign-in risk levels
    const signInRiskSimilarity = calculateArraySimilarity(
        risk1.signInRiskLevels || [],
        risk2.signInRiskLevels || []
    );
    similarity += signInRiskSimilarity;
    components += 1;
    
    // User risk levels
    const userRiskSimilarity = calculateArraySimilarity(
        risk1.userRiskLevels || [],
        risk2.userRiskLevels || []
    );
    similarity += userRiskSimilarity;
    components += 1;
    
    // Service principal risk levels
    const spRiskSimilarity = calculateArraySimilarity(
        risk1.servicePrincipalRiskLevels || [],
        risk2.servicePrincipalRiskLevels || []
    );
    similarity += spRiskSimilarity;
    components += 1;
    
    return components > 0 ? similarity / components : 0;
};

// Helper function to calculate similarity between two arrays
const calculateArraySimilarity = (arr1: string[], arr2: string[]): number => {
    // 🐛 FIX: If both arrays are empty, they're not similar - they just have no data
    if (arr1.length === 0 && arr2.length === 0) return 0; // Changed from 1 to 0
    if (arr1.length === 0 || arr2.length === 0) return 0; // One empty = 0% similar
    
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
};

// 🦕 DINO: Find similar policies with performance optimization
const findSimilarPolicies = (policies: CaPolicy[], threshold: number = 60) => {
    const similarities = [];
    
    // Limit to prevent performance issues
    const maxPolicies = Math.min(policies.length, 100);
    const limitedPolicies = policies.slice(0, maxPolicies);
    
    for (let i = 0; i < limitedPolicies.length; i++) {
        for (let j = i + 1; j < limitedPolicies.length; j++) {
            const similarity = calculatePolicySimilarity(limitedPolicies[i], limitedPolicies[j]);
            if (similarity >= threshold) {
                similarities.push({
                    policy1: limitedPolicies[i],
                    policy2: limitedPolicies[j],
                    similarity,
                    reasons: getSimilarityReasons(limitedPolicies[i], limitedPolicies[j])
                });
            }
        }
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity);
};

// 🦕 DINO: Get detailed similarity reasons with REAL policy analysis
const getSimilarityReasons = (policy1: CaPolicy, policy2: CaPolicy): string[] => {
    const reasons = [];
    
    // State comparison
    if (policy1.state === policy2.state) {
        reasons.push(`Both policies are ${policy1.state}`);
    }
    
    // Grant Controls comparison (MOST IMPORTANT)
    const grant1 = policy1.grantControls || {};
    const grant2 = policy2.grantControls || {};
    
    if (grant1.operator === grant2.operator) {
        reasons.push(`Same grant operator: ${grant1.operator}`);
    }
    
    const builtInControls1 = grant1.builtInControls || [];
    const builtInControls2 = grant2.builtInControls || [];
    const commonControls = builtInControls1.filter(c => builtInControls2.includes(c));
    
    if (commonControls.length > 0) {
        reasons.push(`Shared grant controls: ${commonControls.join(', ')}`);
    }
    
    // Application comparison
    const app1 = policy1.applicationConditions || {};
    const app2 = policy2.applicationConditions || {};
    const commonApps = (app1.includeApplications || []).filter(app => 
        (app2.includeApplications || []).includes(app)
    );
    
    if (commonApps.length > 0) {
        reasons.push(`${commonApps.length} shared applications`);
    }
    
    // User conditions comparison
    const user1 = policy1.userConditions || {};
    const user2 = policy2.userConditions || {};
    
    const commonIncludeUsers = (user1.includeUsers || []).filter(u => 
        (user2.includeUsers || []).includes(u)
    );
    const commonIncludeGroups = (user1.includeGroups || []).filter(g => 
        (user2.includeGroups || []).includes(g)
    );
    const commonRoles = (user1.includeRoles || []).filter(r => 
        (user2.includeRoles || []).includes(r)
    );
    
    if (commonIncludeUsers.length > 0) {
        reasons.push(`${commonIncludeUsers.length} shared target users`);
    }
    if (commonIncludeGroups.length > 0) {
        reasons.push(`${commonIncludeGroups.length} shared target groups`);
    }
    if (commonRoles.length > 0) {
        reasons.push(`${commonRoles.length} shared target roles`);
    }
    
    // Exclusions comparison (legacy support)
    const p1ExclusionTotal = policy1.excludedUsersCount + policy1.excludedGroupsCount;
    const p2ExclusionTotal = policy2.excludedUsersCount + policy2.excludedGroupsCount;
    
    if (p1ExclusionTotal === p2ExclusionTotal && p1ExclusionTotal > 0) {
        reasons.push(`Same exclusion count: ${p1ExclusionTotal}`);
    }
    
    // Platform comparison
    const platform1 = policy1.platformConditions || {};
    const platform2 = policy2.platformConditions || {};
    const commonPlatforms = (platform1.includePlatforms || []).filter(p => 
        (platform2.includePlatforms || []).includes(p)
    );
    
    if (commonPlatforms.length > 0) {
        reasons.push(`${commonPlatforms.length} shared platforms`);
    }
    
    // Risk levels comparison
    const risk1 = policy1.riskLevels || {};
    const risk2 = policy2.riskLevels || {};
    const commonSignInRisks = (risk1.signInRiskLevels || []).filter(r => 
        (risk2.signInRiskLevels || []).includes(r)
    );
    const commonUserRisks = (risk1.userRiskLevels || []).filter(r => 
        (risk2.userRiskLevels || []).includes(r)
    );
    
    if (commonSignInRisks.length > 0) {
        reasons.push(`Shared sign-in risks: ${commonSignInRisks.join(', ')}`);
    }
    if (commonUserRisks.length > 0) {
        reasons.push(`Shared user risks: ${commonUserRisks.join(', ')}`);
    }
    
    // Client app types
    const commonClientApps = (policy1.clientAppTypes || []).filter(c => 
        (policy2.clientAppTypes || []).includes(c)
    );
    
    if (commonClientApps.length > 0) {
        reasons.push(`${commonClientApps.length} shared client app types`);
    }
    
    // If no specific reasons found, provide generic feedback
    if (reasons.length === 0) {
        reasons.push('Policies have some structural similarities');
    }
    
    return reasons;
};

export const SimilarityDashboard: React.FC<SimilarityDashboardProps> = ({ policies, addLog }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPolicy, setSelectedPolicy] = useState<CaPolicy | null>(null);
    const [similarityThreshold, setSimilarityThreshold] = useState(60);
    const [activeFilter, setActiveFilter] = useState<string>('all'); // 🎯 NEW: Active filter state
    const [comparisonPolicies, setComparisonPolicies] = useState<{policy1: CaPolicy, policy2: CaPolicy, similarity: any} | null>(null); // 🎯 NEW: Comparison state

    // 🔧 FIX: Remove addLog from dependencies to prevent infinite loop
    const similarityAnalysis = useMemo(() => {
        if (policies.length < 2) return [];
        
        // Log analysis start
        console.log(`� DeeUp Policy Analysis: Analyzing ${Math.min(policies.length, 100)} policies`);
        const startTime = performance.now();
        
        const similarities = findSimilarPolicies(policies, similarityThreshold);
        
        const endTime = performance.now();
        console.log(`✅ Found ${similarities.length} similar policy pairs in ${Math.round(endTime - startTime)}ms`);
        
        return similarities;
    }, [policies, similarityThreshold]); // 🔧 REMOVED addLog from dependencies

    // 🎯 NEW: Smart filtering based on active filter and search
    const filteredPolicies = useMemo(() => {
        let filtered = policies;
        
        // Apply filter
        switch (activeFilter) {
            case 'enabled':
                filtered = policies.filter(p => p.state === 'Enabled');
                break;
            case 'disabled':
                filtered = policies.filter(p => p.state === 'Disabled');
                break;
            case 'report':
                filtered = policies.filter(p => p.state === 'Report-only');
                break;
            case 'exclusions':
                filtered = policies.filter(p => p.excludedUsersCount > 0 || p.excludedGroupsCount > 0);
                break;
            case 'similar':
                const similarPolicyIds = new Set();
                similarityAnalysis.forEach(s => {
                    similarPolicyIds.add(s.policy1.id);
                    similarPolicyIds.add(s.policy2.id);
                });
                filtered = policies.filter(p => similarPolicyIds.has(p.id));
                break;
            case 'high-match':
                const highMatchIds = new Set();
                similarityAnalysis.filter(s => s.similarity >= 80).forEach(s => {
                    highMatchIds.add(s.policy1.id);
                    highMatchIds.add(s.policy2.id);
                });
                filtered = policies.filter(p => highMatchIds.has(p.id));
                break;
            default:
                filtered = policies;
        }
        
        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(policy => 
                policy.displayName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        return filtered;
    }, [policies, activeFilter, searchTerm, similarityAnalysis]);

    // 🦕 DINO: Enhanced stats
    const stats = {
        total: policies.length,
        enabled: policies.filter(p => p.state === 'Enabled').length,
        disabled: policies.filter(p => p.state === 'Disabled').length,
        reportOnly: policies.filter(p => p.state === 'Report-only').length,
        withExclusions: policies.filter(p => p.excludedUsersCount > 0 || p.excludedGroupsCount > 0).length,
        similarPairs: similarityAnalysis.length,
        highSimilarity: similarityAnalysis.filter(s => s.similarity >= 80).length
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* 🦕 DINO: Working Status */}
            <div className="bg-green-900/20 border border-green-800 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-6 h-6 text-green-400" />
                    <h2 className="text-xl font-bold text-green-400">🚀 Deep Policy Analysis Engine - ACTIVE</h2>
                </div>
                <div className="bg-green-950/50 border border-green-800 rounded-xl p-4">
                    <h3 className="font-bold text-green-300 mb-2">🎯 REAL Policy Comparison Features:</h3>
                    <ul className="text-green-200 text-sm space-y-1">
                        <li>• ✅ Grant Controls Analysis (MFA, Block, Allow) - 35% weight</li>
                        <li>• ✅ Application Conditions (Include/Exclude Apps) - 20% weight</li>
                        <li>• ✅ User/Group/Role Conditions (Complete targeting) - 20% weight</li>
                        <li>• ✅ Location & Platform Conditions - 10% weight</li>
                        <li>• ✅ Risk Levels & Client App Types - 10% weight</li>
                        <li>• ✅ State Comparison (Enabled/Disabled) - 5% weight</li>
                        <li>• ✅ Detailed similarity reasons with actual policy data</li>
                    </ul>
                </div>
            </div>

            {/* 🦕 DINO: Enhanced Header with Real Stats */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Shield className="w-6 h-6 text-blue-400" />
                            Policy Similarity Analysis
                        </h2>
                        <p className="text-slate-400 mt-1">
                            Intelligent analysis of {policies.length} Conditional Access policies
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-blue-400">{stats.similarPairs}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider">Similar Pairs Found</div>
                    </div>
                </div>

                {/* 🎯 NEW: Interactive Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div 
                        onClick={() => setActiveFilter('all')}
                        className={`bg-slate-800/50 border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-700/50 ${
                            activeFilter === 'all' ? 'border-white ring-2 ring-white/20' : 'border-slate-700'
                        }`}
                    >
                        <div className="text-2xl font-bold text-white">{stats.total}</div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider">Total</div>
                    </div>
                    <div 
                        onClick={() => setActiveFilter('enabled')}
                        className={`bg-green-900/20 border rounded-xl p-4 cursor-pointer transition-all hover:bg-green-900/30 ${
                            activeFilter === 'enabled' ? 'border-green-400 ring-2 ring-green-400/20' : 'border-green-800'
                        }`}
                    >
                        <div className="text-2xl font-bold text-green-400">{stats.enabled}</div>
                        <div className="text-xs text-green-400 uppercase tracking-wider">Enabled</div>
                    </div>
                    <div 
                        onClick={() => setActiveFilter('disabled')}
                        className={`bg-red-900/20 border rounded-xl p-4 cursor-pointer transition-all hover:bg-red-900/30 ${
                            activeFilter === 'disabled' ? 'border-red-400 ring-2 ring-red-400/20' : 'border-red-800'
                        }`}
                    >
                        <div className="text-2xl font-bold text-red-400">{stats.disabled}</div>
                        <div className="text-xs text-red-400 uppercase tracking-wider">Disabled</div>
                    </div>
                    <div 
                        onClick={() => setActiveFilter('exclusions')}
                        className={`bg-purple-900/20 border rounded-xl p-4 cursor-pointer transition-all hover:bg-purple-900/30 ${
                            activeFilter === 'exclusions' ? 'border-purple-400 ring-2 ring-purple-400/20' : 'border-purple-800'
                        }`}
                    >
                        <div className="text-2xl font-bold text-purple-400">{stats.withExclusions}</div>
                        <div className="text-xs text-purple-400 uppercase tracking-wider">Exclusions</div>
                    </div>
                    <div 
                        onClick={() => setActiveFilter('similar')}
                        className={`bg-blue-900/20 border rounded-xl p-4 cursor-pointer transition-all hover:bg-blue-900/30 ${
                            activeFilter === 'similar' ? 'border-blue-400 ring-2 ring-blue-400/20' : 'border-blue-800'
                        }`}
                    >
                        <div className="text-2xl font-bold text-blue-400">{stats.similarPairs}</div>
                        <div className="text-xs text-blue-400 uppercase tracking-wider">Similar</div>
                    </div>
                    <div 
                        onClick={() => setActiveFilter('high-match')}
                        className={`bg-orange-900/20 border rounded-xl p-4 cursor-pointer transition-all hover:bg-orange-900/30 ${
                            activeFilter === 'high-match' ? 'border-orange-400 ring-2 ring-orange-400/20' : 'border-orange-800'
                        }`}
                    >
                        <div className="text-2xl font-bold text-orange-400">{stats.highSimilarity}</div>
                        <div className="text-xs text-orange-400 uppercase tracking-wider">High Match</div>
                    </div>
                </div>
            </div>

            {/* 🎯 NEW: Enhanced Controls Bar with Filter Status */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search policies by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-400">Similarity Threshold:</label>
                        <select
                            value={similarityThreshold}
                            onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                        >
                            <option value={40}>40% - Low</option>
                            <option value={60}>60% - Medium</option>
                            <option value={80}>80% - High</option>
                        </select>
                    </div>
                    {activeFilter !== 'all' && (
                        <button
                            onClick={() => setActiveFilter('all')}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                        >
                            Clear Filter
                        </button>
                    )}
                </div>
                {activeFilter !== 'all' && (
                    <div className="mt-3 px-3 py-2 bg-blue-900/20 border border-blue-800 rounded-lg">
                        <span className="text-blue-400 text-sm font-medium">
                            Active Filter: {activeFilter.replace('-', ' ').toUpperCase()} 
                            <span className="text-blue-300 ml-2">({filteredPolicies.length} policies)</span>
                        </span>
                    </div>
                )}
            </div>

            {/* 🦕 DINO: Similarity Results */}
            {similarityAnalysis.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <GitCompare className="w-5 h-5 text-blue-400" />
                            Similar Policy Pairs
                        </h3>
                        <p className="text-slate-400 text-sm">Policies with {similarityThreshold}%+ similarity</p>
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                        <div className="divide-y divide-slate-800">
                            {similarityAnalysis.map((similarity, index) => (
                                <div 
                                    key={index} 
                                    className="p-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
                                    onClick={() => setComparisonPolicies(similarity)} // 🎯 NEW: Click to compare
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${
                                                similarity.similarity >= 80 ? 'bg-red-500/20 text-red-400' :
                                                similarity.similarity >= 70 ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {similarity.similarity}% Match
                                            </div>
                                            <TrendingUp className="w-4 h-4 text-slate-400" />
                                            <span className="text-xs text-slate-500">Click to compare</span> {/* 🎯 NEW: Hint */}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        <div>
                                            <div className="font-medium text-white text-sm">{similarity.policy1.displayName}</div>
                                            <div className="text-xs text-slate-400">{similarity.policy1.state}</div>
                                        </div>
                                        <div>
                                            <div className="font-medium text-white text-sm">{similarity.policy2.displayName}</div>
                                            <div className="text-xs text-slate-400">{similarity.policy2.state}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {similarity.reasons.join(' • ')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 🦕 DINO: Policy List */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white">Conditional Access Policies</h3>
                    <p className="text-slate-400 text-sm">Click on a policy to view details</p>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                    {filteredPolicies.length === 0 ? (
                        <div className="p-8 text-center">
                            <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">No policies found matching your search</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {filteredPolicies.map((policy) => (
                                <div
                                    key={policy.id}
                                    onClick={() => setSelectedPolicy(policy)}
                                    className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors ${
                                        selectedPolicy?.id === policy.id ? 'bg-blue-900/20 border-l-4 border-blue-500' : ''
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-white">{policy.displayName}</h4>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                                <span>State: {policy.state}</span>
                                                <span>Created: {new Date(policy.createdDateTime).toLocaleDateString()}</span>
                                                {policy.excludedUsersCount > 0 && (
                                                    <span className="text-purple-400">
                                                        {policy.excludedUsersCount} excluded users
                                                    </span>
                                                )}
                                                {policy.excludedGroupsCount > 0 && (
                                                    <span className="text-purple-400">
                                                        {policy.excludedGroupsCount} excluded groups
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {policy.state === 'Enabled' && (
                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                            )}
                                            {policy.state === 'Disabled' && (
                                                <AlertTriangle className="w-5 h-5 text-red-400" />
                                            )}
                                            {policy.state === 'Report-only' && (
                                                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 🦕 DINO: Policy Details */}
            {selectedPolicy && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Policy Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-slate-300 mb-2">Basic Information</h4>
                            <div className="space-y-2 text-sm">
                                <div><span className="text-slate-400">Name:</span> <span className="text-white">{selectedPolicy.displayName}</span></div>
                                <div><span className="text-slate-400">State:</span> <span className="text-white">{selectedPolicy.state}</span></div>
                                <div><span className="text-slate-400">ID:</span> <span className="text-slate-500 font-mono text-xs">{selectedPolicy.id}</span></div>
                                <div><span className="text-slate-400">Created:</span> <span className="text-white">{new Date(selectedPolicy.createdDateTime).toLocaleString()}</span></div>
                                <div><span className="text-slate-400">Modified:</span> <span className="text-white">{new Date(selectedPolicy.modifiedDateTime).toLocaleString()}</span></div>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium text-slate-300 mb-2">Exclusions & Analysis</h4>
                            <div className="space-y-2 text-sm">
                                <div><span className="text-slate-400">Excluded Users:</span> <span className="text-purple-400">{selectedPolicy.excludedUsersCount}</span></div>
                                <div><span className="text-slate-400">Excluded Groups:</span> <span className="text-purple-400">{selectedPolicy.excludedGroupsCount}</span></div>
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                    <div className="text-green-400 text-xs">
                                        ✅ Policy is being analyzed for similarity with {policies.length - 1} other policies
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* 🎯 NEW: Side-by-Side Policy Comparison */}
            {comparisonPolicies && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <GitCompare className="w-5 h-5 text-blue-400" />
                            Policy Comparison - {comparisonPolicies.similarity}% Match
                        </h3>
                        <button
                            onClick={() => setComparisonPolicies(null)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                    
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                            {/* Policy 1 */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <h4 className="font-bold text-blue-400">Policy A</h4>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                    <h5 className="font-medium text-white mb-3">{comparisonPolicies.policy1.displayName}</h5>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">State:</span>
                                            <span className={`font-medium ${
                                                comparisonPolicies.policy1.state === comparisonPolicies.policy2.state 
                                                    ? 'text-green-400' : 'text-blue-400'
                                            }`}>
                                                {comparisonPolicies.policy1.state}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Grant Controls:</span>
                                            <span className="text-blue-400 text-xs">
                                                {(comparisonPolicies.policy1.grantControls?.builtInControls || []).join(', ') || 'None'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Applications:</span>
                                            <span className="text-blue-400 text-xs">
                                                {(comparisonPolicies.policy1.applicationConditions?.includeApplications || []).length} apps
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Target Users:</span>
                                            <span className="text-blue-400 text-xs">
                                                {(comparisonPolicies.policy1.userConditions?.includeUsers || []).length} users
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Target Groups:</span>
                                            <span className="text-blue-400 text-xs">
                                                {(comparisonPolicies.policy1.userConditions?.includeGroups || []).length} groups
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Platforms:</span>
                                            <span className="text-blue-400 text-xs">
                                                {(comparisonPolicies.policy1.platformConditions?.includePlatforms || []).join(', ') || 'All'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Excluded Users:</span>
                                            <span className={`font-medium ${
                                                comparisonPolicies.policy1.excludedUsersCount === comparisonPolicies.policy2.excludedUsersCount 
                                                    ? 'text-green-400' : 'text-blue-400'
                                            }`}>
                                                {comparisonPolicies.policy1.excludedUsersCount}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Excluded Groups:</span>
                                            <span className={`font-medium ${
                                                comparisonPolicies.policy1.excludedGroupsCount === comparisonPolicies.policy2.excludedGroupsCount 
                                                    ? 'text-green-400' : 'text-blue-400'
                                            }`}>
                                                {comparisonPolicies.policy1.excludedGroupsCount}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Created:</span>
                                            <span className="text-slate-300 text-xs">
                                                {new Date(comparisonPolicies.policy1.createdDateTime).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Modified:</span>
                                            <span className="text-slate-300 text-xs">
                                                {new Date(comparisonPolicies.policy1.modifiedDateTime).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Policy 2 */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    <h4 className="font-bold text-purple-400">Policy B</h4>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                    <h5 className="font-medium text-white mb-3">{comparisonPolicies.policy2.displayName}</h5>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">State:</span>
                                            <span className={`font-medium ${
                                                comparisonPolicies.policy1.state === comparisonPolicies.policy2.state 
                                                    ? 'text-green-400' : 'text-purple-400'
                                            }`}>
                                                {comparisonPolicies.policy2.state}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Grant Controls:</span>
                                            <span className="text-purple-400 text-xs">
                                                {(comparisonPolicies.policy2.grantControls?.builtInControls || []).join(', ') || 'None'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Applications:</span>
                                            <span className="text-purple-400 text-xs">
                                                {(comparisonPolicies.policy2.applicationConditions?.includeApplications || []).length} apps
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Target Users:</span>
                                            <span className="text-purple-400 text-xs">
                                                {(comparisonPolicies.policy2.userConditions?.includeUsers || []).length} users
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Target Groups:</span>
                                            <span className="text-purple-400 text-xs">
                                                {(comparisonPolicies.policy2.userConditions?.includeGroups || []).length} groups
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Platforms:</span>
                                            <span className="text-purple-400 text-xs">
                                                {(comparisonPolicies.policy2.platformConditions?.includePlatforms || []).join(', ') || 'All'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Excluded Users:</span>
                                            <span className={`font-medium ${
                                                comparisonPolicies.policy1.excludedUsersCount === comparisonPolicies.policy2.excludedUsersCount 
                                                    ? 'text-green-400' : 'text-purple-400'
                                            }`}>
                                                {comparisonPolicies.policy2.excludedUsersCount}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Excluded Groups:</span>
                                            <span className={`font-medium ${
                                                comparisonPolicies.policy1.excludedGroupsCount === comparisonPolicies.policy2.excludedGroupsCount 
                                                    ? 'text-green-400' : 'text-purple-400'
                                            }`}>
                                                {comparisonPolicies.policy2.excludedGroupsCount}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Created:</span>
                                            <span className="text-slate-300 text-xs">
                                                {new Date(comparisonPolicies.policy2.createdDateTime).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Modified:</span>
                                            <span className="text-slate-300 text-xs">
                                                {new Date(comparisonPolicies.policy2.modifiedDateTime).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Similarity Breakdown */}
                        <div className="mt-6 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                            <h5 className="font-medium text-white mb-3">🚀 Deep Policy Analysis Breakdown</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-400">{comparisonPolicies.similarity}%</div>
                                    <div className="text-slate-400">Overall Match</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-blue-400">
                                        {comparisonPolicies.policy1.state === comparisonPolicies.policy2.state ? '100' : '0'}%
                                    </div>
                                    <div className="text-slate-400">State Match</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-purple-400">
                                        {Math.round(calculateGrantControlsSimilarity(comparisonPolicies.policy1, comparisonPolicies.policy2) * 100)}%
                                    </div>
                                    <div className="text-slate-400">Grant Controls</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-orange-400">
                                        {Math.round(calculateApplicationSimilarity(comparisonPolicies.policy1, comparisonPolicies.policy2) * 100)}%
                                    </div>
                                    <div className="text-slate-400">Applications</div>
                                </div>
                            </div>
                            
                            {/* Detailed Component Analysis */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-900/50 rounded-lg p-3">
                                    <h6 className="font-medium text-slate-300 mb-2">🔐 Grant Controls Analysis</h6>
                                    <div className="text-xs text-slate-400 space-y-1">
                                        <div>Policy A: {(comparisonPolicies.policy1.grantControls?.builtInControls || []).join(', ') || 'None'}</div>
                                        <div>Policy B: {(comparisonPolicies.policy2.grantControls?.builtInControls || []).join(', ') || 'None'}</div>
                                        <div className="text-green-400">
                                            Operator Match: {(comparisonPolicies.policy1.grantControls?.operator || 'OR') === (comparisonPolicies.policy2.grantControls?.operator || 'OR') ? 'Yes' : 'No'}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900/50 rounded-lg p-3">
                                    <h6 className="font-medium text-slate-300 mb-2">👥 User Targeting</h6>
                                    <div className="text-xs text-slate-400 space-y-1">
                                        <div>Policy A: {(comparisonPolicies.policy1.userConditions?.includeUsers || []).length} users, {(comparisonPolicies.policy1.userConditions?.includeGroups || []).length} groups</div>
                                        <div>Policy B: {(comparisonPolicies.policy2.userConditions?.includeUsers || []).length} users, {(comparisonPolicies.policy2.userConditions?.includeGroups || []).length} groups</div>
                                        <div className="text-purple-400">
                                            Exclusions: A={comparisonPolicies.policy1.excludedUsersCount + comparisonPolicies.policy1.excludedGroupsCount}, B={comparisonPolicies.policy2.excludedUsersCount + comparisonPolicies.policy2.excludedGroupsCount}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-3 bg-slate-900/50 rounded-lg">
                                <div className="text-slate-300 text-sm">
                                    <strong>🎯 Detailed Similarity Reasons:</strong>
                                </div>
                                <ul className="mt-2 space-y-1">
                                    {comparisonPolicies.reasons.map((reason: string, idx: number) => (
                                        <li key={idx} className="text-slate-400 text-sm flex items-center gap-2">
                                            <CheckCircle className="w-3 h-3 text-green-400" />
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
