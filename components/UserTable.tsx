import React, { useState, useEffect } from 'react';
import {
  MoreVertical, RefreshCw, CheckSquare, Square,
  X, Loader2, ShieldAlert, Zap, Timer, Database,
  Download, ChevronDown, UserPlus, Move, UserCheck, Key,
  Folder, FolderOpen, ChevronRight
} from 'lucide-react';
import { ADUser, ConnectionState, LogEntry } from '../types';
import { apiService } from '../services/apiService';
import { taskManager } from '../services/taskManager';

interface UserTableProps {
  connection: ConnectionState;
  addLog: (message: string, module: LogEntry['module'], level?: LogEntry['level']) => void;
}

const UserTable: React.FC<UserTableProps> = ({ connection, addLog }) => {
  const [users, setUsers] = useState<ADUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [actioningUsers, setActioningUsers] = useState<Set<string>>(new Set());
  const [userActionTypes, setUserActionTypes] = useState<Map<string, string>>(new Map());
  const [perfMetrics, setPerfMetrics] = useState<{ count: number; duration: number; totalAvailable?: number; isLimited?: boolean } | null>(null);
  const [domainInfo, setDomainInfo] = useState<{ upns: string[], ous: { Name: string, DN: string }[] }>({ upns: [], ous: [] });
  const [showOUPopup, setShowOUPopup] = useState(false);
  const [showUPNPopup, setShowUPNPopup] = useState(false);
  const [selectedOU, setSelectedOU] = useState<{ name: string, dn: string } | null>(null);

  // Helper function to build OU tree structure
  const buildOUTree = (ous: { Name: string, DN: string }[]) => {
    const tree: any = {};

    // Sort OUs by DN depth (root first, then children)
    const sortedOUs = ous.sort((a, b) => a.DN.split(',').length - b.DN.split(',').length);

    sortedOUs.forEach(ou => {
      const parts = ou.DN.split(',').reverse(); // Start from domain root
      let current = tree;
      let currentPath = '';

      parts.forEach((part, index) => {
        const trimmedPart = part.trim();

        if (trimmedPart.startsWith('OU=')) {
          const name = trimmedPart.substring(3);
          currentPath = currentPath ? `${trimmedPart},${currentPath}` : trimmedPart;

          if (!current[name]) {
            current[name] = {
              name,
              dn: ou.DN, // Full DN for this OU
              children: {},
              isOU: true,
              path: currentPath
            };
          }
          current = current[name].children;
        } else if (trimmedPart.startsWith('DC=')) {
          const name = trimmedPart.substring(3);
          currentPath = currentPath ? `${trimmedPart},${currentPath}` : trimmedPart;

          if (!current[name]) {
            current[name] = {
              name,
              dn: '',
              children: {},
              isOU: false,
              isDomain: true,
              path: currentPath
            };
          }
          current = current[name].children;
        }
      });
    });

    return tree;
  };

  // Recursive component for OU tree rendering
  const OUTreeNode: React.FC<{ node: any, level: number, onSelect: (dn: string, name: string) => void }> = ({ node, level, onSelect }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
    const hasChildren = Object.keys(node.children).length > 0;

    return (
      <div>
        <div
          className={`flex items-center gap-1 p-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer transition-all group ${node.isOU ? 'hover:border-l-2 hover:border-blue-400' : ''
            }`}
          style={{ paddingLeft: `${level * 12 + 4}px` }}
          onClick={() => {
            if (node.isOU && node.dn) {
              onSelect(node.dn, node.name);
            } else if (hasChildren) {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
            >
              <ChevronRight className={`w-2.5 h-2.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}

          {!hasChildren && <div className="w-3" />}

          {node.isOU ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Folder className="w-2.5 h-2.5 text-blue-600 flex-shrink-0" />
              <span className="text-[11px] font-normal text-slate-900 dark:text-white truncate">{node.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-1">
              <FolderOpen className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{node.name}</span>
            </div>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className="ml-1 border-l border-slate-200 dark:border-slate-700">
            {Object.entries(node.children)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, child]: [string, any]) => (
                <OUTreeNode key={key} node={child} level={level + 1} onSelect={onSelect} />
              ))}
          </div>
        )}
      </div>
    );
  };

  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  const [filters, setFilters] = useState({
    status: 'All',
    department: '',
    searchBase: '',
    upnSuffix: '',
    stalledDays: 0,
    passwordAge: 0,
    searchString: ''
  });

  useEffect(() => {
    if (connection.isConnected) {
      addLog(`Identity UI: Active session bound to ${connection.domain}.`, 'AD-USERS', 'info');
    }
  }, [connection.isConnected]);

  useEffect(() => {
    if (connection.isConnected && connection.sessionId) {
      console.log('=== FETCHING DOMAIN INFO ===');
      console.log('Backend URL:', connection.backendUrl);
      console.log('Session ID:', connection.sessionId);

      apiService.getDomainInfo(connection.backendUrl, connection.sessionId)
        .then(data => {
          console.log('=== RAW API RESPONSE ===');
          console.log('Full response:', JSON.stringify(data, null, 2));
          console.log('Response keys:', Object.keys(data));

          // Parse OUs from detail field if JSON parse failed on backend
          let ous: { Name: string, DN: string }[] = [];
          let upns: string[] = [];

          // Handle UPN suffixes
          const rawUpns = data.upnSuffixes || data.UPNSuffixes || data.upn || [];
          upns = Array.isArray(rawUpns) ? rawUpns : (rawUpns ? [rawUpns] : []);

          // Check if backend had parse error but data is in detail field
          if (data.error === "JSON Parse Error" && data.detail && typeof data.detail === 'string') {
            console.log('=== PARSING OUs FROM DETAIL FIELD ===');

            // Parse OU lines from detail string
            const ouLines = data.detail.split('\n').filter((line: string) => line.startsWith('OU: '));
            console.log('Found OU lines:', ouLines.length);

            ous = ouLines.map((line: string) => {
              // Format: "OU: Name - DN"
              const match = line.match(/^OU: (.+?) - (.+)$/);
              if (match) {
                return {
                  Name: match[1].trim(),
                  DN: match[2].trim()
                };
              }
              return null;
            }).filter((ou: any) => ou !== null);

            console.log('Parsed OUs from detail:', ous.length);
            addLog(`Domain Meta: ${ous.length} OUs parsed from response.`, 'AD-USERS', 'success');

          } else if (data.error && !data.detail?.includes('Found')) {
            // Real error, not just parse error
            addLog(`Domain Meta Failure: ${data.detail || data.error}`, 'AD-USERS', 'error');
            setDomainInfo({ upns, ous: [] });
            return;
          } else {
            // Normal case - OUs already in array format
            const rawOus = data.OUs || data.ous || data.organizationalUnits || [];
            let ouList = Array.isArray(rawOus) ? rawOus : (rawOus ? [rawOus] : []);

            ouList = ouList.filter((o: any) => {
              if (!o) return false;
              const hasName = o.Name || o.name || o.NAME;
              const hasDN = o.DistinguishedName || o.DN || o.distinguishedName || o.dn;
              return hasName && hasDN;
            });

            ous = ouList.map((o: any) => ({
              Name: o.Name || o.name || o.NAME || 'Unknown',
              DN: o.DistinguishedName || o.DN || o.distinguishedName || o.dn || ''
            })).filter(ou => ou.DN);

            if (ous.length > 0) {
              addLog(`Domain Meta: ${ous.length} OUs discovered.`, 'AD-USERS', 'success');
            } else {
              addLog(`Domain Meta: No OUs found in response.`, 'AD-USERS', 'warning');
            }
          }

          console.log('=== FINAL PROCESSED OUs ===');
          console.log('Count:', ous.length);
          console.log('Sample OUs:', ous.slice(0, 5));

          setDomainInfo({ upns, ous });
        })
        .catch((err) => {
          console.error('=== API ERROR ===');
          console.error('Error:', err);
          console.error('Error message:', err.message);
          console.error('Error stack:', err.stack);
          addLog(`Gateway Connectivity Error: ${err.message}`, 'SYSTEM', 'error');
        });
    }
  }, [connection.isConnected, connection.sessionId]);

  const handleFetch = async () => {
    if (!connection.sessionId) return;

    // Create background task
    const taskId = taskManager.createTask(
      'AD_FETCH',
      (progress, message) => {
        // Progress callback - could update UI if needed
        console.log(`AD Fetch Progress: ${progress}% - ${message}`);
      },
      (result) => {
        // Success callback
        if (result.error || result.status === 'error') {
          setUsers([]);
        } else {
          const userList = Array.isArray(result.users) ? result.users : (result.users ? [result.users] : []);
          setUsers(userList);
          setPerfMetrics({
            count: result.count || 0,
            duration: result.duration || 0,
            totalAvailable: result.totalAvailable,
            isLimited: result.isLimited
          });
          addLog(`Policy Scan: ${result.count} identities synchronized.`, 'AD-USERS', 'success');
        }
        setIsFetching(false);
      },
      (error) => {
        // Error callback
        addLog(`Network Protocol Error: ${error}`, 'GATEWAY', 'error');
        setIsFetching(false);
      }
    );

    setIsFetching(true);

    try {
      // Update task progress
      taskManager.updateTask(taskId, {
        progress: 10,
        message: 'Connecting to Domain Controller...'
      });

      taskManager.updateTask(taskId, {
        progress: 30,
        message: 'Executing LDAP query...'
      });

      const result = await apiService.fetchUsers(connection.backendUrl, connection.sessionId, filters);

      // Debug logging
      console.log('=== FETCH USERS RESULT ===');
      console.log('Result:', JSON.stringify(result, null, 2));
      console.log('Users array:', result.users);
      console.log('Users count:', result.users?.length);

      taskManager.updateTask(taskId, {
        progress: 80,
        message: 'Processing user data...'
      });

      // Complete the task
      taskManager.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        message: 'AD fetch completed successfully',
        result
      });

    } catch (e: any) {
      // Error the task
      taskManager.updateTask(taskId, {
        status: 'error',
        message: 'AD fetch failed',
        error: e.message
      });
    }
  };

  const handleBulkAction = async (action: string, targetValue?: string) => {
    if (selectedIds.size === 0 || !connection.sessionId) return;
    setIsActing(true);

    // Set animation states for selected users
    setActioningUsers(new Set(selectedIds));
    const actionMap = new Map();
    selectedIds.forEach(id => actionMap.set(id, action));
    setUserActionTypes(actionMap);

    try {
      await apiService.bulkAction(connection.backendUrl, connection.sessionId, action, Array.from(selectedIds), targetValue);

      // Keep animation for a bit longer to show completion
      setTimeout(() => {
        setActioningUsers(new Set());
        setUserActionTypes(new Map());
        handleFetch();
        setSelectedIds(new Set());
      }, 1500);
    } catch (e: any) {
      addLog(`Action Fault: ${e.message}`, 'AD-USERS', 'error');
      setActioningUsers(new Set());
      setUserActionTypes(new Map());
    } finally {
      setIsActing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length && users.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(users.map(u => u.id)));
  };

  const exportData = (format: 'csv' | 'json') => {
    if (users.length === 0) return;
    const blob = format === 'csv'
      ? new Blob([[['Name', 'SAM', 'Email', 'Status', 'Dept', 'DN'].join(','), ...users.map(u => [u.name, u.samAccountName, u.email, u.status, u.department, u.distinguishedName].join(','))].join('\n')], { type: 'text/csv' })
      : new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Hyperion_Export.${format}`;
    link.click();
  };

  if (!connection.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-slate-100 dark:bg-slate-900/20 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-[3rem] text-center">
        <ShieldAlert className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-6" />
        <h3 className="text-xl font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Turbo LDAP Offline</h3>
        <p className="text-slate-500 mt-2 text-sm max-w-sm">Establish a secure session to enable real-time object management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">

      {/* PERFORMANCE METRIC BADGE */}
      {perfMetrics && (
        <div className="flex items-center flex-wrap gap-3">
          <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
            <Timer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              {perfMetrics.duration}ms Response Time
            </span>
          </div>
          <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
            <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              {perfMetrics.count.toLocaleString()} Objects Cached
            </span>
          </div>
        </div>
      )}

      {/* COMPACT FILTER PANEL */}
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between p-2 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-transparent">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-blue-600 dark:text-blue-500" />
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Advanced Filters</span>
          </div>
          <button onClick={() => setIsFilterCollapsed(!isFilterCollapsed)} className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all hover:scale-110 active:scale-95">
            <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isFilterCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {!isFilterCollapsed && (
          <div className="p-2.5 bg-white dark:bg-transparent">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              <div className="space-y-0.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Quick Search</label>
                <textarea
                  placeholder="Name, SAM, UPN... (one per line for multiple users)"
                  value={filters.searchString}
                  onChange={(e) => setFilters({ ...filters, searchString: e.target.value })}
                  className="w-full h-14 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none font-medium"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status & Age</label>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1.5">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={filters.status === 'All' || filters.status === 'Enabled'} onChange={() => { }} className="w-3 h-3 text-green-600 rounded focus:ring-green-500" />
                      <span className="text-[10px] text-green-700 dark:text-green-400 font-black uppercase">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={filters.status === 'All' || filters.status === 'Disabled'} onChange={() => { }} className="w-3 h-3 text-red-600 rounded focus:ring-red-500" />
                      <span className="text-[10px] text-red-700 dark:text-red-400 font-black uppercase">Disabled</span>
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase">Stalled:</span>
                      <input type="number" value={filters.stalledDays || ''} onChange={(e) => setFilters({ ...filters, stalledDays: parseInt(e.target.value) || 0 })} className="w-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 text-[10px] text-slate-900 dark:text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Domain Scope</label>
                <div className="space-y-2">
                  <select value={filters.upnSuffix} onChange={(e) => setFilters({ ...filters, upnSuffix: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 dark:text-white outline-none cursor-pointer">
                    <option value="">All Domains</option>
                    {domainInfo.upns.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
              <button onClick={handleFetch} disabled={isFetching} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 hover:shadow-lg hover:shadow-blue-600/20">
                {isFetching ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                Execute Policy Scan
              </button>
              <div className="flex gap-1">
                <button onClick={() => exportData('csv')} className="p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95 shadow-sm">
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DATA GRID */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden relative shadow-xl bg-white dark:bg-slate-950/20">
        <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
          <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
            <thead className="bg-slate-50 dark:bg-slate-950/80 sticky top-0 z-10 text-slate-600 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 w-16">
                  <button onClick={toggleSelectAll} className="hover:scale-110 transition-transform">
                    {selectedIds.size === users.length && users.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />}
                  </button>
                </th>
                <th className="px-6 py-4 w-1/4">User Identity</th>
                <th className="px-6 py-4 w-36">Account Status</th>
                <th className="px-6 py-4">Department / OU</th>
                <th className="px-6 py-4">Security Context</th>
                <th className="px-6 py-4 w-20 text-right pr-10">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <Zap className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="font-black text-sm text-slate-400 uppercase tracking-widest">Awaiting Command Execution</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isProcessing = actioningUsers.has(user.id);
                  const actionType = userActionTypes.get(user.id);

                  // Define animation classes based on action type
                  let animationClass = '';
                  let avatarAnimation = '';

                  if (isProcessing) {
                    switch (actionType) {
                      case 'enable':
                        animationClass = 'animate-pulse bg-gradient-to-r from-gray-200 via-green-100 to-green-200 dark:from-gray-800 dark:via-green-900 dark:to-green-800';
                        avatarAnimation = 'animate-bounce bg-gradient-to-br from-gray-400 via-green-500 to-green-600';
                        break;
                      case 'disable':
                        animationClass = 'animate-pulse bg-gradient-to-r from-green-100 via-gray-200 to-gray-300 dark:from-green-900 dark:via-gray-800 dark:to-gray-900';
                        avatarAnimation = 'animate-pulse bg-gradient-to-br from-green-500 via-gray-400 to-gray-600';
                        break;
                      case 'resetPassword':
                        animationClass = 'animate-pulse bg-gradient-to-r from-orange-100 via-yellow-100 to-orange-100 dark:from-orange-900 dark:via-yellow-900 dark:to-orange-900';
                        avatarAnimation = 'animate-spin bg-gradient-to-br from-orange-500 via-yellow-500 to-orange-600';
                        break;
                      case 'move':
                        animationClass = 'animate-pulse bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-100 dark:from-blue-900 dark:via-indigo-900 dark:to-blue-900';
                        avatarAnimation = 'animate-bounce bg-gradient-to-br from-blue-500 via-indigo-500 to-blue-600';
                        break;
                      case 'suffix':
                        animationClass = 'animate-pulse bg-gradient-to-r from-purple-100 via-pink-100 to-purple-100 dark:from-purple-900 dark:via-pink-900 dark:to-purple-900';
                        avatarAnimation = 'animate-ping bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600';
                        break;
                      default:
                        animationClass = 'animate-pulse bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900';
                        avatarAnimation = 'animate-pulse bg-gradient-to-br from-blue-500 to-indigo-600';
                    }
                  }

                  return (
                    <tr key={user.id} className={`hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:border-l-2 hover:border-l-indigo-400 transition-all duration-300 group ${selectedIds.has(user.id) ? 'bg-indigo-50 dark:bg-indigo-600/10 border-l-2 border-l-indigo-500' : ''} ${animationClass}`}>
                      <td className="px-6 py-3.5">
                        <button onClick={() => { const n = new Set(selectedIds); n.has(user.id) ? n.delete(user.id) : n.add(user.id); setSelectedIds(n); }} className="hover:scale-110 transition-transform">
                          {selectedIds.has(user.id) ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400" />}
                        </button>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center font-black text-xs text-white transition-all duration-500 ${avatarAnimation || 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'}`}>
                            {isProcessing ? (
                              actionType === 'resetPassword' ? '🔐' :
                                actionType === 'enable' ? '✅' :
                                  actionType === 'disable' ? '❌' :
                                    actionType === 'move' ? '📁' :
                                      actionType === 'suffix' ? '🏷️' : '⚡'
                            ) : (
                              user.name?.substring(0, 2)
                            )}
                          </div>
                          <div className="truncate">
                            <p className={`font-bold text-sm truncate transition-all duration-500 leading-tight ${isProcessing ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                              {user.name}
                              {isProcessing && (
                                <span className="ml-2 text-[10px] animate-pulse">
                                  {actionType === 'enable' ? '🔄 Enabling...' :
                                    actionType === 'disable' ? '🔄 Disabling...' :
                                      actionType === 'resetPassword' ? '🔄 Resetting Password...' :
                                        actionType === 'move' ? '🔄 Moving to OU...' :
                                          actionType === 'suffix' ? '🔄 Changing UPN...' : '🔄 Processing...'}
                                </span>
                              )}
                            </p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-600 font-mono truncate">{user.email || user.samAccountName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${user.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-500' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-500'
                          }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="truncate">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{user.department || 'General'}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-600 font-mono truncate max-w-[200px]">{user.distinguishedName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="space-y-0.5 text-[9px] text-slate-600 dark:text-slate-500 font-mono">
                          <p>Logon: {user.lastLogin}</p>
                          <p>Pass: {user.lastPasswordSet}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right pr-10">
                        <div className="relative group">
                          <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-all hover:scale-110 active:scale-95 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                            <div className="p-1.5 flex flex-wrap gap-1">
                              <div className="group/tooltip relative">
                                <button
                                  onClick={() => {
                                    setSelectedIds(new Set([user.id]));
                                    handleBulkAction('enable', undefined);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all hover:scale-110 active:scale-95 group"
                                >
                                  <UserCheck className="w-3 h-3 text-green-600 group-hover:text-green-500 group-hover:animate-bounce" />
                                </button>
                                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-1.5 py-0.5 bg-black text-white text-[8px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                  Enable User
                                </div>
                              </div>

                              <div className="group/tooltip relative">
                                <button
                                  onClick={() => {
                                    setSelectedIds(new Set([user.id]));
                                    handleBulkAction('disable', undefined);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all group"
                                >
                                  <X className="w-3 h-3 text-red-600 group-hover:text-red-500 group-hover:animate-pulse" />
                                </button>
                                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[9px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap">
                                  Disable User
                                </div>
                              </div>

                              <div className="group/tooltip relative">
                                <button
                                  onClick={() => {
                                    setSelectedIds(new Set([user.id]));
                                    setShowOUPopup(true);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all group"
                                >
                                  <Move className="w-3 h-3 text-blue-600 group-hover:text-blue-500 group-hover:animate-spin" />
                                </button>
                                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[9px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap">
                                  Move to OU
                                </div>
                              </div>

                              <div className="group/tooltip relative">
                                <button
                                  onClick={() => {
                                    setSelectedIds(new Set([user.id]));
                                    setShowUPNPopup(true);
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all group"
                                >
                                  <UserPlus className="w-3 h-3 text-purple-600 group-hover:text-purple-500 group-hover:animate-bounce" />
                                </button>
                                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[9px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap">
                                  Change UPN
                                </div>
                              </div>

                              <div className="group/tooltip relative">
                                <button
                                  onClick={() => {
                                    const password = prompt('Enter new password:');
                                    if (password && password.length >= 8) {
                                      setSelectedIds(new Set([user.id]));
                                      handleBulkAction('resetPassword', password);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all group"
                                >
                                  <Key className="w-3 h-3 text-orange-600 group-hover:text-orange-500 group-hover:animate-pulse" />
                                </button>
                                <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[9px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap">
                                  Reset Password
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-1.5 flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-white px-1">
              <CheckSquare className="w-3 h-3 text-indigo-400" />
              <span className="text-[9px] font-bold">{selectedIds.size}</span>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            <div className="flex items-center gap-2">
              <div className="group relative">
                <button
                  onClick={() => handleBulkAction('enable')}
                  disabled={isActing}
                  className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                >
                  <UserCheck className="w-4 h-4 text-green-500 group-hover:text-green-400 group-hover:animate-bounce" />
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Enable Users
                </div>
              </div>

              <div className="group relative">
                <button
                  onClick={() => handleBulkAction('disable')}
                  disabled={isActing}
                  className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                >
                  <X className="w-4 h-4 text-red-500 group-hover:text-red-400 group-hover:animate-pulse" />
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Disable Users
                </div>
              </div>

              <div className="group relative">
                <button
                  onClick={() => setShowOUPopup(true)}
                  disabled={isActing}
                  className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                >
                  <Move className="w-4 h-4 text-blue-500 group-hover:text-blue-400 group-hover:animate-spin" />
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Move to OU
                </div>
              </div>

              <div className="group relative">
                <button
                  onClick={() => setShowUPNPopup(true)}
                  disabled={isActing}
                  className="p-2 hover:bg-slate-800/50 rounded-lg transition-all disabled:opacity-50 group"
                >
                  <UserPlus className="w-4 h-4 text-purple-500 group-hover:text-purple-400 group-hover:animate-bounce" />
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Change UPN
                </div>
              </div>

              <div className="group relative">
                <button
                  onClick={() => {
                    const password = prompt('Enter new password (will require change at next logon):');
                    if (password && password.length >= 8) {
                      handleBulkAction('resetPassword', password);
                    } else if (password) {
                      alert('Password must be at least 8 characters long.');
                    }
                  }}
                  disabled={isActing}
                  className="p-1.5 hover:bg-slate-800/50 rounded-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-50 group"
                >
                  <Key className="w-3.5 h-3.5 text-orange-500 group-hover:text-orange-400 group-hover:animate-pulse" />
                </button>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  Reset Password
                </div>
              </div>
            </div>

            <div className="w-px h-5 bg-slate-700" />

            <div className="group relative">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 text-slate-400 hover:text-white transition-colors group"
              >
                <X className="w-3 h-3 group-hover:animate-spin" />
              </button>
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Clear Selection
              </div>
            </div>

            {isActing && (
              <div className="flex items-center gap-1 text-blue-400 px-1">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* OU SELECTOR MODAL */}
      {showOUPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl w-80 h-96 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-2.5 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Move className="w-3.5 h-3.5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Move to OU</h3>
              </div>
              <button
                onClick={() => {
                  setShowOUPopup(false);
                  setSelectedOU(null);
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all hover:scale-110 active:scale-95"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            <div className="p-3 flex-1 overflow-y-auto">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Select destination OU for {selectedIds.size} users
                <button
                  onClick={() => {
                    console.log('Manual OU refresh triggered');
                    if (connection.sessionId) {
                      apiService.getDomainInfo(connection.backendUrl, connection.sessionId)
                        .then(data => {
                          console.log('Manual OU fetch result:', data);
                          const rawOus = data.OUs || [];
                          const ouList = Array.isArray(rawOus) ? rawOus : [rawOus];
                          const ous = ouList.map((o: any) => ({ Name: o.Name, DN: o.DistinguishedName }));
                          setDomainInfo(prev => ({ ...prev, ous }));
                        })
                        .catch(err => console.error('Manual OU fetch error:', err));
                    }
                  }}
                  className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                >
                  Refresh OUs
                </button>
              </div>

              {domainInfo.ous.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-2 font-medium">
                    {domainInfo.ous.length} Organizational Units found
                  </div>

                  {/* Hierarchical OU Tree */}
                  <div className="space-y-0.5">
                    {Object.entries(buildOUTree(domainInfo.ous)).map(([key, node]: [string, any]) => (
                      <OUTreeNode
                        key={key}
                        node={node}
                        level={0}
                        onSelect={(dn, name) => {
                          setSelectedOU({ name, dn });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-4">No OUs found</p>

                  {/* Manual OU input as fallback */}
                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      placeholder="Enter OU DN manually (e.g., OU=Users,DC=domain,DC=com)"
                      className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const ouDN = (e.target as HTMLInputElement).value.trim();
                          if (ouDN) {
                            handleBulkAction('move', ouDN);
                            setShowOUPopup(false);
                            setSelectedOU(null);
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-slate-400 mt-1">Press Enter to move users</p>
                  </div>
                </div>
              )}
            </div>

            {/* Selected OU Display and Action Buttons - Always visible at bottom */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
              {selectedOU ? (
                <div className="mb-3">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Selected OU:</div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
                    <div className="text-xs font-medium text-blue-900 dark:text-blue-100">{selectedOU.name}</div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300 font-mono truncate">{selectedOU.dn}</div>
                  </div>
                </div>
              ) : (
                <div className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  Click on an OU above to select it
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowOUPopup(false);
                    setSelectedOU(null);
                  }}
                  className="flex-1 px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedOU) {
                      handleBulkAction('move', selectedOU.dn);
                      setShowOUPopup(false);
                      setSelectedOU(null);
                    }
                  }}
                  disabled={!selectedOU}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded text-xs font-medium transition-colors"
                >
                  Move Users
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPN SUFFIX SELECTOR MODAL */}
      {showUPNPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl w-80 max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-2.5 border-b border-slate-200 dark:border-slate-700 bg-purple-50 dark:bg-purple-900/20">
              <div className="flex items-center gap-2">
                <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change UPN ({selectedIds.size} users)</h3>
              </div>
              <button
                onClick={() => setShowUPNPopup(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all hover:scale-110 active:scale-95"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Select UPN suffix to apply to all selected users
              </div>

              <div className="grid grid-cols-1 gap-3">
                {domainInfo.upns.length > 0 ? (
                  domainInfo.upns.map((upn) => (
                    <div key={upn} className="group relative">
                      <button
                        onClick={() => {
                          handleBulkAction('suffix', upn);
                          setShowUPNPopup(false);
                        }}
                        className="w-full p-4 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all group flex flex-col items-center gap-2"
                      >
                        <UserPlus className="w-6 h-6 text-purple-600 group-hover:text-purple-500 group-hover:animate-bounce" />
                        <div className="text-sm font-bold text-purple-700 dark:text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300">
                          @{upn}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Apply to {selectedIds.size} users
                        </div>
                      </button>
                      <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Change UPN to @{upn}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No UPN suffixes available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;