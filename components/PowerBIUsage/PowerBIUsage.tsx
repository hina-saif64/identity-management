/**
 * PowerBI Usage Analytics Component
 * 
 * Displays real-time PowerBI audit logs and usage statistics by connecting
 * to Exchange Online unified audit logs. Provides filtering, search, and
 * export capabilities for PowerBI activity analysis.
 * 
 * @component
 * @example
 * ```tsx
 * <PowerBIUsage 
 *   connection={adConnection}
 *   cloudConnection={cloudConnection}
 *   exchangeConnection={exchangeConnection}
 *   addLog={addLog}
 * />
 * ```
 */

import React, { useEffect, useState } from 'react';
import { Loader2, Terminal, CheckCircle2, BarChart2, RefreshCw, Download, AlertTriangle, Calendar, ListFilter, Database, Search, Users } from 'lucide-react';
import { ConnectionState, LogEntry } from '../../types';
import { usePowerBI } from './hooks/usePowerBI';
import { usePowerBIFilters } from './hooks/usePowerBIFilters';
import { PowerBIHeader } from './components/PowerBIHeader';
import { PowerBIControls } from './components/PowerBIControls';
import { PowerBIMetrics } from './components/PowerBIMetrics';
import { PowerBIStats } from './components/PowerBIStats';
import { PowerBITable } from './components/PowerBITable';
import { PowerBIEmptyState } from './components/PowerBIEmptyState';
import { ExchangeConnect } from './components/ExchangeConnect';
import { EmbeddedTerminal } from './components/EmbeddedTerminal';
import { AppOnlyConnect } from './components/AppOnlyConnect';

import { CloudConnectionState, ExchangeConnectionState } from '../../types';

/**
 * Props for PowerBI Usage component
 */
interface PowerBIUsageProps {
    /** Active Directory connection state */
    connection: ConnectionState;
    /** Microsoft Graph/Cloud connection state (optional) */
    cloudConnection?: CloudConnectionState;
    /** Exchange Online connection state (optional) */
    exchangeConnection?: ExchangeConnectionState;
    /** Logging function for application events */
    addLog: (message: string, module: LogEntry['module'], level?: LogEntry['level']) => void;
}

const PowerBIUsage: React.FC<PowerBIUsageProps> = ({ connection, cloudConnection, exchangeConnection, addLog }) => {
    const [showTerminal, setShowTerminal] = useState(false);
    const [useAppOnly, setUseAppOnly] = useState(true); // Default to app-only auth
    const [useGraphAPI, setUseGraphAPI] = useState(true); // Default to Graph API for 90+ days
    const [syncProgress, setSyncProgress] = useState<{
        isActive: boolean;
        current: number;
        total: number;
        message: string;
    }>({ isActive: false, current: 0, total: 0, message: '' });

    const {
        usageData,
        connectionState,
        isLoading,
        lastUpdated,
        error,
        checkConnection,
        connectExchange,
        fetchUsage,
        fetchUsageAppOnly,
        fetchUsageGraph,
        fetchUsageManagementAPI,
        fetchUsageWithRealTimeProgress,
        exportData
    } = usePowerBI(connection.backendUrl || 'http://localhost:3002'); // Use connection's backend URL, fallback to V2 port

    // Debug logging for PowerBI backend URL
    useEffect(() => {
        console.log('PowerBI: Backend URL:', connection.backendUrl || 'http://localhost:3002');
        console.log('PowerBI: Connection state:', connection);
    }, [connection.backendUrl, connection.isConnected]);

    const {
        searchTerm,
        setSearchTerm,
        daysBack,
        setDaysBack,
        operationFilter,
        setOperationFilter,
        filteredData,
        uniqueOperations
    } = usePowerBIFilters(usageData?.data || []);

    // Initial check - use global Exchange state if available
    useEffect(() => {
        if (!connection.isConnected) return;

        // If Exchange is already connected globally, just verify status
        if (exchangeConnection?.isConnected) {
            addLog(`PowerBI: Using existing Exchange Online session for ${exchangeConnection.organization}`, 'CLOUD', 'success');
            checkConnection();
            return; // Skip auto-connect logic
        }

        // No global Exchange connection, check status
        checkConnection();
    }, [connection.isConnected, exchangeConnection?.isConnected]);

    // Enhanced Connect Handler
    const handleConnect = async () => {
        if (useAppOnly) {
            // App-only authentication is handled by AppOnlyConnect component
            return;
        } else {
            // Interactive authentication via embedded terminal
            setShowTerminal(true);
            addLog('Opening embedded terminal for Exchange Online authentication...', 'CLOUD', 'info');
        }
    };

    const handleAppOnlySuccess = (connectionInfo: any) => {
        addLog(`Exchange Online connected via app-only auth: ${connectionInfo.organization}`, 'CLOUD', 'success');
        checkConnection(); // Refresh connection state
    };

    const handleAppOnlyError = (error: string) => {
        addLog(`App-only authentication failed: ${error}`, 'CLOUD', 'error');
    };

    const handleTerminalSuccess = (connectionInfo: any) => {
        setShowTerminal(false);
        addLog('Exchange Online connected successfully via embedded terminal', 'CLOUD', 'success');
        checkConnection(); // Refresh connection state
    };

    const handleTerminalError = (error: string) => {
        addLog(`Terminal authentication failed: ${error}`, 'CLOUD', 'error');
    };

    /**
     * Fetch PowerBI usage via Power BI Activity Events API (service principal)
     * Uses Cloud connection credentials from Key Vault - 28 days max
     */
    const handleFetchGraph = async () => {
        if (!cloudConnection?.isConnected || !cloudConnection?.tenantId) {
            addLog('Cloud connection required for Service Principal fetch', 'CLOUD', 'error');
            return;
        }

        addLog(`Fetching PowerBI usage via Service Principal for last ${daysBack} days...`, 'CLOUD', 'info');

        const result = await fetchUsageGraph({
            tenantId: cloudConnection.tenantId,
            appId: cloudConnection.appId,
            vaultName: cloudConnection.vaultName,
            secretName: cloudConnection.secretName
        }, daysBack);

        if (result.success) {
            addLog(`PowerBI usage retrieved: ${result.data?.totalUsers || 0} unique users`, 'CLOUD', 'success');
        } else {
            addLog(`Service Principal fetch failed: ${result.error}`, 'CLOUD', 'error');
        }
    };

    /**
     * Fetch PowerBI usage via Office 365 Management Activity API
     * Headless, production-ready - 90+ days history
     */
    const handleFetchManagementAPI = async () => {
        if (!cloudConnection?.isConnected || !cloudConnection?.tenantId) {
            addLog('Cloud connection required for Management Activity API', 'CLOUD', 'error');
            return;
        }

        addLog(`Fetching PowerBI usage via Management Activity API for last ${daysBack} days...`, 'CLOUD', 'info');
        addLog('Note: Audit logs may take several hours to appear', 'CLOUD', 'info');

        const result = await fetchUsageManagementAPI(daysBack, {
            tenantId: cloudConnection.tenantId,
            appId: cloudConnection.appId,
            vaultName: cloudConnection.vaultName,
            secretName: cloudConnection.secretName,
            certThumbprint: cloudConnection.certificateThumbprint,
            organization: cloudConnection.organization
        });

        if (result.success) {
            addLog(`PowerBI usage retrieved: ${result.data?.totalUsers || 0} unique users, ${result.data?.totalActivities || 0} activities`, 'CLOUD', 'success');
        } else {
            addLog(`Management API failed: ${result.error}`, 'CLOUD', 'error');
        }
    };

    const handleFetch = async () => {
        // Use the working V1 approach with simple progress updates
        if (cloudConnection?.isConnected && cloudConnection?.tenantId) {
            addLog('Using Exchange Online unified audit logs (Search-UnifiedAuditLog)...', 'CLOUD', 'info');
            
            // Start simple progress tracking
            setSyncProgress({
                isActive: true,
                current: 1,
                total: daysBack,
                message: 'Connecting to Exchange Online and fetching data...'
            });

            try {
                // Use the working management API endpoint (same as V1)
                const result = await fetchUsageManagementAPI(daysBack, {
                    tenantId: cloudConnection.tenantId,
                    appId: cloudConnection.appId,
                    organization: cloudConnection.organization,
                    vaultName: cloudConnection.vaultName,
                    secretName: cloudConnection.secretName,
                    certThumbprint: cloudConnection.certificateThumbprint
                });

                if (result.success) {
                    // Update progress to show completion
                    setSyncProgress({
                        isActive: true,
                        current: daysBack,
                        total: daysBack,
                        message: `Completed: ${result.data?.totalUsers || 0} users found`
                    });
                    
                    // Brief delay to show completion, then hide
                    setTimeout(() => {
                        setSyncProgress({
                            isActive: false,
                            current: 0,
                            total: 0,
                            message: ''
                        });
                    }, 2000);
                    
                    addLog(`PowerBI usage retrieved: ${result.data?.totalUsers || 0} unique users, ${result.data?.totalActivities || 0} activities`, 'CLOUD', 'success');
                } else {
                    addLog(`Management API failed: ${result.error}`, 'CLOUD', 'error');
                }
            } catch (err) {
                addLog(`Fetch failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'CLOUD', 'error');
            } finally {
                setSyncProgress({
                    isActive: false,
                    current: 0,
                    total: 0,
                    message: ''
                });
            }
            return;
        }

        // Fallback to old methods
        addLog(`Fetching PowerBI usage for last ${daysBack} days...`, 'CLOUD', 'info');

        if (useAppOnly) {
            await fetchUsageAppOnly(daysBack);
        } else {
            await fetchUsage(daysBack);
        }

        if (error) {
            addLog(`Fetch failed: ${error}`, 'CLOUD', 'error');
        } else {
            addLog('PowerBI usage data retrieved', 'CLOUD', 'success');
        }
    };

    if (!connection.isConnected) {
        return <PowerBIEmptyState type="offline" />;
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-24 print:p-0">
            {/* HEADER SECTION */}
            <PowerBIHeader
                connectionState={connectionState}
                cloudConnection={cloudConnection}
                isLoading={isLoading || syncProgress.isActive}
                onFetch={handleFetch}
                onExport={exportData}
                hasData={!!(usageData?.data && usageData.data.length > 0)}
                syncProgress={syncProgress.isActive ? syncProgress : undefined}
            />

            {/* METRICS TILES - Show immediately when Cloud connected */}
            {cloudConnection?.isConnected && (
                <PowerBIMetrics
                    usageData={usageData}
                    filteredData={filteredData}
                    searchTerm={searchTerm}
                    operationFilter={operationFilter}
                    setOperationFilter={setOperationFilter}
                    onClearFilters={() => {
                        setSearchTerm('');
                        setOperationFilter('All');
                    }}
                />
            )}

            {/* SEARCH AND FILTER BAR - Show immediately when Cloud connected */}
            {cloudConnection?.isConnected && (
                <PowerBIControls
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    daysBack={daysBack}
                    setDaysBack={setDaysBack}
                    operationFilter={operationFilter}
                    setOperationFilter={setOperationFilter}
                    uniqueOperations={uniqueOperations}
                    usageData={usageData}
                    isLoading={isLoading}
                    onExport={exportData}
                />
            )}

            {/* DATA GRID - Show table structure even without data */}
            {cloudConnection?.isConnected && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden relative shadow-lg bg-white dark:bg-slate-950/20">
                    {usageData && filteredData.length > 0 ? (
                        <PowerBITable data={filteredData} />
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar max-h-[600px] relative">
                            <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                                <thead className="bg-slate-50 dark:bg-slate-950/90 sticky top-0 z-10 text-slate-600 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 backdrop-blur-xl">
                                    <tr>
                                        <th className="px-6 py-4 w-[30%]">Identity & Principal Name</th>
                                        <th className="px-6 py-4 w-[20%]">Operation</th>
                                        <th className="px-6 py-4 w-[25%]">Activity Date</th>
                                        <th className="px-6 py-4 w-[25%]">Client IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/10">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-24 text-center">
                                            <div className="flex flex-col items-center opacity-30">
                                                {isLoading ? (
                                                    <>
                                                        <RefreshCw className="w-12 h-12 mb-4 animate-spin text-purple-500" />
                                                        <p className="font-bold text-sm text-slate-600 dark:text-white tracking-widest uppercase">
                                                            Syncing PowerBI Activity Data...
                                                        </p>
                                                    </>
                                                ) : usageData && filteredData.length === 0 ? (
                                                    <>
                                                        <BarChart2 className="w-12 h-12 mb-4 text-slate-400" />
                                                        <p className="font-bold text-sm text-slate-600 dark:text-white tracking-widest uppercase">
                                                            No records found matching criteria
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <BarChart2 className="w-12 h-12 mb-4 text-slate-400" />
                                                        <p className="font-bold text-sm text-slate-600 dark:text-white tracking-widest uppercase">
                                                            Ready to fetch PowerBI usage data
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-2">
                                                            Click "Sync Data" to retrieve audit logs
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* CONNECTION PROMPT - Only show when Cloud not connected */}
            {!cloudConnection?.isConnected && (
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-4 bg-white dark:bg-transparent">
                        <div className="py-4 text-center">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                                <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                                    💡 Connect to Cloud first for PowerBI Usage
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PowerBIUsage;
