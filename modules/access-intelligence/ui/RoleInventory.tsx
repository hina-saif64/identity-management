import React, { useState, useEffect } from 'react';
import { CloudConnectionState, LogEntry } from '../../../types';
import { GraphCollector } from '../collectors/graphCollector';
import { Shield, Mail, Share2, MessageSquare, Users, AlertTriangle, User, Search, Filter, X, ChevronRight, Loader2, Download, Box, Key } from 'lucide-react';
import { GroupMembersModal } from './GroupMembersModal';

interface RoleInventoryProps {
    cloudConnection: CloudConnectionState;
    addLog: (message: string, module: LogEntry['module'], type: LogEntry['level']) => void;
    persistedState?: any;
    onStateChange?: (state: any) => void;
}

// Data Model: An Identity (User or Group) holds a set of Roles
interface IdentityPassport {
    id: string;
    displayName: string;
    principalName: string; // UPN or Group Name
    type: 'User' | 'Group' | 'ServicePrincipal';
    roles: AssignedRole[];
}

interface AssignedRole {
    id: string; // Role Template ID
    displayName: string; // "Global Admin"
    category: RoleCategory;
}

type RoleCategory = 'ga' | 'exchange' | 'spo' | 'teams' | 'security' | 'other';

// Enhanced Configuration with Base Colors for Theming
const ROLE_CATEGORIES = {
    'ga': { base: 'red', label: 'Global Admin', keywords: ['global administrator', 'company administrator'] },
    'exchange': { base: 'orange', label: 'Exchange', keywords: ['exchange administrator'] },
    'spo': { base: 'blue', label: 'SharePoint', keywords: ['sharepoint administrator'] },
    'teams': { base: 'indigo', label: 'Teams', keywords: ['teams administrator', 'skype', 'communications'] },
    'security': { base: 'yellow', label: 'Security', keywords: ['security administrator', 'security operator'] },
    'other': { base: 'purple', label: 'Other', keywords: [] }
};

export const RoleInventory: React.FC<RoleInventoryProps> = ({ cloudConnection, addLog, persistedState, onStateChange }) => {
    const [loading, setLoading] = useState(persistedState?.loading ?? true);
    const [passports, setPassports] = useState<IdentityPassport[]>(persistedState?.passports || []);
    const [filteredPassports, setFilteredPassports] = useState<IdentityPassport[]>([]);
    const [activeFilter, setActiveFilter] = useState<string | null>(null); // Filter by Role Name
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Sync State
    useEffect(() => {
        if (onStateChange) {
            onStateChange({
                loading,
                passports,
                lastFetched: Date.now()
            });
        }
    }, [loading, passports]);

    // Group Drill-Down State
    const [selectedGroup, setSelectedGroup] = useState<IdentityPassport | null>(null);

    useEffect(() => {
        // Only load if we don't have persisted data
        if (passports.length === 0) {
            loadInventory();
        }
    }, [cloudConnection]);

    // Filtering Logic
    useEffect(() => {
        let result = passports;

        if (activeFilter) {
            result = result.filter(p => p.roles.some(r => r.displayName === activeFilter));
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(p =>
                p.displayName.toLowerCase().includes(lower) ||
                p.principalName.toLowerCase().includes(lower) ||
                p.roles.some(r => r.displayName.toLowerCase().includes(lower))
            );
        }

        setFilteredPassports(result);
    }, [passports, activeFilter, searchTerm]);

    const getCreds = () => ({
        tenantId: cloudConnection.tenantId,
        clientId: cloudConnection.appId,
        appId: cloudConnection.appId,
        vaultName: cloudConnection.vaultName,
        secretName: cloudConnection.secretName
    });

    const loadInventory = async () => {
        setLoading(true);
        setError(null);
        try {
            const creds = getCreds();
            const graphBase = new GraphCollector();
            const directoryRoles = await graphBase.fetchDirectoryRoles(creds);

            const passportMap = new Map<string, IdentityPassport>();

            directoryRoles.forEach((role: any) => {
                if (!role.members) return;

                // Determine Category
                const rName = role.displayName.toLowerCase();
                let category: RoleCategory = 'other';
                for (const [key, config] of Object.entries(ROLE_CATEGORIES)) {
                    if (key === 'other') continue;
                    if (config.keywords.some(k => rName.includes(k))) {
                        category = key as RoleCategory;
                        break;
                    }
                }

                const assignedRole: AssignedRole = {
                    id: role.id,
                    displayName: role.displayName,
                    category
                };

                role.members.forEach((m: any) => {
                    if (!passportMap.has(m.id)) {
                        passportMap.set(m.id, {
                            id: m.id,
                            displayName: m.displayName || 'Unknown',
                            principalName: m.userPrincipalName || m.mail || 'N/A',
                            type: m['@odata.type']?.includes('group') ? 'Group' :
                                m['@odata.type']?.includes('servicePrincipal') ? 'ServicePrincipal' : 'User',
                            roles: []
                        });
                    }
                    passportMap.get(m.id)?.roles.push(assignedRole);
                });
            });

            // Convert to Array and Sort (Users with most roles first)
            const list = Array.from(passportMap.values()).sort((a, b) => b.roles.length - a.roles.length);
            setPassports(list);
            setFilteredPassports(list);
            setLoading(false);

        } catch (e: any) {
            console.error(e);
            setError(e.message);
            setLoading(false);
        }
    };

    const handleGroupClick = (group: IdentityPassport) => {
        if (group.type !== 'Group') return;
        setSelectedGroup(group);
    };

    const handleExport = () => {
        const headers = ['Type', 'Display Name', 'Principal Name', 'Roles'];
        const rows = filteredPassports.map(p => [
            p.type,
            p.displayName,
            p.principalName,
            p.roles.map(r => r.displayName).join('; ')
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.map(c => `"${c}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `identity_inventory_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog('Exported identity inventory to CSV', 'ACCESS', 'success');
    };

    if (loading) return <div className="p-8 text-slate-400 animate-pulse flex items-center justify-center h-64">
        <Shield className="w-8 h-8 animate-bounce mr-2" /> Generating Identity Passports...
    </div>;

    if (error) return <div className="p-8 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20 m-4">
        <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Error Loading Inventory</h3>
        <p className="mt-2 text-sm opacity-80">{error}</p>
    </div>;

    // Grouping Logic
    const users = filteredPassports.filter(p => p.type === 'User');
    const servicePrincipals = filteredPassports.filter(p => p.type === 'ServicePrincipal');
    const groups = filteredPassports.filter(p => p.type === 'Group');

    const renderPassportCard = (identity: IdentityPassport) => (
        <div
            key={identity.id}
            onClick={() => handleGroupClick(identity)}
            className={`group relative bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 transition-all hover:shadow-xl hover:shadow-slate-200 dark:hover:shadow-black/50 flex flex-col gap-4 ${identity.type === 'Group' ? 'cursor-pointer hover:border-indigo-500 hover:scale-[1.02]' : 'hover:border-slate-300 dark:hover:border-slate-600'
                }`}
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-md ${identity.type === 'Group' ? 'bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-white' :
                        identity.type === 'ServicePrincipal' ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' :
                            'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                        }`}>
                        {identity.type === 'Group' ? <Users className="w-6 h-6" /> :
                            identity.type === 'ServicePrincipal' ? <Share2 className="w-6 h-6" /> :
                                identity.displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[140px] flex items-center gap-2" title={identity.displayName}>
                            {identity.displayName}
                            {identity.type === 'Group' && <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />}
                        </h3>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center gap-1">
                            {identity.type}
                        </span>
                    </div>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${identity.roles.some(r => r.category === 'ga')
                    ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                    : 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-500 border border-green-200 dark:border-green-500/10'
                    }`}>
                    {identity.roles.some(r => r.category === 'ga') ? 'Tier 0' : 'Tier N'}
                </div>
            </div>

            {/* Principal Name */}
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-black/20 p-2 rounded truncate border border-slate-200 dark:border-white/5">
                {identity.principalName}
            </div>

            {/* Role Pills (Interactive) */}
            <div className="flex flex-wrap gap-1.5 mt-auto">
                {identity.roles.map((role, idx) => {
                    const baseColor = ROLE_CATEGORIES[role.category]?.base || 'slate';
                    return (
                        <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setActiveFilter(role.displayName); }}
                            className={`px-2 py-1 rounded text-[10px] font-medium transition-all hover:scale-105 active:scale-95 border border-transparent 
                                bg-${baseColor}-100 dark:bg-${baseColor}-500/10 
                                text-${baseColor}-700 dark:text-${baseColor}-300 
                                hover:border-${baseColor}-500/20`}
                        >
                            {role.displayName}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0a0f1a] transition-colors duration-300">
            {/* Toolbar */}
            <div className="border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between bg-white/50 dark:bg-[#0a0f1a]/50 backdrop-blur-md sticky top-0 z-10 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Find user, group, or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 w-64 transition-all"
                        />
                    </div>
                    {activeFilter && (
                        <div className="flex items-center gap-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full text-xs font-bold animate-in fade-in slide-in-from-left-4">
                            <Filter className="w-3 h-3" />
                            Filtered by: {activeFilter}
                            <button onClick={() => setActiveFilter(null)} className="hover:text-indigo-900 dark:hover:text-white ml-1"><X className="w-3 h-3" /></button>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-500">
                        {filteredPassports.length} Identities Found
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                    <button
                        onClick={handleExport}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                        title="Export to CSV"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={loadInventory}
                        disabled={loading}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-50"
                        title="Refresh Inventory"
                    >
                        <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Passport Grid - Grouped */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* Users Section */}
                {users.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Privileged Users</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{users.length} human accounts with administrative roles</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {users.map(renderPassportCard)}
                        </div>
                    </section>
                )}

                {/* Service Principals Section */}
                {servicePrincipals.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-4 mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-300">
                                <Key className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Service Principals</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{servicePrincipals.length} applications with administrative roles</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {servicePrincipals.map(renderPassportCard)}
                        </div>
                    </section>
                )}

                {/* Groups Section */}
                {groups.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-4 mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Privileged Groups</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{groups.length} groups holding administrative roles directly</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {groups.map(renderPassportCard)}
                        </div>
                    </section>
                )}

                {filteredPassports.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 opacity-50">
                        <Filter className="w-12 h-12 mb-4" />
                        <p>No identities match your filter.</p>
                    </div>
                )}

            </div>

            {/* Group Members Modal */}
            {selectedGroup && (
                <GroupMembersModal
                    group={selectedGroup}
                    creds={getCreds()}
                    onClose={() => setSelectedGroup(null)}
                />
            )}
        </div>
    );
};
