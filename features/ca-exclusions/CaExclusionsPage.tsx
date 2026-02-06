/**
 * CA Exclusions Page - Main Component
 * Uses existing Universal Auth credentials
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { CaPolicy, ExcludedUser, CaCredentials } from './ca.types';
import { caApi } from './ca.api';
import { CaPolicyTiles } from './CaPolicyTiles';
import { ExcludedUsersTable } from './ExcludedUsersTable';
import { CloudConnectionState } from '../../types';

interface CaExclusionsPageProps {
    cloudConnection: CloudConnectionState | null;
    addLog: (message: string, module: string, level?: string) => void;
}

import { SimilarityDashboard } from '../ca-similarity';

export const CaExclusionsPage: React.FC<CaExclusionsPageProps> = ({
    cloudConnection,
    addLog
}) => {
    const [policies, setPolicies] = useState<CaPolicy[]>([]);
    const [selectedPolicy, setSelectedPolicy] = useState<CaPolicy | null>(null);
    const [excludedUsers, setExcludedUsers] = useState<ExcludedUser[]>([]);
    const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'exclusions' | 'similarity'>('exclusions');

    // Convert cloudConnection to credentials
    const getCredentials = useCallback((): CaCredentials | null => {
        if (!cloudConnection?.isConnected) return null;
        return {
            tenantId: cloudConnection.tenantId,
            appId: cloudConnection.appId,
            vaultName: cloudConnection.vaultName,
            secretName: cloudConnection.secretName
        };
    }, [cloudConnection]);

    // Fetch policies
    const fetchPolicies = useCallback(async () => {
        const credentials = getCredentials();
        if (!credentials) return;

        setIsLoadingPolicies(true);
        setError(null);

        try {
            addLog('Fetching Conditional Access policies...', 'CLOUD', 'info');
            const result = await caApi.getPolicies(credentials);

            if (result.status === 'success') {
                setPolicies(result.policies);
                addLog(`Found ${result.count} CA policies`, 'CLOUD', 'success');
            } else {
                throw new Error(result.error || 'Failed to fetch policies');
            }
        } catch (err: any) {
            setError(err.message);
            addLog(`CA Policies Error: ${err.message}`, 'CLOUD', 'error');
        } finally {
            setIsLoadingPolicies(false);
        }
    }, [getCredentials, addLog]);

    // Fetch excluded users for selected policy
    const fetchExcludedUsers = useCallback(async (policy: CaPolicy) => {
        const credentials = getCredentials();
        if (!credentials) return;

        setIsLoadingUsers(true);

        try {
            addLog(`Fetching excluded users for "${policy.displayName}"...`, 'CLOUD', 'info');
            const result = await caApi.getExcludedUsers(credentials, policy.id);

            if (result.status === 'success') {
                setExcludedUsers(result.users);
                addLog(`Found ${result.count} excluded users`, 'CLOUD', 'success');
            } else {
                throw new Error(result.error || 'Failed to fetch excluded users');
            }
        } catch (err: any) {
            addLog(`Excluded Users Error: ${err.message}`, 'CLOUD', 'error');
        } finally {
            setIsLoadingUsers(false);
        }
    }, [getCredentials, addLog]);

    // Handle policy selection with auto-scroll
    const handleSelectPolicy = (policy: CaPolicy) => {
        setSelectedPolicy(policy);
        fetchExcludedUsers(policy);

        // Auto-scroll to excluded users section
        setTimeout(() => {
            const excludedSection = document.getElementById('excluded-users-section');
            if (excludedSection) {
                excludedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

    // Initial load
    useEffect(() => {
        if (cloudConnection?.isConnected) {
            fetchPolicies();
        }
    }, [cloudConnection?.isConnected]);

    // Not connected state
    if (!cloudConnection?.isConnected) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-slate-100 dark:bg-slate-900/20 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-[3rem] text-center">
                <Shield className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-6" />
                <h3 className="text-xl font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    CA Policy Inspector Offline
                </h3>
                <p className="text-slate-400 dark:text-slate-500 mt-2 text-sm max-w-md">
                    Connect via Universal Authentication to view Conditional Access policy exclusions
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                            <Shield className="w-5 h-5 text-indigo-400" />
                        </div>
                        Conditional Access
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        View excluded users and assess geo risk for all CA policies
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-1 bg-slate-900 border border-slate-800 rounded-xl flex items-center">
                        <button
                            onClick={() => setActiveTab('exclusions')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'exclusions'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Exclusions
                        </button>
                        <button
                            onClick={() => setActiveTab('similarity')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'similarity'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            Similarity Engine
                        </button>
                    </div>

                    <button
                        onClick={fetchPolicies}
                        disabled={isLoadingPolicies}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoadingPolicies ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <div>
                        <p className="text-sm font-bold text-red-400">Error</p>
                        <p className="text-xs text-red-400/80">{error}</p>
                    </div>
                </div>
            )}

            {/* CONTENT AREA */}
            {activeTab === 'exclusions' ? (
                <>
                    {/* Policy Tiles */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                            Policies ({policies.length})
                        </h3>
                        <CaPolicyTiles
                            policies={policies}
                            selectedPolicyId={selectedPolicy?.id || null}
                            onSelectPolicy={handleSelectPolicy}
                            isLoading={isLoadingPolicies}
                        />
                    </div>

                    {/* Excluded Users Table */}
                    {selectedPolicy && (
                        <div id="excluded-users-section" className="mt-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                                Excluded Users
                            </h3>
                            <ExcludedUsersTable
                                users={excludedUsers}
                                setUsers={setExcludedUsers}
                                policy={selectedPolicy}
                                isLoading={isLoadingUsers}
                                onRefresh={() => fetchExcludedUsers(selectedPolicy)}
                                getCredentials={getCredentials}
                                addLog={addLog}
                            />
                        </div>
                    )}
                </>
            ) : (
                /* SIMILARITY ENGINE */
                <SimilarityDashboard policies={policies} addLog={addLog} />
            )}
        </div>
    );
};

export default CaExclusionsPage;
