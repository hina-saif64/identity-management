
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cloud, RefreshCw, ShieldCheck, Mail, MessageSquare, Search, Download,
  BarChart, Filter, Globe, Settings, Cpu, Key, X, Lock, Database,
  ShieldAlert, ChevronDown, Terminal, Cpu as CpuIcon, AlertCircle,
  CheckCircle2, Calendar, Building, Shield, Loader2, ChevronUp, FileSpreadsheet, FileJson, FileText as FilePdf, ArrowUpDown
} from 'lucide-react';
import { ConnectionState, LogEntry, CloudUsageEntry, CloudConnectionState } from '../types';
import { apiService } from '../services/apiService';
import { taskManager } from '../services/taskManager';
import PowerBIUsage from './PowerBIUsage/PowerBIUsage';

interface CloudReportingProps {
  connection: ConnectionState;
  cloudConnection: CloudConnectionState;
  addLog: (message: string, module: LogEntry['module'], level?: LogEntry['level']) => void;
}

const STORAGE_KEY = 'hyp_cloud_v3_vault_cfg';

type SortKey = keyof CloudUsageEntry;
type SortDirection = 'asc' | 'desc';

interface ColumnConfig {
  key: SortKey;
  label: string;
  width: number;
}

const CloudReporting: React.FC<CloudReportingProps> = ({ connection, cloudConnection, addLog }) => {
  const [cloudData, setCloudData] = useState<CloudUsageEntry[]>([]);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gatewayUrl, setGatewayUrl] = useState(connection.backendUrl || 'http://localhost:3001');
  const [showDomainsDropdown, setShowDomainsDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [filterStalledOnly, setFilterStalledOnly] = useState(false);
  const [filterPowerBIOnly, setFilterPowerBIOnly] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'displayName', direction: 'asc' });

  // Column Width Management
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'displayName', label: 'Identity & Principal Name', width: 320 },
    { key: 'licenseType', label: 'SKU Tier', width: 120 },
    { key: 'lastInteractiveSignIn', label: 'Interactive Login', width: 160 },
    { key: 'lastNonInteractiveSignIn', label: 'Non-Interactive', width: 160 },
    { key: 'exchangeLastActivityDate', label: 'Exchange Online', width: 140 },
    { key: 'teamsLastActivityDate', label: 'Teams Activity', width: 140 },
    { key: 'powerBILastActivityDate', label: 'PowerBI Pro', width: 140 },
    { key: 'isStale', label: 'Compliance', width: 120 }
  ]);

  const [showAuthForm, setShowAuthForm] = useState(false);
  const [filterLicense, setFilterLicense] = useState('All');
  const diagnosticRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (diagnosticRef.current) {
      diagnosticRef.current.scrollTop = diagnosticRef.current.scrollHeight;
    }
  }, [syncLogs]);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const fetchUsage = async () => {
    if (!cloudConnection.isConnected) return;

    // Create background task
    const taskId = taskManager.createTask(
      'CLOUD_SYNC',
      (progress, message) => {
        console.log(`Cloud Sync Progress: ${progress}% - ${message}`);
      },
      (result) => {
        // Success callback
        if (result.logs) setSyncLogs(result.logs);
        if (result.users) {
          setCloudData(result.users);
          addLog(`Cloud Sync: ${result.users.length} identities mapped.`, 'CLOUD', 'success');
        }
        setIsFetching(false);
      },
      (error) => {
        // Error callback
        addLog(`Cloud Sync Fault: ${error}`, 'CLOUD', 'error');
        setIsFetching(false);
      }
    );

    setIsFetching(true);

    try {
      // Update task progress
      taskManager.updateTask(taskId, {
        progress: 10,
        message: 'Connecting to Microsoft Graph...'
      });

      taskManager.updateTask(taskId, {
        progress: 30,
        message: 'Fetching user licenses...'
      });

      taskManager.updateTask(taskId, {
        progress: 60,
        message: 'Analyzing Power BI activity...'
      });

      const result = await apiService.fetchCloudUsage(gatewayUrl);

      taskManager.updateTask(taskId, {
        progress: 90,
        message: 'Processing cloud data...'
      });

      // Complete the task
      taskManager.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        message: 'Cloud sync completed successfully',
        result
      });

    } catch (e: any) {
      // Error the task
      taskManager.updateTask(taskId, {
        status: 'error',
        message: 'Cloud sync failed',
        error: e.message
      });
    }
  };

  // Resizing Logic
  const handleResize = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = columns[index].width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (moveEvent.pageX - startX));
      setColumns(prev => {
        const next = [...prev];
        next[index] = { ...next[index], width: newWidth };
        return next;
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [columns]);

  // Sorting & Filtering
  const processedData = [...cloudData]
    .filter(u => {
      const matchesSearch = u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.userPrincipalName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLicense = filterLicense === 'All' || u.licenseType === filterLicense;
      const matchesStalled = !filterStalledOnly || u.isStale;
      const matchesPowerBI = !filterPowerBIOnly || (
        u.hasPowerBILicense &&
        u.powerBILastActivityDate &&
        u.powerBILastActivityDate !== 'N/A' &&
        u.powerBILastActivityDate !== 'Never' &&
        u.powerBILastActivityDate !== 'No usage'
      );
      return matchesSearch && matchesLicense && matchesStalled && matchesPowerBI;
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

  const exportReport = (format: 'csv' | 'xlsx' | 'pdf') => {
    if (processedData.length === 0) return;

    const headers = columns.map(c => c.label).join(',');
    const rows = processedData.map(u => [
      u.displayName,
      u.licenseType,
      u.lastInteractiveSignIn,
      u.lastNonInteractiveSignIn,
      u.exchangeLastActivityDate,
      u.teamsLastActivityDate,
      u.powerBILastActivityDate,
      u.isStale ? 'STALLED' : 'HEALTHY'
    ].join(',')).join('\n');

    const content = `${headers}\n${rows}`;

    if (format === 'pdf') {
      window.print();
      return;
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Hyperion_Governance_Report_${new Date().toISOString().split('T')[0]}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
  };

  const getCount = (tier: string) => cloudData.filter(u => u.licenseType === tier).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24 print:p-0">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl border transition-all ${cloudConnection.isConnected ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            <Cloud className={`w-6 h-6 ${cloudConnection.isConnected ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-slate-400 dark:text-slate-600'}`} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Cloud Governance</h2>
            <div className="flex items-center gap-2 mt-1">
              {cloudConnection.isConnected ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-500 rounded text-[9px] font-bold uppercase tracking-widest border border-green-500/20">
                  <CpuIcon className="w-2.5 h-2.5" /> Direct Graph Protocol Active
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-500 rounded text-[9px] font-bold uppercase tracking-widest border border-green-500/20">
                  <ShieldAlert className="w-2.5 h-2.5" /> Bridge Offline
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!cloudConnection.isConnected ? (
            <div className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-[10px] font-black text-red-600 uppercase tracking-widest">
              <Settings className="w-3.5 h-3.5" /> Not Connected - Use Universal Auth
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <Download className="w-3.5 h-3.5" /> Export Report
                </button>
                {showExportDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[60] p-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => exportReport('csv')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                      <FileJson className="w-4 h-4 text-blue-500" /> CSV Format
                    </button>
                    <button onClick={() => exportReport('xlsx')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                      <FileSpreadsheet className="w-4 h-4 text-green-500" /> Excel (.xlsx)
                    </button>
                    <button onClick={() => exportReport('pdf')} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                      <FilePdf className="w-4 h-4 text-red-500" /> PDF Report
                    </button>
                  </div>
                )}
              </div>
              <button onClick={fetchUsage} disabled={isFetching} className={`px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center gap-2 shadow-xl shadow-indigo-600/20 text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50`}>
                {isFetching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync Directory
              </button>
            </div>
          )}
        </div>
      </div>

      {/* METRICS TILES */}
      {cloudConnection.isConnected && !searchTerm && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 print:hidden">
          <div className="p-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl relative group shadow-sm">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-indigo-500" /> Domains
            </p>
            <button onClick={() => setShowDomainsDropdown(!showDomainsDropdown)} className="flex items-center justify-between w-full px-2 py-1 bg-indigo-500/10 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              <span>{cloudConnection.verifiedDomains.length} Active</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => {
              setFilterStalledOnly(!filterStalledOnly);
              setFilterPowerBIOnly(false);
            }}
            className={`p-3 text-left transition-all rounded-xl border group shadow-sm ${filterStalledOnly
              ? 'bg-red-500/10 border-red-500'
              : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-red-500/50'
              }`}
          >
            <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${filterStalledOnly ? 'text-red-600' : 'text-slate-500'}`}>
              Inactive (90d+)
            </p>
            <h4 className={`text-xl font-black ${filterStalledOnly ? 'text-red-600' : 'text-red-500'}`}>
              {cloudData.filter(u => u.isStale).length}
            </h4>
          </button>

          <button
            onClick={() => setFilterLicense(filterLicense === 'E5' ? 'All' : 'E5')}
            className={`p-3 text-left transition-all rounded-xl border shadow-sm ${filterLicense === 'E5'
              ? 'bg-indigo-600/10 border-indigo-500'
              : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-indigo-500/50'
              }`}
          >
            <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-0.5">M365 E5</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{getCount('E5')}</h4>
          </button>

          <button
            onClick={() => setFilterLicense(filterLicense === 'E3' ? 'All' : 'E3')}
            className={`p-3 text-left transition-all rounded-xl border shadow-sm ${filterLicense === 'E3'
              ? 'bg-blue-600/10 border-blue-500'
              : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-blue-500/50'
              }`}
          >
            <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5">M365 E3</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{getCount('E3')}</h4>
          </button>

          <button
            onClick={() => setFilterLicense(filterLicense === 'E1' ? 'All' : 'E1')}
            className={`p-3 text-left transition-all rounded-xl border shadow-sm ${filterLicense === 'E1'
              ? 'bg-emerald-600/10 border-emerald-500'
              : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
              }`}
          >
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">M365 E1</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{getCount('E1')}</h4>
          </button>

          <button
            onClick={() => setFilterLicense(filterLicense === 'F3' ? 'All' : 'F3')}
            className={`p-3 text-left transition-all rounded-xl border shadow-sm ${filterLicense === 'F3'
              ? 'bg-orange-600/10 border-orange-500'
              : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-orange-500/50'
              }`}
          >
            <p className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-0.5">M365 F3</p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{getCount('F3')}</h4>
          </button>

          <button
            onClick={() => {
              setFilterPowerBIOnly(!filterPowerBIOnly);
              setFilterLicense('All');
              setFilterStalledOnly(false);
              setSearchTerm('');
            }}
            className={`p-3 text-left transition-all rounded-xl border shadow-sm ${filterPowerBIOnly
              ? 'bg-purple-500/10 border-purple-500'
              : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/5'
              } cursor-pointer`}
          >
            <p className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
              <BarChart className="w-3 h-3" /> Power BI (7d)
            </p>
            <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
              {cloudData.filter(u =>
                // Only count users who have Power BI license AND activity
                u.hasPowerBILicense &&
                u.powerBILastActivityDate &&
                u.powerBILastActivityDate !== 'N/A' &&
                u.powerBILastActivityDate !== 'Never' &&
                u.powerBILastActivityDate !== 'No usage'
              ).length}
            </h4>
          </button>
        </div>
      )}

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col lg:flex-row items-center gap-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm print:hidden">
        <div className="flex items-center gap-3 flex-1 px-3 w-full border border-transparent focus-within:border-indigo-500/50 focus-within:bg-indigo-500/[0.02] rounded-xl transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Identity Name or UserPrincipalName..."
            className="bg-transparent border-none outline-none text-xs w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-400 py-1.5"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterLicense}
              onChange={(e) => setFilterLicense(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest cursor-pointer w-full lg:w-36"
            >
              <option value="All">All Licenses</option>
              <option value="E5">M365 E5</option>
              <option value="E3">M365 E3</option>
              <option value="E1">M365 E1</option>
              <option value="F3">M365 F3</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATA GRID */}
      {filterPowerBIOnly ? (
        <PowerBIUsage connection={connection} cloudConnection={cloudConnection} addLog={addLog} />
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden relative shadow-lg bg-white dark:bg-slate-950/20">
          <div className="overflow-x-auto custom-scrollbar max-h-[600px] relative">
            <table className="w-full text-left border-collapse table-fixed" style={{ width: columns.reduce((acc, c) => acc + c.width, 0) }}>
              <thead className="bg-slate-50 dark:bg-slate-950/90 sticky top-0 z-10 text-slate-600 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={col.key}
                      className="px-6 py-4 relative group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                      style={{ width: col.width }}
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {col.label}
                          {sortConfig.key === col.key && (
                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDown className="w-3 h-3 text-indigo-500" />
                          )}
                        </div>
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                      </div>
                      {/* Resize Handle */}
                      <div
                        onMouseDown={(e) => handleResize(idx, e)}
                        className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500/0 hover:bg-indigo-500/50 cursor-col-resize transition-colors z-20"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/10">
                {processedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center opacity-30">
                        {isFetching ? <RefreshCw className="w-12 h-12 mb-4 animate-spin text-indigo-500" /> : <BarChart className="w-12 h-12 mb-4" />}
                        <p className="font-bold text-sm text-slate-600 dark:text-white tracking-widest uppercase">
                          {isFetching ? "Syncing Identity Universe..." : "No records found matching criteria"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedData.map((user) => (
                    <tr key={user.userPrincipalName} className={`hover:bg-indigo-500/[0.03] transition-colors group ${user.isStale ? 'bg-red-500/[0.02]' : ''}`}>
                      <td className="px-6 py-2 truncate" style={{ width: columns[0].width }}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[9px] border ${user.licenseType === 'E5' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' :
                            user.licenseType === 'E3' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                              'bg-slate-100 dark:bg-slate-800/30 text-slate-500 border-slate-200'
                            }`}>{user.licenseType}</div>
                          <div className="truncate">
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate leading-none">{user.displayName}</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-600 font-mono mt-1.5 truncate">{user.userPrincipalName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-2 text-[10px] font-black text-slate-400 uppercase" style={{ width: columns[1].width }}>
                        {user.licenseType}
                      </td>
                      <td className="px-6 py-2 font-mono text-[10px] text-slate-600 dark:text-slate-300" style={{ width: columns[2].width }}>
                        {user.lastInteractiveSignIn || 'Never'}
                      </td>
                      <td className="px-6 py-2 font-mono text-[10px] text-slate-600 dark:text-slate-300" style={{ width: columns[3].width }}>
                        {user.lastNonInteractiveSignIn || 'Never'}
                      </td>
                      <td className="px-6 py-2" style={{ width: columns[4].width }}>
                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">{user.exchangeLastActivityDate || 'Idle'}</span>
                      </td>
                      <td className="px-6 py-2" style={{ width: columns[5].width }}>
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">{user.teamsLastActivityDate || 'Idle'}</span>
                      </td>
                      <td className="px-6 py-2" style={{ width: columns[6].width }}>
                        <span className={`text-[10px] font-mono ${user.powerBILastActivityDate !== 'N/A' && !user.powerBILastActivityDate?.includes('No usage') && !user.powerBILastActivityDate?.includes('Never') ? 'text-indigo-600 font-black' : 'text-slate-400'}`}>
                          {user.powerBILastActivityDate || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-2 text-center" style={{ width: columns[7].width }}>
                        {user.isStale ? (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20 rounded-md text-[8px] font-black uppercase">Stalled</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20 rounded-md text-[8px] font-black uppercase">Healthy</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUTH MODAL & LOGS REMAIN THE SAME BUT MODAL ADAPTED */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass border border-slate-700 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                  <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Cloud Configuration</h2>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Entra ID Authentication</p>
                </div>
              </div>
              <button onClick={() => setShowAuthForm(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <p className="text-slate-400 text-sm text-center">
                  Cloud authentication is now handled through the Universal Authentication System.
                  <br />
                  Please use the "Universal Connect" button in the header to authenticate.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudReporting;
