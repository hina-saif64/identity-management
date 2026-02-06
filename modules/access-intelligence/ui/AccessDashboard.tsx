import React, { useState } from 'react';
import { CloudConnectionState, LogEntry } from '../../../types';
import AccessTopologyPage from './AccessTopologyPage';
import { BlastRadiusPage } from './BlastRadiusPage';
import { RoleInventory } from './RoleInventory';
import { ShadowAdminPanel } from './ShadowAdminPanel'; // Import new component
import { LayoutList, Share2, Network, LayoutGrid, ShieldAlert } from 'lucide-react'; // Add ShieldAlert

interface AccessDashboardProps {
    cloudConnection: CloudConnectionState;
    addLog: (message: string, module: LogEntry['module'], type: LogEntry['level']) => void;
    theme: 'light' | 'dark';
}

type Tab = 'inventory' | 'graph' | 'blast' | 'shadow'; // Add 'shadow'

export const AccessDashboard: React.FC<AccessDashboardProps> = ({ cloudConnection, addLog, theme }) => {
    const [activeTab, setActiveTab] = useState<Tab>('inventory');
    const [graphLoaded, setGraphLoaded] = useState(false);

    // Persistence State
    const [inventoryState, setInventoryState] = useState<any>({
        passports: [],
        loading: true,
        lastFetched: null
    });

    const [blastState, setBlastState] = useState<any>({
        subscriptions: [],
        selectedSub: '',
        fortresses: [],
        loading: true,
        error: null
    });

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === 'graph' && !graphLoaded) {
            setGraphLoaded(true);
        }
    };

    return (
        // Apply the 'dark' class conditionally if the theme is dark.
        // This ensures child components using 'dark:' tailwind modifiers work correctly.
        <div className={`h-full flex flex-col gap-4 ${theme === 'dark' ? 'dark' : ''}`}>

            {/* Header / Tabs */}
            <div className={`flex items-center gap-4 border-b pb-2 px-2 transition-colors duration-300 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                <button
                    onClick={() => handleTabChange('inventory')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'inventory'
                        ? (theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20')
                        : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
                        }`}
                >
                    <LayoutList className="w-4 h-4" />
                    Role Inventory
                </button>
                <button
                    onClick={() => handleTabChange('graph')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'graph'
                        ? (theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20')
                        : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
                        }`}
                >
                    Info-Graph
                </button>
                <button
                    onClick={() => handleTabChange('blast')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'blast'
                        ? (theme === 'dark' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20')
                        : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100')
                        }`}
                >
                    <LayoutGrid className="w-4 h-4" />
                    Blast Radius
                </button>
                <button
                    onClick={() => handleTabChange('shadow')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'shadow'
                        ? (theme === 'dark' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20')
                        : (theme === 'dark' ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800/50' : 'text-slate-500 hover:text-red-600 hover:bg-red-50')
                        }`}
                >
                    <ShieldAlert className="w-4 h-4" />
                    Shadow Hunter
                </button>
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-hidden relative rounded-xl border transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0f1a] border-slate-800' : 'bg-white border-slate-200'}`}>
                {activeTab === 'inventory' && (
                    <RoleInventory
                        cloudConnection={cloudConnection}
                        addLog={addLog}
                        persistedState={inventoryState}
                        onStateChange={setInventoryState}
                    />
                )}
                {activeTab === 'blast' && (
                    <BlastRadiusPage
                        cloudConnection={cloudConnection}
                        addLog={addLog}
                        persistedState={blastState}
                        onStateChange={setBlastState}
                    />
                )}
                {activeTab === 'shadow' && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-4">
                        <ShadowAdminPanel
                            credentials={{
                                tenantId: cloudConnection.tenantId,
                                appId: cloudConnection.appId,
                                vaultName: cloudConnection.vaultName,
                                secretName: cloudConnection.secretName
                            }}
                        />
                    </div>
                )}

                <div
                    className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'graph' ? 'opacity-100 z-10' : 'opacity-0 -z-10 pointer-events-none'}`}
                >
                    {graphLoaded && <AccessTopologyPage cloudConnection={cloudConnection} addLog={addLog} />}
                </div>
            </div>
        </div>
    );
};
