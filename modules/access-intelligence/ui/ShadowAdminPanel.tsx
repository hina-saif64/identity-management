import React, { useState, useEffect } from 'react';
import { GraphCollector, GraphCredentials } from '../collectors/graphCollector';

interface ShadowAdminPanelProps {
    credentials: GraphCredentials;
}

interface ShadowAdminResult {
    DeviceName: string;
    AccountName: string;
    Group: string;
    Timestamp: string;
    AccountSid: string;
    LocalGroup: string;
}

export const ShadowAdminPanel: React.FC<ShadowAdminPanelProps> = ({ credentials }) => {
    const [results, setResults] = useState<ShadowAdminResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasRun, setHasRun] = useState(false);
    const [searchMode, setSearchMode] = useState<'membership' | 'behavior'>('membership');
    const [autoSwitched, setAutoSwitched] = useState(false);

    // APPROVED ADMINS (Whitelist)
    // In a real app, this should be configurable
    const APPROVED_ADMINS = ['Administrator', 'Domain Admins', 'LocalAdmin', 'System', 'Local Service', 'Network Service'];

    const runHunt = async (modeOverride?: 'membership' | 'behavior') => {
        setLoading(true);
        setError(null);
        setResults([]);
        setHasRun(true);
        setAutoSwitched(false);

        const activeMode = modeOverride || searchMode;

        try {
            const collector = new GraphCollector();

            let query = '';

            if (activeMode === 'membership') {
                // GOLD STANDARD: Check explicit group membership
                query = `
                    DeviceLocalGroupMembership
                    | where GroupName == 'Administrators'
                    | where AccountName !in~ ('Administrator', 'Guest', 'DefaultAccount', 'WDAGUtilityAccount')
                    | project DeviceName, AccountName, Group = GroupName, Timestamp, AccountSid
                    | limit 100
                `;
            } else {
                // FALLBACK: Behavioral Analysis (Check for High Integrity Processes)
                // Useful if DeviceLocalGroupMembership table is missing (Lisence level)
                query = `
                    DeviceProcessEvents
                    | where ProcessIntegrityLevel in ('High', 'System')
                    | where AccountName !in~ ('system', 'local service', 'network service', 'dwm', 'winlogon', 'fontdrvhost') 
                    | project DeviceName, AccountName, Group = 'High Integrity Process', Timestamp, AccountSid
                    | limit 100
                `;
            }

            const data = await collector.runHuntingQuery(credentials, query);

            // Map to our interface (KQL returns caps usually, but let's be safe)
            const mappedResults = data.map((item: any) => ({
                DeviceName: item.DeviceName || item.deviceName,
                AccountName: item.AccountName || item.accountName,
                Group: item.Group || item.group || 'Administrators',
                Timestamp: item.Timestamp || item.timestamp,
                AccountSid: item.AccountSid || item.accountSid,
                LocalGroup: 'Administrators'
            }));

            setResults(mappedResults);

        } catch (err: any) {
            // AUTO-FAILOVER LOGIC
            // If we failed on 'membership' mode due to missing table, try 'behavior' availability
            if (activeMode === 'membership' && err.message && err.message.includes('DeviceLocalGroupMembership')) {
                console.warn("Membership table missing, attempting auto-failover to behavioral analysis...");
                setAutoSwitched(true);
                setSearchMode('behavior'); // Update UI state
                await runHunt('behavior'); // Retry immediately
                return;
            }

            setError(err.message);
        } finally {
            if (!autoSwitched) {
                setLoading(false);
            }
        }
    };

    const isShadow = (name: string) => {
        if (!name) return false;
        return !APPROVED_ADMINS.some(admin => name.toLowerCase().includes(admin.toLowerCase()));
    };

    return (
        <div className="p-6 bg-[#0f172a] text-white rounded-xl shadow-2xl border border-slate-700">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
                        🕵️‍♂️ Shadow Admin Hunter
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Scans endpoints for unauthorized local administrators using Microsoft Defender.
                    </p>
                </div>

                <div className="flex gap-2">
                    <select
                        value={searchMode}
                        onChange={(e) => setSearchMode(e.target.value as any)}
                        className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2.5"
                    >
                        <option value="membership">Mode: Group Membership (Gold)</option>
                        <option value="behavior">Mode: Behavioral (Fallback)</option>
                    </select>

                    <button
                        onClick={() => runHunt()}
                        disabled={loading}
                        className={`px-6 py-2 rounded-lg font-semibold transition-all shadow-lg ${loading
                            ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                            : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white hover:shadow-red-500/20'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Scanning...
                            </span>
                        ) : (
                            "🚀 Start Hunt"
                        )}
                    </button>
                </div>
            </div>

            {autoSwitched && (
                <div className="mb-4 p-3 bg-amber-900/30 border border-amber-500/50 rounded-lg text-amber-200 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <span>⚠️</span>
                    <span>
                        <strong>Note:</strong> "Group Membership" data is not available (License limit).
                        Automatically switched to <strong>Behavioral Scanning</strong>.
                    </span>
                </div>
            )}

            {error && !autoSwitched && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⚠️</span>
                        <div>
                            <p className="font-bold">Hunt Failed</p>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {!loading && hasRun && results.length === 0 && !error && (
                <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700 border-dashed">
                    <div className="text-4xl mb-3">✅</div>
                    <h3 className="text-xl font-medium text-emerald-400">Clean Sweep</h3>
                    <p className="text-slate-400">No unexpected local admins found on scanned devices.</p>
                </div>
            )}

            {results.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-slate-700 animate-in fade-in duration-500">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-800 text-slate-300 uppercase text-xs font-semibold tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Result</th>
                                <th className="px-4 py-3 text-left">Device</th>
                                <th className="px-4 py-3 text-left">Account</th>
                                <th className="px-4 py-3 text-left">Local Group</th>
                                <th className="px-4 py-3 text-left">Detected</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                            {results.map((item, idx) => {
                                const isShadowAdmin = isShadow(item.AccountName);
                                return (
                                    <tr key={idx} className={`hover:bg-slate-800/50 transition-colors ${isShadowAdmin ? 'bg-red-500/5' : ''
                                        }`}>
                                        <td className="px-4 py-3 align-middle">
                                            {isShadowAdmin ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-200 border border-red-500/30">
                                                    SHADOW ADMIN
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/50 text-emerald-200 border border-emerald-500/30">
                                                    Approved
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-white">{item.DeviceName}</td>
                                        <td className="px-4 py-3 font-mono text-slate-300">{item.AccountName}</td>
                                        <td className="px-4 py-3 text-slate-400">{item.Group}</td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {new Date(item.Timestamp).toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="px-4 py-3 bg-slate-800 border-t border-slate-700 text-xs text-slate-400 text-right">
                        Showing top {results.length} results
                    </div>
                </div>
            )}
        </div>
    );
};
