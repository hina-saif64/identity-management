/**
 * Demo PowerBI Usage - PowerBI analytics and management with mock data
 */

import React, { useState, useMemo } from 'react';
import { BarChart3, Search, Filter, Download, RefreshCw, Users, Folder, FileText, Database, TrendingUp, AlertTriangle } from 'lucide-react';
import { mockPowerBIUsers, mockPowerBIWorkspaces, mockPowerBIReports, mockPowerBISummary, MockPowerBIUser, MockPowerBIWorkspace, MockPowerBIReport } from '../data/mockPowerBI';

interface DemoPowerBIProps {
  cloudConnection: any;
  addLog: (message: string, module: string, level?: string) => void;
}

export const DemoPowerBI: React.FC<DemoPowerBIProps> = ({ addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterLicense, setFilterLicense] = useState<string>('all');
  const [filterWorkspaceType, setFilterWorkspaceType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [viewMode, setViewMode] = useState<'users' | 'workspaces' | 'reports'>('users');

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    let users = mockPowerBIUsers;

    if (searchTerm) {
      users = users.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userPrincipalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterLicense !== 'all') {
      users = users.filter(user => user.licenseType.toLowerCase() === filterLicense);
    }

    if (filterStatus !== 'all') {
      users = users.filter(user => {
        if (filterStatus === 'active') return user.isActive;
        if (filterStatus === 'inactive') return !user.isActive;
        return true;
      });
    }

    return users;
  }, [searchTerm, filterLicense, filterStatus]);

  // Filter workspaces
  const filteredWorkspaces = useMemo(() => {
    let workspaces = mockPowerBIWorkspaces;

    if (searchTerm) {
      workspaces = workspaces.filter(workspace => 
        workspace.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterWorkspaceType !== 'all') {
      workspaces = workspaces.filter(workspace => workspace.type.toLowerCase() === filterWorkspaceType);
    }

    if (filterStatus !== 'all') {
      workspaces = workspaces.filter(workspace => workspace.state.toLowerCase() === filterStatus);
    }

    return workspaces;
  }, [searchTerm, filterWorkspaceType, filterStatus]);

  // Filter reports
  const filteredReports = useMemo(() => {
    let reports = mockPowerBIReports;

    if (searchTerm) {
      reports = reports.filter(report => 
        report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.workspaceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      reports = reports.filter(report => {
        if (filterStatus === 'published') return report.isPublished;
        if (filterStatus === 'unpublished') return !report.isPublished;
        return true;
      });
    }

    return reports;
  }, [searchTerm, filterStatus]);

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    const currentItems = viewMode === 'users' ? filteredUsers : 
                        viewMode === 'workspaces' ? filteredWorkspaces : filteredReports;
    
    if (selectedItems.size === currentItems.length) {
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedItems(new Set(currentItems.map(item => item.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = (action: string) => {
    setIsLoading(true);
    addLog(`Executing ${action} on ${selectedItems.size} ${viewMode}`, 'PowerBI Usage');
    
    setTimeout(() => {
      addLog(`${action} completed successfully for ${selectedItems.size} ${viewMode}`, 'PowerBI Usage', 'success');
      setSelectedItems(new Set());
      setShowBulkActions(false);
      setIsLoading(false);
    }, 2000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    addLog('Refreshing PowerBI usage data...', 'PowerBI Usage');
    
    setTimeout(() => {
      addLog('PowerBI usage data refreshed successfully', 'PowerBI Usage', 'success');
      setIsLoading(false);
    }, 1500);
  };

  const getLicenseColor = (license: string) => {
    switch (license) {
      case 'Premium': return 'text-purple-600 bg-purple-100';
      case 'Pro': return 'text-blue-600 bg-blue-100';
      case 'Free': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getWorkspaceTypeColor = (type: string) => {
    switch (type) {
      case 'Premium': return 'text-purple-600 bg-purple-100';
      case 'Group': return 'text-blue-600 bg-blue-100';
      case 'Personal': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Active': return 'text-green-600 bg-green-100';
      case 'Orphaned': return 'text-yellow-600 bg-yellow-100';
      case 'Deleted': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <BarChart3 className="w-6 h-6 mr-2" />
            PowerBI Usage Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Monitor PowerBI adoption, usage patterns, and license optimization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => {
                setViewMode('users');
                setSelectedItems(new Set());
                setShowBulkActions(false);
              }}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'users'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => {
                setViewMode('workspaces');
                setSelectedItems(new Set());
                setShowBulkActions(false);
              }}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'workspaces'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Workspaces
            </button>
            <button
              onClick={() => {
                setViewMode('reports');
                setSelectedItems(new Set());
                setShowBulkActions(false);
              }}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'reports'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Reports
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockPowerBISummary.totalUsers}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Users</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-green-600">{mockPowerBISummary.activeUsers}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Active Users</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-purple-600">{mockPowerBISummary.premiumLicenses}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Premium Licenses</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-blue-600">{mockPowerBISummary.totalWorkspaces}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Workspaces</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-orange-600">{mockPowerBISummary.totalReports}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Reports</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-red-600">{mockPowerBISummary.orphanedWorkspaces}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Orphaned</div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Total Views</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {mockPowerBISummary.totalViews.toLocaleString()}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Across all reports</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Storage Used</h3>
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {(mockPowerBISummary.totalStorage / 1024).toFixed(1)} GB
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Across all workspaces</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Avg Report Size</h3>
            <FileText className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {mockPowerBISummary.averageReportSize} MB
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Per report</div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedItems.size} {viewMode} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {viewMode === 'users' && (
                <>
                  <button
                    onClick={() => handleBulkAction('Assign Pro License')}
                    disabled={isLoading}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Assign Pro License
                  </button>
                  <button
                    onClick={() => handleBulkAction('Remove License')}
                    disabled={isLoading}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    Remove License
                  </button>
                </>
              )}
              {viewMode === 'workspaces' && (
                <>
                  <button
                    onClick={() => handleBulkAction('Archive Workspace')}
                    disabled={isLoading}
                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Archive
                  </button>
                  <button
                    onClick={() => handleBulkAction('Delete Workspace')}
                    disabled={isLoading}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              )}
              {viewMode === 'reports' && (
                <>
                  <button
                    onClick={() => handleBulkAction('Publish Report')}
                    disabled={isLoading}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    Publish
                  </button>
                  <button
                    onClick={() => handleBulkAction('Delete Report')}
                    disabled={isLoading}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder={`Search ${viewMode}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
          
          {viewMode === 'users' && (
            <>
              <select
                value={filterLicense}
                onChange={(e) => setFilterLicense(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              >
                <option value="all">All Licenses</option>
                <option value="premium">Premium</option>
                <option value="pro">Pro</option>
                <option value="free">Free</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </>
          )}

          {viewMode === 'workspaces' && (
            <>
              <select
                value={filterWorkspaceType}
                onChange={(e) => setFilterWorkspaceType(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="premium">Premium</option>
                <option value="group">Group</option>
                <option value="personal">Personal</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              >
                <option value="all">All States</option>
                <option value="active">Active</option>
                <option value="orphaned">Orphaned</option>
                <option value="deleted">Deleted</option>
              </select>
            </>
          )}

          {viewMode === 'reports' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All Reports</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          )}

          <button className="flex items-center px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === (viewMode === 'users' ? filteredUsers.length : viewMode === 'workspaces' ? filteredWorkspaces.length : filteredReports.length) && 
                             (viewMode === 'users' ? filteredUsers.length : viewMode === 'workspaces' ? filteredWorkspaces.length : filteredReports.length) > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                {viewMode === 'users' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">License</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Report Views</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Activity</th>
                  </>
                )}
                {viewMode === 'workspaces' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Workspace</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">State</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Users</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Content</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Storage</th>
                  </>
                )}
                {viewMode === 'reports' && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Report</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Workspace</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Views</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Size</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {viewMode === 'users' && filteredUsers.slice(0, 50).map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(user.id)}
                      onChange={() => handleSelectItem(user.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{user.displayName}</div>
                    <div className="text-sm text-slate-500">{user.userPrincipalName}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{user.department}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getLicenseColor(user.licenseType)}`}>
                      {user.licenseType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${user.isActive ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{user.reportViewCount}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(user.lastActivityDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {viewMode === 'workspaces' && filteredWorkspaces.slice(0, 50).map((workspace) => (
                <tr key={workspace.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(workspace.id)}
                      onChange={() => handleSelectItem(workspace.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{workspace.name}</div>
                    <div className="text-sm text-slate-500">{workspace.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getWorkspaceTypeColor(workspace.type)}`}>
                      {workspace.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStateColor(workspace.state)}`}>
                      {workspace.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{workspace.users}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900 dark:text-white">
                      {workspace.reports}R • {workspace.datasets}D • {workspace.dashboards}DB
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                    {(workspace.storageUsage / 1024).toFixed(1)} GB
                  </td>
                </tr>
              ))}

              {viewMode === 'reports' && filteredReports.slice(0, 50).map((report) => (
                <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(report.id)}
                      onChange={() => handleSelectItem(report.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{report.name}</div>
                    <div className="text-sm text-slate-500">{report.id}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{report.workspaceName}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{report.createdBy}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${report.isPublished ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'}`}>
                      {report.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{report.viewCount}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{report.size} MB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-400">
          Showing {Math.min(50, viewMode === 'users' ? filteredUsers.length : viewMode === 'workspaces' ? filteredWorkspaces.length : filteredReports.length)} of{' '}
          {viewMode === 'users' ? filteredUsers.length : viewMode === 'workspaces' ? filteredWorkspaces.length : filteredReports.length} {viewMode}.
          {(viewMode === 'users' ? filteredUsers.length : viewMode === 'workspaces' ? filteredWorkspaces.length : filteredReports.length) > 50 && ' Use filters to narrow results.'}
        </div>
      </div>
    </div>
  );
};