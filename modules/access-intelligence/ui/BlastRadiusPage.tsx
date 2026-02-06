import React, { useState, useEffect } from 'react';
import { CloudConnectionState, LogEntry } from '../../../types';
import { AzureCollector, AzureSubscription, ResourceGroup, RoleAssignment, RoleDefinition } from '../collectors/azureCollector';
import { GraphCollector } from '../collectors/graphCollector';
import { Shield, LayoutGrid, Box, Users, Share2, AlertTriangle, Loader2, ChevronDown, ChevronRight, Download, Filter, Search, X } from 'lucide-react';
import { GroupMembersModal } from './GroupMembersModal';

interface BlastRadiusProps {
    cloudConnection: CloudConnectionState;
    addLog: (message: string, module: LogEntry['module'], type: LogEntry['level']) => void;
    persistedState: any;
    onStateChange: (state: any) => void;
}

// ... imports

import { SmartActivityAnalyzer, calculateActivityRisk } from '../evaluators/activityAnalyzer';
import { RiskEvaluator, RiskLevel, RiskFactor, AnalyzedIdentity } from '../evaluators/RiskEvaluator';

// Data Model for the View
interface ResourceFortress {
    rg: ResourceGroup;
    owners: EnrichedAssignment[];
    contributors: EnrichedAssignment[];
    others: EnrichedAssignment[];
    // Risk Props
    riskScore?: number;
    riskLevel?: RiskLevel;
    riskFactors?: RiskFactor[];
}

interface EnrichedAssignment {
    assignmentId: string;
    principalId: string;
    roleName: string;
    roleType: 'Owner' | 'Contributor' | 'Reader' | 'Custom';
    identity?: {
        displayName: string;
        principalName: string;
        type: 'User' | 'Group' | 'ServicePrincipal' | 'Unknown';
        id: string; // Ensure ID is present for drill-down
        lastSignIn?: string;
    };
    // NEW: Add activity analysis
    activityAnalysis?: {
        lastRegularActivity: Date | null;      // Last normal login (Outlook, Teams, etc.)
        lastPrivilegedActivity: Date | null;   // Last admin operation using this role
        privilegedOperationsCount: number;     // Count of admin operations in last 90 days
        riskLevel: 'Active' | 'Stale-Privileged' | 'Unused' | 'Unknown';
        riskReasons: string[];                 // Why this is risky
        isAnalyzed: boolean;                   // Has analysis been completed?
    };
}

// Helper to map UI model to Evaluator model
const mapToAnalyzed = (item: EnrichedAssignment): AnalyzedIdentity => ({
    type: item.identity?.type || 'Unknown',
    roleType: item.roleType,
    assignmentType: item.identity?.type === 'Group' ? 'Group' : 'Direct',
    lastSignIn: item.identity?.lastSignIn
});

export const BlastRadiusPage: React.FC<BlastRadiusProps> = ({ cloudConnection, addLog, persistedState, onStateChange }) => {
    // Initialize from Persisted State or Defaults
    const [loading, setLoading] = useState(persistedState.loading ?? true);
    const [subscriptions, setSubscriptions] = useState<AzureSubscription[]>(persistedState.subscriptions || []);
    const [selectedSub, setSelectedSub] = useState<string>(persistedState.selectedSub || '');
    const [fortresses, setFortresses] = useState<ResourceFortress[]>(persistedState.fortresses || []);
    const [error, setError] = useState<string | null>(persistedState.error || null);

    // Filter States (No need to persist strictly, but good for UX)
    const [searchTerm, setSearchTerm] = useState('');

    // Sync State back to Parent
    useEffect(() => {
        onStateChange({
            loading,
            subscriptions,
            selectedSub,
            fortresses,
            error
        });
    }, [loading, subscriptions, selectedSub, fortresses, error]);

    // Activity Analysis State
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activityAnalyzer] = useState(() => new SmartActivityAnalyzer());

    // Drill-Down State
    const [selectedGroup, setSelectedGroup] = useState<{ id: string, displayName: string } | null>(null);
    // Pivot State (Filter by User)
    const [selectedPrincipal, setSelectedPrincipal] = useState<{ id: string, name: string } | null>(null);
    const [showHighRiskOnly, setShowHighRiskOnly] = useState(false);

    // Initial Load: Only if empty
    useEffect(() => {
        if (subscriptions.length === 0 && !error) {
            loadSubscriptions();
        }
    }, [cloudConnection]);

    // Secondary Load: When Sub changes, load RGs and Assignments
    useEffect(() => {
        if (selectedSub) {
            loadBlastRadius(selectedSub);
            setSelectedPrincipal(null);
        }
    }, [selectedSub]);

    const getCreds = () => ({
        tenantId: cloudConnection.tenantId,
        clientId: cloudConnection.appId,
        appId: cloudConnection.appId,
        vaultName: cloudConnection.vaultName,
        secretName: cloudConnection.secretName
    });

    const loadSubscriptions = async () => {
        try {
            const creds = getCreds();
            const azure = new AzureCollector();
            const subs = await azure.fetchSubscriptions(creds);
            setSubscriptions(subs);
            if (subs.length > 0) {
                setSelectedSub(subs[0].subscriptionId);
            } else {
                setLoading(false);
                setError("No Azure Subscriptions found. Ensure the Service Principal has Reader access.");
            }
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    const loadBlastRadius = async (subId: string) => {
        setLoading(true);
        setError(null);
        try {
            const creds = getCreds();
            addLog(`Starting Blast Radius scan for Sub: ${subId}`, 'ACCESS', 'info');
            const azure = new AzureCollector();
            const graph = new GraphCollector();

            // 1. Parallel Fetch of Structure and Access
            const [rgs, assignments, definitions] = await Promise.all([
                azure.fetchResourceGroups(creds, subId),
                azure.fetchRoleAssignments(creds, `/subscriptions/${subId}`),
                azure.fetchRoleDefinitions(creds, subId)
            ]);

            // 2. Map Definitions for O(1) Lookup
            const roleMap = new Map<string, RoleDefinition>();
            definitions.forEach(d => roleMap.set(d.id, d));

            // 3. Resolve Principals (Batch)
            const principalIds = assignments.map(a => a.properties.principalId);
            const principalMap = await graph.getPrincipalsBatch(creds, principalIds);

            // 4. Build Fortresses (Aggregation)
            const fortList = rgs.map(rg => {
                const fortress: ResourceFortress = {
                    rg,
                    owners: [],
                    contributors: [],
                    others: []
                };

                // Find assignments for this RG (Direct or Inherited from Sub)
                const rgIdLower = rg.id.toLowerCase();
                const subIdLower = `/subscriptions/${subId}`.toLowerCase();

                const relevantAssignments = assignments.filter(a => {
                    const scope = a.properties.scope.toLowerCase();
                    // Match Exact RG Scope OR Subscription Scope (Inherited)
                    return scope === rgIdLower || scope === subIdLower;
                });

                relevantAssignments.forEach(a => {
                    const def = roleMap.get(a.properties.roleDefinitionId);
                    const p = principalMap.get(a.properties.principalId);

                    const roleName = def?.properties.roleName || 'Unknown Role';
                    let roleType: EnrichedAssignment['roleType'] = 'Custom';

                    if (roleName === 'Owner') roleType = 'Owner';
                    else if (roleName === 'Contributor') roleType = 'Contributor';
                    else if (roleName === 'Reader') roleType = 'Reader';

                    const enriched: EnrichedAssignment = {
                        assignmentId: a.id,
                        principalId: a.properties.principalId,
                        roleName,
                        roleType,
                        identity: p // Includes ID from GraphCollector
                    };

                    if (roleType === 'Owner') fortress.owners.push(enriched);
                    else if (roleType === 'Contributor') fortress.contributors.push(enriched);
                    else fortress.others.push(enriched);
                });

                return fortress;
            });

            // 5. Calculate Risk Scores
            const evaluator = new RiskEvaluator();
            const analyzedFortresses: ResourceFortress[] = fortList.map(f => {
                const context = {
                    owners: f.owners.map(mapToAnalyzed),
                    contributors: f.contributors.map(mapToAnalyzed),
                    others: f.others.map(mapToAnalyzed)
                };

                const analysis = evaluator.evaluate(context);

                return {
                    ...f,
                    riskScore: analysis.score,
                    riskLevel: analysis.level,
                    riskFactors: analysis.factors
                };
            });

            // Sort by Risk (descending)
            analyzedFortresses.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

            setFortresses(analyzedFortresses);
            setLoading(false);

            // Debug Logs
            addLog(`Scan Complete: ${rgs.length} RGs, ${assignments.length} Assignments`, 'ACCESS', 'info');
            if (rgs.length === 0) {
                addLog(`WARNING: 0 Resource Groups found for Sub ${subId}. check permissions?`, 'ACCESS', 'warning');
            }

            // PHASE 2: Enhance with activity analysis in background
            enhanceWithActivityAnalysis(analyzedFortresses);

        } catch (e: any) {
            console.error(e);
            setError(e.message);
            setLoading(false);
            addLog(`Scan Failed: ${e.message}`, 'ACCESS', 'error');
        }
    };

    const handleIdentityClick = (identity: EnrichedAssignment['identity'], principalId: string) => {
        if (identity?.type === 'Group') {
            setSelectedGroup(identity);
        } else {
            // Pivot / Filter by this Principal
            const name = identity?.displayName || principalId;
            setSelectedPrincipal({ id: principalId, name });
        }
    };

    // FILTER LOGIC
    const visibleFortresses = fortresses.filter(f => {
        if (selectedPrincipal) {
            const hasAccess = [...f.owners, ...f.contributors, ...f.others].some(
                a => a.principalId === selectedPrincipal.id || a.identity?.id === selectedPrincipal.id
            );
            if (!hasAccess) return false;
        }
        if (showHighRiskOnly) {
            return f.riskLevel === 'High';
        }
        return true;
    });

    const handleExport = () => {
        // Flatten the fortress structure for CSV
        const rows: string[][] = [];
        fortresses.forEach(f => {
            const processRole = (list: EnrichedAssignment[]) => {
                list.forEach(item => {
                    rows.push([
                        f.rg.name,
                        item.roleName,
                        item.identity?.displayName || 'Unknown',
                        item.identity?.principalName || item.principalId,
                        item.identity?.type || 'Unknown'
                    ]);
                });
            };
            processRole(f.owners);
            processRole(f.contributors);
            processRole(f.others);
        });

        const headers = ['Resource Group', 'Role', 'Identity', 'Principal Name', 'Type'];
        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.map(c => `"${c}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `blast_radius_matrix_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog('Exported Access Matrix to CSV', 'ACCESS', 'success');
    };

    const renderUserDetailView = () => {
        if (!selectedPrincipal) return null;

        // Aggregate all access for this user
        const userAccess: { rgName: string; role: string; type: string; risk: string }[] = [];

        fortresses.forEach(f => {
            // Check Owners
            f.owners.forEach(a => {
                if (a.principalId === selectedPrincipal.id || a.identity?.id === selectedPrincipal.id) {
                    userAccess.push({ rgName: f.rg.name, role: 'Owner', type: a.identity?.type === 'Group' ? `Via Group: ${a.identity.displayName}` : 'Direct', risk: 'Critical' });
                }
            });
            // Check Contributors
            f.contributors.forEach(a => {
                if (a.principalId === selectedPrincipal.id || a.identity?.id === selectedPrincipal.id) {
                    userAccess.push({ rgName: f.rg.name, role: 'Contributor', type: a.identity?.type === 'Group' ? `Via Group: ${a.identity.displayName}` : 'Direct', risk: 'High' });
                }
            });
            // Check Others
            f.others.forEach(a => {
                if (a.principalId === selectedPrincipal.id || a.identity?.id === selectedPrincipal.id) {
                    userAccess.push({ rgName: f.rg.name, role: a.roleName, type: a.identity?.type === 'Group' ? `Via Group: ${a.identity.displayName}` : 'Direct', risk: 'Medium' });
                }
            });
        });

        return (
            <div className="flex-1 overflow-y-auto p-6 animate-in slide-in-from-right-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-500/20">
                                {selectedPrincipal.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedPrincipal.name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono border border-slate-200 dark:border-slate-700">
                                        ID: {selectedPrincipal.id}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedPrincipal(null)}
                            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors"
                        >
                            Close Passport
                        </button>
                    </div>

                    {/* Access Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <Shield className="w-4 h-4 text-indigo-500" />
                                Resource Access ({userAccess.length})
                            </h3>
                            <button className="text-xs text-indigo-500 hover:underline">Export Report</button>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-black/20 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Resource Group</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Assignment</th>
                                    <th className="px-4 py-3">Risk Level</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {userAccess.map((access, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                                            {access.rgName}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${access.role === 'Owner' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                access.role === 'Contributor' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                {access.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                            {access.type}
                                        </td>
                                        <td className="px-4 py-3">
                                            {access.role === 'Owner' ? <span className="flex items-center gap-1 text-red-500 text-xs font-bold"><AlertTriangle className="w-3 h-3" /> Critical</span> :
                                                access.role === 'Contributor' ? <span className="text-orange-500 text-xs">High</span> :
                                                    <span className="text-slate-400 text-xs">Low</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {userAccess.length === 0 && (
                            <div className="p-8 text-center text-slate-400">
                                No specific Resource Group assignments found for this user in the current subscription.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderIdentityPill = (item: EnrichedAssignment) => {
        const type = item.identity?.type || 'Unknown';
        const isSelected = selectedPrincipal?.id === item.principalId;
        const activityRisk = item.activityAnalysis;

        return (
            <div
                key={item.assignmentId}
                onClick={() => handleIdentityClick(item.identity, item.principalId)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all hover:shadow-sm cursor-pointer relative group
                ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
                ${type === 'Group' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 hover:border-indigo-400' :
                        type === 'ServicePrincipal' ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400' :
                            'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-300 hover:border-violet-400'}
            `}>
                {type === 'Group' ? <Users className="w-3 h-3" /> :
                    type === 'ServicePrincipal' ? <Share2 className="w-3 h-3" /> :
                        <div className="w-4 h-4 rounded bg-violet-200 dark:bg-violet-600 flex items-center justify-center text-[8px] text-violet-800 dark:text-white font-bold">{item.identity?.displayName.substring(0, 2).toUpperCase()}</div>}

                <span className="truncate max-w-[120px]" title={item.identity?.displayName || item.principalId}>
                    {item.identity?.displayName || item.principalId}
                </span>

                {/* ID Type or Role Suffix */}
                {item.roleType === 'Custom' && <span className="opacity-50 text-[9px] border-l border-current pl-1 ml-1">{item.roleName}</span>}

                {/* ACTIVITY RISK BADGE */}
                {activityRisk && activityRisk.isAnalyzed && activityRisk.riskLevel !== 'Active' && activityRisk.riskLevel !== 'Unknown' && (
                    <div className="ml-1 flex items-center" title={`${activityRisk.riskLevel}: ${activityRisk.riskReasons.join(', ')}`}>
                        {activityRisk.riskLevel === 'Stale-Privileged' && <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />}
                        {activityRisk.riskLevel === 'Unused' && <span className="w-2 h-2 rounded-full bg-red-500" />}

                        {/* Custom Tooltip on Hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white p-3 rounded-lg shadow-xl z-50 min-w-[200px] pointer-events-none">
                            <div className="text-[10px] space-y-1 font-normal text-left">
                                <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-orange-300">
                                    {activityRisk.riskLevel === 'Stale-Privileged' ? '⚠️ Stale Privileges' : '🔴 Unused Account'}
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 text-slate-400">
                                    <span>Last Login:</span>
                                    <span className="text-white">
                                        {activityRisk.lastRegularActivity ? new Date(activityRisk.lastRegularActivity).toLocaleDateString() : 'Never'}
                                    </span>
                                    <span>Last Admin Op:</span>
                                    <span className="text-white">
                                        {activityRisk.lastPrivilegedActivity ? new Date(activityRisk.lastPrivilegedActivity).toLocaleDateString() : 'Never'}
                                    </span>
                                </div>
                                {activityRisk.riskReasons.length > 0 && (
                                    <ul className="list-disc pl-3 text-orange-200 mt-1">
                                        {activityRisk.riskReasons.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                )}
                            </div>
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const enhanceAssignmentWithActivity = (assignment: EnrichedAssignment, analysisResults: Map<string, any>): EnrichedAssignment => {
        if (!assignment.identity || assignment.identity.type !== 'User') {
            return assignment;
        }

        const key = `${assignment.identity.id}-${assignment.roleName}`;
        const activityCache = analysisResults.get(key);

        if (!activityCache) {
            return {
                ...assignment,
                activityAnalysis: {
                    lastRegularActivity: null,
                    lastPrivilegedActivity: null,
                    privilegedOperationsCount: 0,
                    riskLevel: 'Unknown',
                    riskReasons: ['Analysis not available'],
                    isAnalyzed: false
                }
            };
        }

        const riskAssessment = calculateActivityRisk(activityCache);

        return {
            ...assignment,
            activityAnalysis: {
                lastRegularActivity: activityCache.regularActivity,
                lastPrivilegedActivity: activityCache.privilegedActivity,
                privilegedOperationsCount: activityCache.privilegedCount,
                riskLevel: riskAssessment.riskLevel,
                riskReasons: riskAssessment.riskReasons,
                isAnalyzed: true
            }
        };
    };

    const enhanceWithActivityAnalysis = async (fortresses: ResourceFortress[]) => {
        setIsAnalyzing(true);
        setAnalysisProgress(0);

        try {
            const creds = getCreds();
            // Collect all unique user-role pairs that need analysis
            const userRolePairs: { userId: string, role: string, assignmentId: string }[] = [];

            fortresses.forEach(fortress => {
                [...fortress.owners, ...fortress.contributors, ...fortress.others].forEach(assignment => {
                    if (assignment.identity && assignment.identity.type === 'User') {
                        userRolePairs.push({
                            userId: assignment.identity.id,
                            role: assignment.roleName,
                            assignmentId: assignment.assignmentId
                        });
                    }
                });
            });

            if (userRolePairs.length === 0) {
                setIsAnalyzing(false);
                return;
            }

            addLog(`Analyzing activity for ${userRolePairs.length} user assignments...`, 'ACCESS', 'info');

            // Batch analyze all users
            const analysisResults = await activityAnalyzer.batchAnalyzeUsers(
                userRolePairs.map(p => ({ userId: p.userId, role: p.role })),
                creds,
                (progress) => setAnalysisProgress(progress)
            );

            // Update fortresses with analysis results
            const enhancedFortresses = fortresses.map(fortress => ({
                ...fortress,
                owners: fortress.owners.map(owner => enhanceAssignmentWithActivity(owner, analysisResults)),
                contributors: fortress.contributors.map(contrib => enhanceAssignmentWithActivity(contrib, analysisResults)),
                others: fortress.others.map(other => enhanceAssignmentWithActivity(other, analysisResults))
            }));

            setFortresses(enhancedFortresses);
            addLog(`Activity analysis completed for ${userRolePairs.length} assignments`, 'ACCESS', 'success');

        } catch (error: any) {
            console.error('Activity analysis failed:', error);
            addLog(`Activity analysis failed: ${error.message}`, 'ACCESS', 'error');
        } finally {
            setIsAnalyzing(false);
            setAnalysisProgress(0);
        }
    };

    if (loading && !fortresses.length) return <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-4 h-full">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="animate-pulse">Scanning Azure Resources...</p>
    </div>;

    if (error) return <div className="p-8 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20 m-4">
        <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Scan Failed</h3>
        <p className="mt-2 text-sm opacity-80">{error}</p>
    </div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0f1a] overflow-hidden">
            {/* Toolbar */}
            <div className="border-b border-slate-200 dark:border-slate-800 p-4 bg-white/50 dark:bg-[#0a0f1a]/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                        <LayoutGrid className="w-4 h-4" />
                        <span className="font-bold text-sm">Blast Radius</span>
                    </div>
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search user, group, or RG..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 w-64 focus:outline-none focus:border-indigo-500 transition-all focus:w-80"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {subscriptions.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedSub}
                                onChange={(e) => setSelectedSub(e.target.value)}
                                className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                {subscriptions.map(s => <option key={s.subscriptionId} value={s.subscriptionId}>{s.displayName}</option>)}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {selectedPrincipal && (
                        <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-full text-xs animate-in slide-in-from-top-2">
                            <span className="font-medium">Filtered by: {selectedPrincipal.name}</span>
                            <button onClick={() => setSelectedPrincipal(null)} className="hover:bg-white/20 rounded-full p-0.5"><Users className="w-3 h-3" /></button>
                        </div>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400 select-none">
                        <input
                            type="checkbox"
                            className="accent-indigo-500 w-4 h-4 rounded border-slate-300"
                            checked={fortresses.some(f => f.riskLevel === 'High')}
                            disabled
                        />
                        <span>Check Risk</span>
                    </label>

                    <div className="text-xs font-mono text-slate-500">
                        {visibleFortresses.length} / {fortresses.length} RGs
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <button
                        onClick={handleExport}
                        disabled={fortresses.length === 0}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-50"
                        title="Export Access Matrix"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => loadBlastRadius(selectedSub)}
                        disabled={loading || !selectedSub}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-50"
                        title="Refresh Scan"
                    >
                        <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {selectedPrincipal ? renderUserDetailView() : (
                /* Masonry Grid */
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
                        {visibleFortresses.map(fort => (
                            <div key={fort.rg.id} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col">
                                {/* Card Header */}
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate" title={fort.rg.name}>
                                            {fort.rg.name}
                                        </h3>
                                        <span className="text-[10px] items-center flex gap-1 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                                            {fort.rg.location}
                                        </span>
                                    </div>
                                    {/* Tags */}
                                    {fort.rg.tags && Object.keys(fort.rg.tags).length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(fort.rg.tags).slice(0, 3).map(([k, v]) => (
                                                <span key={k} className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
                                                    {k}={v}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* RISK BANNER */}
                                {fort.riskLevel && fort.riskLevel !== 'Low' && (
                                    <div className={`px-4 py-2 flex items-center gap-2 text-xs font-bold border-t border-b ${fort.riskLevel === 'High'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/50'
                                        : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-900/50'
                                        }`}>
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>{fort.riskLevel} Risk Detected</span>
                                        {/* Tooltip for factors */}
                                        <div className="ml-auto group relative">
                                            <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px] cursor-help">?</div>
                                            <div className="absolute right-0 top-6 w-64 p-3 rounded-lg shadow-xl z-20 hidden group-hover:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-normal normal-case">
                                                <ul className="list-disc pl-4 space-y-1">
                                                    {fort.riskFactors?.map(f => (
                                                        <li key={f.code}>{f.description}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Access Matrix */}
                                <div className="p-4 space-y-4 text-sm flex-1">
                                    {/* Owners - Critical */}
                                    {fort.owners.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
                                                <Shield className="w-3 h-3" /> Owners
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {fort.owners.map(renderIdentityPill)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contributors - High */}
                                    {fort.contributors.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                                                <Box className="w-3 h-3" /> Contributors
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {fort.contributors.map(renderIdentityPill)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Others - Medium */}
                                    {fort.others.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">
                                                <Users className="w-3 h-3" /> Readers & Custom
                                            </div>
                                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                                {fort.others.map(renderIdentityPill)}
                                            </div>
                                        </div>
                                    )}

                                    {fort.owners.length === 0 && fort.contributors.length === 0 && fort.others.length === 0 && (
                                        <div className="text-center py-8 text-slate-400 italic text-xs">
                                            No explicit assignments found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Drill Down Modal */}
            {selectedGroup && (
                <GroupMembersModal
                    group={selectedGroup}
                    creds={getCreds()}
                    onClose={() => setSelectedGroup(null)}
                />
            )}

            {/* Progress Indicator for Activity Analysis */}
            {isAnalyzing && (
                <div className="fixed bottom-4 right-4 bg-indigo-600 text-white p-4 rounded-lg shadow-lg z-50 min-w-[300px] animate-in slide-in-from-bottom-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-medium">Analyzing User Activity...</span>
                    </div>
                    <div className="text-sm text-indigo-100 mb-2">
                        Checking privileged access usage patterns
                    </div>
                    <div className="w-full bg-indigo-800 rounded-full h-2 overflow-hidden">
                        <div
                            className="bg-white h-2 rounded-full transition-all duration-300"
                            style={{ width: `${analysisProgress}%` }}
                        />
                    </div>
                    <div className="text-xs text-indigo-200 mt-1 text-right">
                        {Math.round(analysisProgress)}% complete
                    </div>
                </div>
            )}
        </div>
    );
};
