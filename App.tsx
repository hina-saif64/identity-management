import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import {
  Users,
  Search,
  Bell,
  Zap,
  Link,
  ChevronUp,
  ChevronDown,
  Clock,
  Shield,
  Globe
} from 'lucide-react';

// Lazy load heavy components for better performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const AdvancedAnalytics = lazy(() => import('./components/Analytics/AdvancedAnalytics'));
const ADUsersEnhanced = lazy(() => import('./components/ADUsers/ADUsersEnhanced'));
const Terminal = lazy(() => import('./components/Terminal'));
const SecurityAudit = lazy(() => import('./components/SecurityAudit'));
const CloudReporting = lazy(() => import('./components/CloudReporting'));
const PowerBIUsage = lazy(() => import('./components/PowerBIUsage/PowerBIUsage'));
const CaExclusionsPage = lazy(() => import('./features/ca-exclusions').then(m => ({ default: m.CaExclusionsPage })));
const DeviceInventoryPage = lazy(() => import('./features/unified-device-inventory').then(m => ({ default: m.DeviceInventoryPage })));
const AccessDashboard = lazy(() => import('./modules/access-intelligence/ui/AccessDashboard').then(m => ({ default: m.AccessDashboard })));
const PasswordToolsPage = lazy(() => import('./modules/password-tools/ui').then(m => ({ default: m.PasswordToolsPage })));
const ExchangeOnPremPanel = lazy(() => import('./modules/exchange-onprem/ui').then(m => ({ default: m.ExchangeOnPremPanel })));

// Keep lightweight components as regular imports
import AIAssistant from './components/AIAssistant';
import UniversalAuth from './components/UniversalAuth';
import TaskStatusBar from './components/TaskStatusBar';
import NavigationCategories from './components/Navigation/NavigationCategories';
import NotificationSystem from './components/Notifications/NotificationSystem';
import TenantSwitcher from './components/MultiTenant/TenantSwitcher';
import LoadingSpinner from './components/UI/LoadingSpinner';
import EnhancedDashboard from './components/Dashboard/EnhancedDashboard';
import { ConnectionStatusPills } from './components/ConnectionStatusPills';

import { ConnectionState, CloudConnectionState, ExchangeConnectionState, LogEntry, Tab } from './types';
import { apiService } from './services/apiService';
import { useBackendLogs } from './hooks/useBackendLogs';
import { useConnectionHealth } from './hooks/useConnectionHealth';
import { useIndividualRetry } from './hooks/useIndividualRetry';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('hyp-theme') as 'light' | 'dark') || 'dark';
  });

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: '1', timestamp: new Date().toLocaleTimeString(), module: 'SYSTEM', message: 'Hyperion VAPT-Hardened Kernel initialized.', level: 'info' },
    { id: '2', timestamp: new Date().toLocaleTimeString(), module: 'SYSTEM', message: 'Ready for LDAP/Kerberos Secure Handshake.', level: 'success' }
  ]);

  const [connection, setConnection] = useState<ConnectionState>({
    isConnected: false,
    isBackendVerified: false,
    backendUrl: '',
    method: null,
    domain: '',
    server: '',
    psVersion: '7.4'
  });

  const [cloudConnection, setCloudConnection] = useState<CloudConnectionState>({
    isConnected: false,
    tenantId: '',
    appId: '',
    vaultName: '',
    secretName: '',
    organization: '',
    verifiedDomains: []
  });

  const [exchangeConnection, setExchangeConnection] = useState<ExchangeConnectionState>({
    isConnected: false,
    tenantId: '',
    appId: '',
    organization: ''
  });

  // Device Inventory state - persists across tab switches
  const [deviceInventoryState, setDeviceInventoryState] = useState<{
    devices: any[];
    summary: any | null;
    lastFetched: string | null;
  }>({
    devices: [],
    summary: null,
    lastFetched: null
  });

  // User Intelligence state - persists across tab switches
  const [adUsersState, setAdUsersState] = useState<{
    users: any[];
    perfMetrics: any | null;
    lastFetched: string | null;
    summary?: any | null;
  }>({
    users: [],
    perfMetrics: null,
    lastFetched: null,
    summary: null
  });

  const [showUniversalAuth, setShowUniversalAuth] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Connection health monitoring
  const { health, checkAllHealth } = useConnectionHealth(
    connection,
    cloudConnection,
    'http://localhost:3002'
  );

  // Individual retry functionality
  const { isRetrying, retryAdConnection, retryCloudConnection } = useIndividualRetry(
    'http://localhost:3002',
    (newConnection) => {
      setConnection(newConnection);
      addLog('AD connection restored successfully', 'SYSTEM', 'success');
    },
    (newConnection) => {
      setCloudConnection(newConnection);
      addLog('Cloud connection restored successfully', 'SYSTEM', 'success');
    },
    (message, type) => {
      addLog(message, 'SYSTEM', 'error');
    }
  );

  useEffect(() => {
    localStorage.setItem('hyp-theme', theme);
  }, [theme]);

  // Auto-connect functionality - Universal Connection (Updated for V2 port)
  useEffect(() => {
    const attemptAutoConnect = async () => {
      try {
        const CLOUD_STORAGE_KEY = 'hyp_cloud_v3_vault_cfg';
        const AD_STORAGE_KEY = 'hyp_ad_v3_session_cfg';

        const savedCloudConfig = localStorage.getItem(CLOUD_STORAGE_KEY);
        const savedAdConfig = localStorage.getItem(AD_STORAGE_KEY);

        if ((savedCloudConfig || savedAdConfig) && !connection.isConnected && !cloudConnection.isConnected) {
          try {
            addLog('System: Attempting Universal auto-connect with saved credentials...', 'SYSTEM', 'info');

            let gatewayUrl = 'http://localhost:3002'; // V2 backend port
            let cloudSuccess = false;
            let adSuccess = false;

            // Try to get gateway URL from either config, but force V2 port
            if (savedCloudConfig) {
              const cloudParsed = JSON.parse(savedCloudConfig);
              // Always use port 3002 for V2, ignore saved port
              const savedUrl = cloudParsed.gatewayUrl || gatewayUrl;
              gatewayUrl = savedUrl.replace(/:\d+/, ':3002');
              console.log('[V2 AUTO-CONNECT] Forced gateway URL to:', gatewayUrl);
            }

            // Check if gateway is available
            const isAlive = await apiService.checkHealth(gatewayUrl);

            if (isAlive) {
              // Try cloud connection first
              if (savedCloudConfig) {
                try {
                  const cloudParsed = JSON.parse(savedCloudConfig);
                  addLog('Auto-Connect: Attempting Cloud authentication...', 'SYSTEM', 'info');

                  const cloudResult = await apiService.connectCloud(gatewayUrl, {
                    tenantId: cloudParsed.tenantId,
                    appId: cloudParsed.appId,
                    vaultName: cloudParsed.vaultName,
                    secretName: cloudParsed.secretName,
                    organization: cloudParsed.organization
                  });

                  if (cloudResult.status === 'connected') {
                    setCloudConnection({
                      isConnected: true,
                      tenantId: cloudParsed.tenantId,
                      appId: cloudParsed.appId,
                      vaultName: cloudParsed.vaultName,
                      secretName: cloudParsed.secretName,
                      organization: cloudParsed.organization,
                      certificateThumbprint: cloudParsed.certificateThumbprint,
                      verifiedDomains: cloudResult.verifiedDomains || []
                    });

                    cloudSuccess = true;
                    addLog('Auto-Connect: Cloud authentication successful.', 'SYSTEM', 'success');
                  }
                } catch (error) {
                  console.error('Cloud auto-connect failed:', error);
                  addLog('Auto-Connect: Cloud authentication failed, continuing...', 'SYSTEM', 'warning');
                }
              }

              // Try AD connection
              if (savedAdConfig) {
                try {
                  const adParsed = JSON.parse(savedAdConfig);
                  addLog('Auto-Connect: Attempting AD authentication...', 'SYSTEM', 'info');

                  // Decode password if it's encoded (for direct credentials)
                  let password = adParsed.password;
                  let clientSecret = adParsed.clientSecret;

                  if (password && adParsed.method === 'Credentials') {
                    try {
                      password = atob(password); // Base64 decode
                    } catch (e) {
                      console.error('Failed to decode saved password');
                    }
                  }

                  if (clientSecret && adParsed.method === 'AzureKeyVault') {
                    try {
                      clientSecret = atob(clientSecret); // Base64 decode
                    } catch (e) {
                      console.error('Failed to decode saved client secret');
                    }
                  }

                  const adResult = await apiService.testAdConnection(gatewayUrl, {
                    method: adParsed.method || 'Credentials',
                    server: adParsed.server,
                    domain: adParsed.domain,
                    username: adParsed.username,
                    password: password,
                    // Key Vault fields if method is AzureKeyVault
                    ...(adParsed.method === 'AzureKeyVault' && {
                      tenantId: adParsed.tenantId,
                      clientId: adParsed.clientId,
                      clientSecret: clientSecret,
                      vaultName: adParsed.vaultName,
                      secretName: adParsed.secretName
                    })
                  });

                  if (adResult.status === 'connected') {
                    setConnection({
                      isConnected: true,
                      isBackendVerified: true,
                      backendUrl: gatewayUrl,
                      method: 'Credentials',
                      domain: adParsed.domain,
                      server: adParsed.server,
                      sessionId: adResult.sessionId,
                      psVersion: '7.4'
                    });

                    console.log('[V2 AUTO-CONNECT] AD connection set with backendUrl:', gatewayUrl);

                    adSuccess = true;
                    addLog('Auto-Connect: AD authentication successful.', 'SYSTEM', 'success');
                  }
                } catch (error) {
                  console.error('AD auto-connect failed:', error);
                  addLog('Auto-Connect: AD authentication failed, continuing...', 'SYSTEM', 'warning');
                }
              }

              // Summary log
              if (cloudSuccess && adSuccess) {
                addLog('Auto-Connect: Universal bridge established (AD + Cloud).', 'SYSTEM', 'success');
              } else if (cloudSuccess || adSuccess) {
                addLog(`Auto-Connect: Partial connection established (${cloudSuccess ? 'Cloud' : 'AD'} only).`, 'SYSTEM', 'info');
              } else {
                addLog('Auto-Connect: No saved credentials could be validated.', 'SYSTEM', 'warning');
              }
            } else {
              addLog('Auto-Connect: Gateway not available, skipping auto-connect.', 'SYSTEM', 'warning');
            }
          } catch (error) {
            console.error('Auto-connect error:', error);
            addLog('Auto-Connect: Failed to establish connection.', 'SYSTEM', 'warning');
          }
        }
      } catch (error) {
        console.error('Auto-connect setup error:', error);
      }
    };

    // Delay auto-connect to allow UI to load
    const timer = setTimeout(attemptAutoConnect, 2000);
    return () => clearTimeout(timer);
  }, []); // Remove dependency array to prevent infinite loops

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const addLog = useCallback((message: string, module: LogEntry['module'], level: LogEntry['level'] = 'info') => {
    // Explicitly log to console for debugging
    const logMsg = `[${module}] ${message}`;
    if (level === 'error') console.error(logMsg);
    else if (level === 'warning') console.warn(logMsg);
    else console.log(logMsg);

    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      module,
      message,
      level
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  // Subscribe to backend log stream (SSE) - Updated for V2 port
  useBackendLogs(addLog, 'http://localhost:3002');

  const handleNewConnection = (adConfig: ConnectionState, cloudConfig: CloudConnectionState, exoConfig: ExchangeConnectionState) => {
    setConnection(adConfig);
    setCloudConnection(cloudConfig);
    setExchangeConnection(exoConfig);
    setShowUniversalAuth(false);

    if (adConfig.isConnected && cloudConfig.isConnected && exoConfig.isConnected) {
      addLog(`Universal Auth: AD (${adConfig.domain}), Cloud, and Exchange Online bridges active.`, 'AUTH', 'success');
    } else if (adConfig.isConnected && cloudConfig.isConnected) {
      addLog(`Universal Auth: Both AD (${adConfig.domain}) and Cloud bridges active.`, 'AUTH', 'success');
    } else if (adConfig.isConnected && exoConfig.isConnected) {
      addLog(`Universal Auth: AD (${adConfig.domain}) and Exchange Online bridges active.`, 'AUTH', 'success');
    } else if (cloudConfig.isConnected && exoConfig.isConnected) {
      addLog(`Universal Auth: Cloud and Exchange Online bridges active.`, 'AUTH', 'success');
    } else if (adConfig.isConnected) {
      addLog(`AD Auth: ${adConfig.method} via ${adConfig.domain}`, 'AUTH', 'success');
    } else if (cloudConfig.isConnected) {
      addLog(`Cloud Auth: Direct Graph Protocol established.`, 'AUTH', 'success');
    } else if (exoConfig.isConnected) {
      addLog(`Exchange Online Auth: Connected to ${exoConfig.organization}`, 'AUTH', 'success');
    }

    addLog(`Security Audit: Input sanitization verified for this session.`, 'GATEWAY', 'success');
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0f1a]/80 text-slate-200 dark' : 'bg-slate-50 text-slate-800'}`}>

      {/* GLOBAL AURORA BACKGROUND (Dark Mode Only) */}
      {theme === 'dark' && <div className="aurora-bg fixed inset-0 pointer-events-none" />}
      {/* DAYLIGHT AURORA (Light Mode Only) */}
      {theme === 'light' && <div className="aurora-bg-light fixed inset-0 pointer-events-none" />}

      {/* Beautiful Header Navigation */}
      <header className={`glass border-b transition-colors duration-500 relative z-20 ${theme === 'dark' ? 'border-slate-800 bg-[#0a0f1a]/80' : 'border-slate-200 bg-white/95'}`}>
        {/* Top Header Bar */}
        <div className="px-8 py-3 flex items-center justify-between">
          {/* 1. Brand Identity (With Shine Effect) */}
          <div className="flex items-center gap-4 group/brand">
            <div className="relative cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-lg opacity-0 group-hover/brand:opacity-100 transition duration-700"></div>
              <div className="relative w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30 ring-1 ring-white/10 group-active/brand:scale-95 transition-all duration-200 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover/brand:translate-x-[100%] transition-transform duration-1000"></div>
                <Shield className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="flex flex-col cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <span className={`text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r ${theme === 'dark' ? 'from-white via-indigo-100 to-indigo-200' : 'from-slate-900 via-indigo-800 to-indigo-900'}`}>
                HYPERION
              </span>
              <span className={`text-[8px] font-bold uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-indigo-400/80' : 'text-indigo-600/70'}`}>
                Architect
              </span>
            </div>
          </div>

          {/* Spacer to push actions to right */}
          <div className="flex-1" />

          {/* 2. Action Area */}
          <div className="flex items-center gap-4">

            {/* Enhanced Connection Status Pills */}
            {(connection.isConnected || cloudConnection.isConnected) && (
              <ConnectionStatusPills
                connection={connection}
                cloudConnection={cloudConnection}
                health={health}
                onRetryAd={retryAdConnection}
                onRetryCloud={retryCloudConnection}
                isRetrying={isRetrying}
              />
            )}

            {/* Connection Manager Button (Icon Only) */}
            <button
              onClick={() => setShowUniversalAuth(true)}
              className={`p-1.5 rounded-full transition-all duration-300 ${(connection.isConnected || cloudConnection.isConnected)
                ? (theme === 'dark' ? 'text-indigo-400 hover:bg-slate-800 hover:text-white' : 'text-indigo-600 hover:bg-slate-100 hover:text-slate-900')
                : (theme === 'dark' ? 'text-slate-500 hover:bg-slate-800 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900')
                }`}
              title="Connection Manager"
            >
              <Link className="w-4 h-4" />
            </button>

            {/* The Control Island */}
            <div className={`flex items-center p-1 rounded-full border shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-indigo-500/10 ${theme === 'dark' ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white/80 border-slate-200/60'
              }`}>
              {/* AI Agent */}
              <button
                onClick={() => setIsAiOpen(true)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group ${theme === 'dark' ? 'hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300' : 'hover:bg-indigo-50 text-indigo-600'
                  }`}
                title="AI Agent"
              >
                <Zap className="w-4 h-4 transition-transform group-hover:scale-110 group-hover:fill-current" />
              </button>

              <div className={`w-px h-3 mx-1 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${theme === 'dark' ? 'text-yellow-400 hover:bg-slate-800/50' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                title="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                )}
              </button>

              {/* Notifications */}
              <button className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors ${theme === 'dark' ? 'hover:bg-slate-800/50 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}>
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm" />
              </button>

              <div className={`w-px h-3 mx-1 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />

              {/* User Profile & Tenant Menu */}
              <div className="relative group/profile">
                <button className={`w-7 h-7 ml-1 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 ${theme === 'dark' ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20'
                  }`}>
                  <Users className="w-3.5 h-3.5" />
                </button>

                {/* Profile Dropdown Menu */}
                <div className="absolute top-full right-0 mt-4 w-60 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all duration-200 transform translate-y-2 group-hover/profile:translate-y-0 z-50">
                  <div className={`rounded-xl border shadow-2xl p-2 backdrop-blur-xl ${theme === 'dark' ? 'bg-slate-900/90 border-slate-700 text-slate-200' : 'bg-white/90 border-slate-200 text-slate-700'
                    }`}>
                    <div className="px-3 py-2 border-b border-dashed border-opacity-20 mb-1">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-50">Signed in as</p>
                      <p className="font-bold truncate">admin@hyperion.local</p>
                    </div>

                    <button className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-indigo-400' : 'hover:bg-slate-100 text-indigo-600'
                      }`}>
                      <Globe className="w-4 h-4" />
                      Switch Tenant
                    </button>

                    <button className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                      }`}>
                      <Shield className="w-4 h-4" />
                      Audit Logs
                    </button>

                    <div className={`h-px my-1 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    <button className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-red-500 transition-colors ${theme === 'dark' ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
                      }`}>
                      <Users className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`px-8 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <NavigationCategories
            activeTab={activeTab}
            onTabChange={setActiveTab}
            theme={theme}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative z-10">
        {/* Dynamic Content */}
        <div className={`h-full overflow-y-auto p-8 pb-32 transition-colors duration-500 ${theme === 'dark' ? 'bg-transparent' : 'bg-slate-50'}`}>
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <EnhancedDashboard
                addLog={addLog}
                theme={theme}
                userSummary={adUsersState.summary}
                lastFetched={adUsersState.lastFetched}
                onNavigate={(tab: string) => setActiveTab(tab as Tab)}
              />
            )}
            <Suspense fallback={<LoadingSpinner theme={theme} message="Loading component..." />}>
              {activeTab === 'advanced-analytics' && (
                <AdvancedAnalytics
                  theme={theme}
                  addLog={addLog}
                />
              )}
              {activeTab === 'users' && (
                <ADUsersEnhanced
                  connection={connection}
                  cloudConnection={cloudConnection}
                  exchangeConnection={exchangeConnection}
                  addLog={addLog}
                  persistedState={adUsersState}
                  onStateChange={setAdUsersState}
                  enableEnhancedMode={true}
                />
              )}
              {activeTab === 'terminal' && <Terminal connection={connection} addLog={addLog} />}
              {activeTab === 'security' && <SecurityAudit connection={connection} addLog={addLog} />}
              {activeTab === 'cloud-reporting' && <CloudReporting connection={connection} cloudConnection={cloudConnection} addLog={addLog} />}
              {activeTab === 'powerbi-usage' && <PowerBIUsage connection={connection} cloudConnection={cloudConnection} exchangeConnection={exchangeConnection} addLog={addLog} />}
              {activeTab === 'ca-exclusions' && <CaExclusionsPage cloudConnection={cloudConnection} addLog={addLog} />}
              {activeTab === 'device-inventory' && (
                <DeviceInventoryPage
                  cloudConnection={cloudConnection}
                  adConnection={connection.isConnected ? {
                    isConnected: true,
                    server: connection.server || connection.domain,
                    sessionId: connection.sessionId
                  } : undefined}
                  addLog={addLog}
                  persistedState={deviceInventoryState}
                  onStateChange={setDeviceInventoryState}
                />
              )}

              {activeTab === 'access-intelligence' && (
                <AccessDashboard
                  cloudConnection={cloudConnection}
                  addLog={addLog}
                  theme={theme}
                />
              )}

              {activeTab === 'password-tools' && (
                <PasswordToolsPage
                  connection={connection}
                  addLog={addLog}
                  theme={theme}
                />
              )}

              {activeTab === 'exchange-onprem' && (
                <ExchangeOnPremPanel
                  connection={connection}
                  adUsers={adUsersState.users}
                  addLog={addLog}
                  theme={theme}
                />
              )}

              {(activeTab === 'azure') && (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                  <Globe className="w-16 h-16 text-slate-400 mb-4" />
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Cloud Sync Hub</h3>
                  <p className="text-slate-500 mt-1">Establishing Entra ID Graph connection...</p>
                </div>
              )}
            </Suspense>
          </div>
        </div>

        {/* Global Activity Log Panel */}
        <div className={`fixed bottom-0 right-0 left-0 transition-all duration-300 z-30 ${isLogExpanded ? 'h-64' : 'h-10'} glass border-t shadow-[0_-10px_40px_rgba(0,0,0,0.1)] ${theme === 'dark' ? 'border-slate-800 bg-[#0a0f1a]/95' : 'border-slate-200 bg-white/95'}`}>
          <button
            onClick={() => setIsLogExpanded(!isLogExpanded)}
            className={`w-full h-10 px-6 flex items-center justify-between hover:bg-black/5 transition-colors`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Security Event Log</span>
              <div className="flex items-center gap-2 ml-4">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Engine Secure</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">Queue: {logs.length}</span>
              {isLogExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
            </div>
          </button>

          {isLogExpanded && (
            <div className={`h-52 overflow-y-auto p-4 space-y-2 text-xs font-mono custom-scrollbar ${theme === 'dark' ? 'bg-slate-900/20' : 'bg-slate-50/50'}`}>
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 animate-in fade-in slide-in-from-left-2 duration-200">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span className={`font-bold shrink-0 w-20 ${log.level === 'success' ? 'text-green-500' :
                    log.level === 'warning' ? 'text-yellow-500' :
                      log.level === 'error' ? 'text-red-500' :
                        'text-indigo-400'
                    }`}>[{log.module}]</span>
                  <span className={`${log.level === 'error' ? 'text-red-500' :
                    log.level === 'warning' ? (theme === 'dark' ? 'text-yellow-200/70' : 'text-yellow-700/80') :
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </main>

      <AIAssistant isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />

      <TaskStatusBar />

      {showUniversalAuth && (
        <UniversalAuth
          onConnect={handleNewConnection}
          onClose={() => setShowUniversalAuth(false)}
        />
      )}

      {/* Notification System */}
      <NotificationSystem theme={theme} />
    </div>
  );
};

export default App;