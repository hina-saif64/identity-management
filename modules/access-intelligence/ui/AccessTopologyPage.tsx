import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Shield, Lock, Users, Fingerprint, RefreshCw, AlertTriangle, Zap } from 'lucide-react';

// Models
import { CloudConnectionState } from '../../../types';
import { GraphCollector } from '../collectors/graphCollector';
import { CaCollector } from '../collectors/caCollector';
import { AuthMethodCollector } from '../collectors/authMethodCollector';
import { MfaEvaluator } from '../evaluators/mfaEvaluator';
import { AccessEvaluator } from '../evaluators/accessEvaluator';

interface AccessTopologyPageProps {
    cloudConnection: CloudConnectionState;
    addLog: (msg: string, module: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

const AccessTopologyPage: React.FC<AccessTopologyPageProps> = ({ cloudConnection, addLog }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ highRisk: 0, mfaReady: 0, totalUsers: 0 });

    const loadTopology = useCallback(async () => {
        if (!cloudConnection.isConnected) {
            addLog('Topology: Cloud connection required.', 'ACCESS', 'warning');
            return;
        }

        setLoading(true);
        addLog('Topology: Starting deep scan...', 'ACCESS', 'info');

        try {
            // CREDENTIALS - PASSED FROM APP (REUSE)
            const creds = {
                tenantId: cloudConnection.tenantId,
                appId: cloudConnection.appId,
                vaultName: cloudConnection.vaultName,
                secretName: cloudConnection.secretName
            };

            // INSTANTIATE ENGINE
            const graphBase = new GraphCollector();
            const caBase = new CaCollector();
            const authBase = new AuthMethodCollector();
            const mfaEngine = new MfaEvaluator();
            const accessEngine = new AccessEvaluator();

            // 1. FETCH DATA (Parallel)
            addLog('Topology: Fetching identity graph...', 'ACCESS', 'info');
            const [users, policies, directoryRoles] = await Promise.all([
                graphBase.fetchUsers(creds),
                caBase.fetchPolicies(creds),
                graphBase.fetchDirectoryRoles(creds)
            ]);

            // Map Roles to Users for O(1) lookup
            // Map Roles to Users AND Build Privileged User List
            const userRoleMap = new Map<string, string[]>();
            const uniquePrivilegedUsers = new Map<string, any>();

            directoryRoles.forEach((role: any) => {
                if (role.members) {
                    role.members.forEach((member: any) => {
                        // Only process users (skip service principals if desired, or include them)
                        if (member['@odata.type'] === '#microsoft.graph.user') {
                            if (!userRoleMap.has(member.id)) {
                                userRoleMap.set(member.id, []);
                                // Add to our target list directly
                                uniquePrivilegedUsers.set(member.id, {
                                    id: member.id,
                                    displayName: member.displayName,
                                    userPrincipalName: member.userPrincipalName,
                                    type: 'User'
                                });
                            }
                            userRoleMap.get(member.id)?.push(role.displayName);
                        }
                    });
                }
            });

            // FILTER: Source of truth is now the Role Members themselves
            let targetUsers = Array.from(uniquePrivilegedUsers.values());

            // If result is huge, cap it
            if (targetUsers.length > 50) {
                targetUsers = targetUsers.slice(0, 50);
            }

            addLog(`Topology: Found ${targetUsers.length} Privileged Accounts (Admins) from Directory Roles.`, 'ACCESS', 'info');

            if (targetUsers.length === 0) {
                addLog('Topology: No admin roles found or no users assigned to them.', 'ACCESS', 'warning');
            }



            // ------------------------------------------------------------------
            // TIERED LAYOUT ENGINE (Hierarchy: Tier 0 > Tier 1 > Tier 2 > Tier 3)
            // ------------------------------------------------------------------

            const tiers: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [] };

            // Helper: Classify Tier based on Role Name
            const getTier = (roles: string[]) => {
                const r = roles.map(x => x.toLowerCase());
                if (r.some(x => x.includes('global admin') || x.includes('privileged role') || x.includes('company admin'))) return 0; // Crown Jewels
                if (r.some(x => x.includes('security') || x.includes('exchange') || x.includes('sharepoint') || x.includes('compliance'))) return 1; // Control Plane
                if (r.some(x => x.includes('admin') || x.includes('manager') || x.includes('reader'))) return 2; // Management/Ops
                return 3; // General/Other
            };

            // 1. Assign Users to Tiers
            targetUsers.forEach(u => {
                const roles = userRoleMap.get(u.id) || [];
                const tier = getTier(roles);
                tiers[tier].push(u);
            });

            const newNodes: Node[] = [];
            const newEdges: Edge[] = [];
            let rCount = 0;
            let mCount = 0;

            // 2. Render Tiers (Rows)
            Object.keys(tiers).forEach((key) => {
                const tierIndex = parseInt(key);
                const tierUsers = tiers[tierIndex];

                // Skip empty tiers if desired, or keep generic placeholder
                if (tierUsers.length === 0 && tierIndex !== 0 && tierIndex !== 1) return;

                // TIER LABEL NODE (Left Column)
                const tierName =
                    tierIndex === 0 ? "Tier 0: Crown Jewels" :
                        tierIndex === 1 ? "Tier 1: Control Plane" :
                            tierIndex === 2 ? "Tier 2: Operations" : "Tier 3: General Access";

                const tierColor =
                    tierIndex === 0 ? "#ef4444" : // Red
                        tierIndex === 1 ? "#f59e0b" : // Orange
                            tierIndex === 2 ? "#3b82f6" : "#64748b"; // Blue/Slate

                const rowY = (tierIndex * 250); // Vertical spacing between rows

                newNodes.push({
                    id: `tier-label-${tierIndex}`,
                    type: 'input', // Input type removes handles usually
                    data: { label: tierName },
                    position: { x: -250, y: rowY },
                    style: {
                        width: 200,
                        backgroundColor: 'transparent',
                        color: tierColor,
                        borderBottom: `2px dashed ${tierColor}`,
                        fontWeight: 'bold',
                        fontSize: '14px',
                        textAlign: 'right',
                        paddingRight: '1rem',
                        border: 'none',
                        borderBottomWidth: '1px',
                        borderBottomStyle: 'dashed',
                        borderBottomColor: tierColor
                    },
                    draggable: false
                });

                // RENDER USERS IN ROW
                const startX = 0;
                const spacingX = 220; // Horizontal spacing

                tierUsers.forEach((u, userIndex) => {
                    // SKIPPING MFA as requested
                    const methods: string[] = [];
                    const mfaStatus = mfaEngine.evaluate(u, policies, methods);

                    // Access
                    const assignedRoles = userRoleMap.get(u.id) || [];
                    const realPermissions = assignedRoles.map(roleName => ({
                        id: roleName, name: roleName, type: 'Role',
                        isPrivileged: tierIndex <= 1,
                        assignmentType: 'Direct'
                    } as any));

                    const risk = accessEngine.assessPrivilegeLevel(realPermissions);
                    if (tierIndex === 0) rCount++;

                    // Node Styling
                    let color = tierColor;

                    newNodes.push({
                        id: u.id,
                        data: {
                            label: (
                                <div className="flex flex-col items-center">
                                    <span className="font-bold text-xs truncate max-w-[140px]">{u.displayName}</span>
                                    <span className="text-[10px] uppercase tracking-wide opacity-80 mt-1 truncate max-w-[140px]" style={{ color: tierColor }}>{assignedRoles[0] || 'User'}</span>
                                    {assignedRoles.length > 1 && <span className="text-[9px] opacity-40">+{assignedRoles.length - 1} roles</span>}
                                </div>
                            )
                        },
                        position: { x: startX + (userIndex * spacingX), y: rowY },
                        style: {
                            border: `1px solid ${color}`,
                            borderTop: `4px solid ${color}`,
                            backgroundColor: `${color}10`,
                            backdropFilter: 'blur(12px)',
                            borderRadius: '6px',
                            minWidth: '160px',
                            padding: '12px',
                            color: 'white',
                            boxShadow: tierIndex === 0 ? `0 0 25px ${color}30` : 'none'
                        }
                    });

                    // Edges: Link to Root (Virtual Tenant) for connectivity visualization
                    newEdges.push({
                        id: `e-root-${u.id}`,
                        source: 'root',
                        target: u.id,
                        style: { stroke: color, opacity: 0.1, strokeWidth: 1 },
                        animated: tierIndex === 0 // Only animate critical paths
                    });
                });
            });

            setNodes(newNodes);
            setEdges(newEdges);
            setStats({ totalUsers: targetUsers.length, highRisk: rCount, mfaReady: mCount });
            setLoading(false);
            addLog('Topology: Graph rendering complete.', 'ACCESS', 'success');

        } catch (e: any) {
            console.error(e);
            setLoading(false);
            addLog(`Topology Error: ${e.message}`, 'ACCESS', 'error');
        }
    }, [cloudConnection, addLog, setNodes, setEdges]);

    return (
        <div className="h-[85vh] flex flex-col bg-[#0a0f1a] text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            {/* Header / Toolbar */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center glass">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold uppercase tracking-wider">Access Intelligence</h1>
                        <p className="text-xs text-slate-400">Live Identity Topology & MFA Status</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                        <Shield className="w-3 h-3 text-red-500" />
                        <span className="text-xs font-mono text-red-300">High Risk: {stats.highRisk}</span>
                    </div>
                    <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                        <Lock className="w-3 h-3 text-green-500" />
                        <span className="text-xs font-mono text-green-300">MFA Ready: {stats.mfaReady}</span>
                    </div>

                    <button
                        onClick={loadTopology}
                        disabled={loading || !cloudConnection.isConnected}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {cloudConnection.isConnected ? 'Scan Topology' : 'Connect Cloud'}
                    </button>
                </div>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 relative">
                {!cloudConnection.isConnected && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="text-center space-y-3">
                            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
                            <h3 className="text-xl font-bold">Cloud Connection Required</h3>
                            <p className="text-slate-400">Please verify your Universal Connection in the top bar.</p>
                        </div>
                    </div>
                )}

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    className="bg-[#050810]"
                >
                    <Background color="#3730a3" gap={20} size={1} style={{ opacity: 0.2 }} />
                    <Controls style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1e293b', color: 'white' }} />
                    <MiniMap style={{ height: 120, backgroundColor: '#1e293b' }} nodeColor={() => '#6366f1'} />
                </ReactFlow>
            </div>
        </div>
    );
};

export default AccessTopologyPage;
