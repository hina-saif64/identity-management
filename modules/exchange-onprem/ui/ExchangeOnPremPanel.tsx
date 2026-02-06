/**
 * Exchange On-Prem Diagnostics Panel
 * Main panel showing tiles for UPN/SMTP mismatch and orphaned users
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Server,
    AlertTriangle,
    UserX,
    RefreshCw,
    Check,
    X,
    Mail,
    Filter,
    Download,
    Search
} from 'lucide-react';

import { RemoteMailbox, ExchangeOnPremSummary, UpnSmtpMismatch, MissingInExchange } from '../models/remoteMailbox';
import { evaluateUpnSmtpMismatch } from '../evaluators/UpnSmtpMismatchEvaluator';
import { evaluateOrphanedUsers } from '../evaluators/OrphanedUserEvaluator';

interface ExchangeOnPremPanelProps {
    connection: {
        isConnected: boolean;
        sessionId?: string;
        server?: string;
        domain?: string;
    };
    adUsers?: any[];
    addLog: (message: string, module: string, level: string) => void;
    theme?: 'light' | 'dark';
    persistedState?: {
        mailboxes: RemoteMailbox[];
        lastFetched: string | null;
        exchangeServer: string;
    };
    onStateChange?: (state: any) => void;
}

type ActiveTile = 'all' | 'mismatch' | 'missing';

export const ExchangeOnPremPanel: React.FC<ExchangeOnPremPanelProps> = ({
    connection,
    adUsers = [],
    addLog,
    theme = 'dark',
    persistedState,
    onStateChange
}) => {
    const [mailboxes, setMailboxes] = useState<RemoteMailbox[]>(persistedState?.mailboxes || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exchangeServer, setExchangeServer] = useState(persistedState?.exchangeServer || '');
    const [lastFetched, setLastFetched] = useState<string | null>(persistedState?.lastFetched || null);
    const [activeTile, setActiveTile] = useState<ActiveTile>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [serverInfo, setServerInfo] = useState<{ serverName: string; edition: string; version: string } | null>(null);

    // Computed values
    const mismatches = evaluateUpnSmtpMismatch(mailboxes);
    const missingInExchange = evaluateOrphanedUsers(adUsers, mailboxes);

    const summary: ExchangeOnPremSummary = {
        totalRemoteMailboxes: mailboxes.length,
        upnSmtpMismatches: mismatches.length,
        missingInExchange: missingInExchange.length,
        recipientTypes: mailboxes.reduce((acc, mbx) => {
            acc[mbx.recipientType] = (acc[mbx.recipientType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    };

    // Persist state changes
    useEffect(() => {
        if (onStateChange && mailboxes.length > 0) {
            onStateChange({
                mailboxes,
                lastFetched,
                exchangeServer
            });
        }
    }, [mailboxes, lastFetched, exchangeServer, onStateChange]);

    // Auto-load on mount if we have persisted data
    useEffect(() => {
        if (persistedState?.mailboxes?.length > 0 && mailboxes.length === 0) {
            setMailboxes(persistedState.mailboxes);
            setLastFetched(persistedState.lastFetched);
            setExchangeServer(persistedState.exchangeServer);
            setIsConnected(true);
        }
    }, [persistedState]);

    const testConnection = useCallback(async () => {
        if (!connection.sessionId || !exchangeServer) {
            setError('AD session and Exchange server are required');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            addLog(`Testing connection to Exchange On-Prem: ${exchangeServer}`, 'EXCHANGE-ONPREM', 'info');

            const response = await fetch('http://localhost:3002/api/exchange-onprem/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: connection.sessionId,
                    exchangeServer
                })
            });

            const result = await response.json();

            if (result.status === 'connected') {
                setIsConnected(true);
                setServerInfo({
                    serverName: result.serverName,
                    edition: result.edition,
                    version: result.version
                });
                addLog(`Connected to Exchange: ${result.serverName} (${result.version})`, 'EXCHANGE-ONPREM', 'success');
            } else {
                throw new Error(result.error || 'Connection failed');
            }
        } catch (err: any) {
            setError(err.message);
            addLog(`Exchange connection failed: ${err.message}`, 'EXCHANGE-ONPREM', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [connection.sessionId, exchangeServer, addLog]);

    const fetchMailboxes = useCallback(async () => {
        if (!connection.sessionId || !exchangeServer) {
            setError('AD session and Exchange server are required');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            addLog('Fetching remote mailboxes from Exchange On-Prem...', 'EXCHANGE-ONPREM', 'info');

            const response = await fetch('http://localhost:3002/api/exchange-onprem/remote-mailboxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: connection.sessionId,
                    exchangeServer
                })
            });

            const result = await response.json();

            if (result.status === 'success') {
                setMailboxes(result.mailboxes || []);
                setLastFetched(result.fetchedAt);
                setIsConnected(true);
                addLog(`Fetched ${result.count} remote mailboxes`, 'EXCHANGE-ONPREM', 'success');
            } else {
                throw new Error(result.error || 'Failed to fetch mailboxes');
            }
        } catch (err: any) {
            setError(err.message);
            addLog(`Failed to fetch mailboxes: ${err.message}`, 'EXCHANGE-ONPREM', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [connection.sessionId, exchangeServer, addLog]);

    // Filter data based on active tile and search
    const getFilteredData = () => {
        let data: any[] = [];

        switch (activeTile) {
            case 'mismatch':
                data = mismatches;
                break;
            case 'missing':
                data = missingInExchange;
                break;
            default:
                data = mailboxes;
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(item =>
                item.displayName?.toLowerCase().includes(term) ||
                item.userPrincipalName?.toLowerCase().includes(term) ||
                item.primarySmtpAddress?.toLowerCase().includes(term) ||
                item.samAccountName?.toLowerCase().includes(term)
            );
        }

        return data;
    };

    const exportToCsv = () => {
        const data = getFilteredData();
        if (data.length === 0) return;

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item => Object.values(item).join(','));
        const csv = [headers, ...rows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exchange-onprem-${activeTile}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredData = getFilteredData();

    // Styles
    const cardClass = `rounded-xl border transition-all duration-300 ${theme === 'dark'
            ? 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`;

    const inputClass = `w-full px-4 py-2 rounded-lg border transition-colors ${theme === 'dark'
            ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-indigo-500'
            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 focus:border-indigo-500'
        }`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Exchange On-Prem Diagnostics
                    </h1>
                    <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                        Hybrid environment identity mismatch detection
                    </p>
                </div>

                {lastFetched && (
                    <div className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        Last updated: {new Date(lastFetched).toLocaleString()}
                    </div>
                )}
            </div>

            {/* Connection Setup */}
            {!connection.isConnected && (
                <div className={`${cardClass} p-6`}>
                    <div className="flex items-center gap-3 text-amber-500 mb-4">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">AD Connection Required</span>
                    </div>
                    <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                        Please connect to Active Directory first to use Exchange On-Prem diagnostics.
                    </p>
                </div>
            )}

            {connection.isConnected && (
                <>
                    {/* Exchange Server Input */}
                    <div className={`${cardClass} p-6`}>
                        <div className="flex items-center gap-4">
                            <Server className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Exchange Server FQDN (e.g., exchange.domain.com)"
                                    value={exchangeServer}
                                    onChange={(e) => setExchangeServer(e.target.value)}
                                    className={inputClass}
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                onClick={isConnected ? fetchMailboxes : testConnection}
                                disabled={isLoading || !exchangeServer}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${isLoading || !exchangeServer
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                    }`}
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                {isLoading ? 'Loading...' : isConnected ? 'Refresh Data' : 'Connect & Fetch'}
                            </button>
                        </div>

                        {/* Server Info */}
                        {serverInfo && (
                            <div className={`mt-4 flex items-center gap-4 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                <div className="flex items-center gap-1">
                                    <Check className="w-4 h-4 text-green-500" />
                                    <span>Connected to {serverInfo.serverName}</span>
                                </div>
                                <span>•</span>
                                <span>{serverInfo.edition}</span>
                                <span>•</span>
                                <span>{serverInfo.version}</span>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="mt-4 flex items-center gap-2 text-red-400">
                                <X className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {/* Summary Tiles */}
                    {mailboxes.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Mailboxes */}
                            <button
                                onClick={() => setActiveTile('all')}
                                className={`${cardClass} p-6 text-left relative overflow-hidden ${activeTile === 'all' ? 'ring-2 ring-indigo-500' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Remote Mailboxes
                                        </p>
                                        <p className={`text-3xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                            {summary.totalRemoteMailboxes}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-indigo-500/10">
                                        <Mail className="w-6 h-6 text-indigo-500" />
                                    </div>
                                </div>
                                {activeTile === 'all' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500" />
                                )}
                            </button>

                            {/* UPN ≠ SMTP */}
                            <button
                                onClick={() => setActiveTile('mismatch')}
                                className={`${cardClass} p-6 text-left relative overflow-hidden ${activeTile === 'mismatch' ? 'ring-2 ring-amber-500' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            UPN ≠ SMTP Mismatch
                                        </p>
                                        <p className={`text-3xl font-bold mt-1 ${summary.upnSmtpMismatches > 0 ? 'text-amber-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'
                                            }`}>
                                            {summary.upnSmtpMismatches}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${summary.upnSmtpMismatches > 0 ? 'bg-amber-500/10' : 'bg-slate-500/10'}`}>
                                        <AlertTriangle className={`w-6 h-6 ${summary.upnSmtpMismatches > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                                    </div>
                                </div>
                                {activeTile === 'mismatch' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
                                )}
                            </button>

                            {/* Missing in Exchange */}
                            <button
                                onClick={() => setActiveTile('missing')}
                                className={`${cardClass} p-6 text-left relative overflow-hidden ${activeTile === 'missing' ? 'ring-2 ring-red-500' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Missing in Exchange
                                        </p>
                                        <p className={`text-3xl font-bold mt-1 ${summary.missingInExchange > 0 ? 'text-red-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'
                                            }`}>
                                            {summary.missingInExchange}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${summary.missingInExchange > 0 ? 'bg-red-500/10' : 'bg-slate-500/10'}`}>
                                        <UserX className={`w-6 h-6 ${summary.missingInExchange > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                                    </div>
                                </div>
                                <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    AD users with email but no remote mailbox
                                </p>
                                {activeTile === 'missing' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Data Table */}
                    {mailboxes.length > 0 && (
                        <div className={cardClass}>
                            {/* Table Header */}
                            <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
                                <div className="flex items-center gap-3">
                                    <Filter className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                        {activeTile === 'all' ? 'All Remote Mailboxes' :
                                            activeTile === 'mismatch' ? 'UPN ≠ SMTP Mismatches' :
                                                'AD Users Missing in Exchange'}
                                    </span>
                                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                        ({filteredData.length} items)
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className={`pl-9 pr-4 py-1.5 rounded-lg border text-sm ${theme === 'dark'
                                                    ? 'bg-slate-900 border-slate-700 text-white'
                                                    : 'bg-slate-50 border-slate-300 text-slate-900'
                                                }`}
                                        />
                                    </div>

                                    {/* Export */}
                                    <button
                                        onClick={exportToCsv}
                                        disabled={filteredData.length === 0}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filteredData.length === 0
                                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                : theme === 'dark'
                                                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                            }`}
                                    >
                                        <Download className="w-4 h-4" />
                                        Export CSV
                                    </button>
                                </div>
                            </div>

                            {/* Table Content */}
                            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full">
                                    <thead className={`sticky top-0 z-10 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                        <tr className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Display Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">UPN</th>
                                            {activeTile !== 'missing' && (
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Primary SMTP</th>
                                            )}
                                            {activeTile === 'missing' && (
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Email (AD)</th>
                                            )}
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">SAM Account</th>
                                            {activeTile === 'all' && (
                                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Type</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'}`}>
                                        {filteredData.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center">
                                                    <div className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>
                                                        {searchTerm ? 'No matching results' : 'No data available'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredData.map((item, idx) => (
                                                <tr
                                                    key={idx}
                                                    className={`transition-colors ${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                        {item.displayName}
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm font-mono ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        {item.userPrincipalName}
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm font-mono ${activeTile === 'mismatch'
                                                            ? 'text-amber-500'
                                                            : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                                                        }`}>
                                                        {item.primarySmtpAddress || item.email || '-'}
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        {item.samAccountName}
                                                    </td>
                                                    {activeTile === 'all' && (
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                                                                }`}>
                                                                {item.recipientType}
                                                            </span>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {mailboxes.length === 0 && !isLoading && !error && isConnected && (
                        <div className={`${cardClass} p-12 text-center`}>
                            <Mail className={`w-12 h-12 mx-auto mb-4 ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`} />
                            <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                No Remote Mailboxes Found
                            </h3>
                            <p className={`mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                Click "Refresh Data" to fetch remote mailboxes from Exchange On-Prem
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ExchangeOnPremPanel;
