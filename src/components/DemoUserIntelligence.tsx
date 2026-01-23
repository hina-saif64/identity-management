/**
 * Demo User Intelligence - Complete user management with mock data
 */

import React, { useState, useMemo } from 'react';
import { Users, Search, Filter, Download, RefreshCw, Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { mockUsers, mockUserSummary, MockUser } from '../data/mockUsers';

interface DemoUserIntelligenceProps {
  cloudConnection: any;
  adConnection: any;
  addLog: (message: string, module: string, level?: string) => void;
}

export const DemoUserIntelligence: React.FC<DemoUserIntelligenceProps> = ({ addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterMfa, setFilterMfa] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('');

  // Calculate stale users (90+ days since last sign-in)
  const staleUsers = useMemo(() => {
    return mockUsers.filter(user => {
      const daysSinceLastSignIn = Math.floor((Date.now() - new Date(user.lastSignInDateTime).getTime()) / (24 * 60 * 60 * 1000));
      return daysSinceLastSignIn > 90;
    });
  }, []);

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    let users = mockUsers;

    // Apply active filter first
    if (activeFilter === 'stale') {
      users = staleUsers;
    }

    if (searchTerm) {
      users = users.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userPrincipalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      users = users.filter(user => {
        if (filterStatus === 'enabled') return user.accountEnabled;
        if (filterStatus === 'disabled') return !user.accountEnabled;
        if (filterStatus === 'guest') return user.userType === 'Guest';
        return true;
      });
    }

    if (filterRisk !== 'all') {
      users = users.filter(user => user.riskLevel.toLowerCase() === filterRisk);
    }

    if (filterMfa !== 'all') {
      users = users.filter(user => {
        if (filterMfa === 'enabled') return user.mfaStatus === 'Enabled' || user.mfaStatus === 'Enforced';
        if (filterMfa === 'disabled') return user.mfaStatus === 'Disabled';
        return true;
      });
    }

    return users;
  }, [searchTerm, filterStatus, filterRisk, filterMfa, activeFilter, staleUsers]);

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = (action: string) => {
    setIsLoading(true);
    addLog(`Executing ${action} on ${selectedUsers.size} users`, 'User Intelligence');
    
    setTimeout(() => {
      addLog(`${action} completed successfully for ${selectedUsers.size} users`, 'User Intelligence', 'success');
      setSelectedUsers(new Set());
      setShowBulkActions(false);
      setIsLoading(false);
    }, 2000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    addLog('Refreshing user intelligence...', 'User Intelligence');
    
    setTimeout(() => {
      addLog('User intelligence refreshed successfully', 'User Intelligence', 'success');
      setIsLoading(false);
    }, 1500);
  };

  const handleTileClick = (filterType: string) => {
    setActiveFilter(filterType);
    setSearchTerm('');
    setFilterStatus('all');
    setFilterRisk('all');
    setFilterMfa('all');
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMfaColor = (mfa: string) => {
    switch (mfa) {
      case 'Enabled': return 'text-green-600 bg-green-100';
      case 'Enforced': return 'text-blue-600 bg-blue-100';
      case 'Disabled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <Users className="w-6 h-6 mr-2" />
            User Intelligence
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive user analytics and management
          </p>
        </div>
        <div className="flex items-center space-x-2">
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

      {/* Intelligence Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div 
          onClick={() => handleTileClick('')}
          className={`bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow ${activeFilter === '' ? 'ring-2 ring-blue-500' : ''}`}
        >
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockUserSummary.total}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Users</div>
        </div>
        
        <div 
          onClick={() => handleTileClick('')}
          className={`bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow`}
        >
          <div className="text-2xl font-bold text-green-600">{mockUserSummary.enabled}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Enabled</div>
        </div>
        
        <div 
          onClick={() => handleTileClick('')}
          className={`bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow`}
        >
          <div className="text-2xl font-bold text-red-600">{mockUserSummary.disabled}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Disabled</div>
        </div>
        
        <div 
          onClick={() => handleTileClick('stale')}
          className={`bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow ${activeFilter === 'stale' ? 'ring-2 ring-orange-500' : ''}`}
        >
          <div className="text-2xl font-bold text-orange-600 flex items-center">
            {staleUsers.length}
            <Clock className="w-4 h-4 ml-1" />
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Stale Users</div>
        </div>
        
        <div 
          onClick={() => handleTileClick('')}
          className={`bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow`}
        >
          <div className="text-2xl font-bold text-blue-600">{mockUserSummary.guests}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Guest Users</div>
        </div>
        
        <div 
          onClick={() => handleTileClick('')}
          className={`bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md transition-shadow`}
        >
          <div className="text-2xl font-bold text-green-600">{mockUserSummary.mfaEnabled}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">MFA Enabled</div>
        </div>
      </div>

      {/* Active Filter Indicator */}
      {activeFilter && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-orange-600 mr-2" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Showing {activeFilter} users ({filteredUsers.length} results)
              </span>
            </div>
            <button
              onClick={() => setActiveFilter('')}
              className="text-orange-600 hover:text-orange-800 text-sm"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedUsers.size} user(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('Enable MFA')}
                disabled={isLoading}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Enable MFA
              </button>
              <button
                onClick={() => handleBulkAction('Disable Account')}
                disabled={isLoading}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
              >
                Disable Account
              </button>
              <button
                onClick={() => handleBulkAction('Reset Password')}
                disabled={isLoading}
                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                Reset Password
              </button>
              <button
                onClick={() => handleBulkAction('Remove Licenses')}
                disabled={isLoading}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Remove Licenses
              </button>
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
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="guest">Guest Users</option>
          </select>

          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>

          <select
            value={filterMfa}
            onChange={(e) => setFilterMfa(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          >
            <option value="all">All MFA Status</option>
            <option value="enabled">MFA Enabled</option>
            <option value="disabled">MFA Disabled</option>
          </select>

          <button className="flex items-center px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  MFA Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Last Sign-in
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Licenses
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredUsers.slice(0, 50).map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{user.displayName}</div>
                        <div className="text-sm text-slate-500">{user.userPrincipalName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900 dark:text-white">{user.department}</div>
                    <div className="text-xs text-slate-500">{user.jobTitle}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {user.accountEnabled ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${user.accountEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {user.accountEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(user.riskLevel)}`}>
                      {user.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getMfaColor(user.mfaStatus)}`}>
                      {user.mfaStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(user.lastSignInDateTime).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-500">
                      {user.licenses.length} license{user.licenses.length !== 1 ? 's' : ''}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length > 50 && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-400">
            Showing 50 of {filteredUsers.length} users. Use filters to narrow results.
          </div>
        )}
      </div>
    </div>
  );
};