/**
 * Demo CA Exclusions - Conditional Access policy management with mock data
 */

import React, { useState, useMemo } from 'react';
import { Shield, Search, Filter, Download, RefreshCw, AlertTriangle, CheckCircle, XCircle, Eye, Users, MapPin } from 'lucide-react';
import { mockCAPolicies, mockCASummary, MockCAPolicy, MockExcludedUser } from '../data/mockCAPolicies';

interface DemoCAExclusionsProps {
  cloudConnection: any;
  addLog: (message: string, module: string, level?: string) => void;
}

export const DemoCAExclusions: React.FC<DemoCAExclusionsProps> = ({ addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<MockCAPolicy | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [filterState, setFilterState] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [viewMode, setViewMode] = useState<'policies' | 'exclusions'>('policies');

  // Get all excluded users across all policies
  const allExcludedUsers = useMemo(() => {
    const users: (MockExcludedUser & { policyName: string; policyId: string })[] = [];
    mockCAPolicies.forEach(policy => {
      policy.excludedUsers.forEach(user => {
        users.push({
          ...user,
          policyName: policy.displayName,
          policyId: policy.id
        });
      });
    });
    return users;
  }, []);

  // Filter policies based on search and filters
  const filteredPolicies = useMemo(() => {
    let policies = mockCAPolicies;

    if (searchTerm) {
      policies = policies.filter(policy => 
        policy.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterState !== 'all') {
      policies = policies.filter(policy => policy.state === filterState);
    }

    return policies;
  }, [searchTerm, filterState]);

  // Filter excluded users
  const filteredExcludedUsers = useMemo(() => {
    let users = selectedPolicy ? selectedPolicy.excludedUsers : allExcludedUsers;

    if (searchTerm) {
      users = users.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userPrincipalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRisk !== 'all') {
      users = users.filter(user => user.riskLevel.toLowerCase() === filterRisk);
    }

    return users;
  }, [searchTerm, filterRisk, selectedPolicy, allExcludedUsers]);

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
    if (selectedUsers.size === filteredExcludedUsers.length) {
      setSelectedUsers(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedUsers(new Set(filteredExcludedUsers.map(u => u.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = (action: string) => {
    setIsLoading(true);
    addLog(`Executing ${action} on ${selectedUsers.size} exclusions`, 'CA Exclusions');
    
    setTimeout(() => {
      addLog(`${action} completed successfully for ${selectedUsers.size} exclusions`, 'CA Exclusions', 'success');
      setSelectedUsers(new Set());
      setShowBulkActions(false);
      setIsLoading(false);
    }, 2000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    addLog('Refreshing CA policies and exclusions...', 'CA Exclusions');
    
    setTimeout(() => {
      addLog('CA policies and exclusions refreshed successfully', 'CA Exclusions', 'success');
      setIsLoading(false);
    }, 1500);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'enabled': return 'text-green-600 bg-green-100';
      case 'disabled': return 'text-red-600 bg-red-100';
      case 'enabledForReportingButNotEnforced': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'enabled': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'disabled': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'enabledForReportingButNotEnforced': return <Eye className="w-4 h-4 text-yellow-600" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center">
            <Shield className="w-6 h-6 mr-2" />
            Conditional Access Exclusions
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Monitor and manage CA policy exclusions and compliance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => {
                setViewMode('policies');
                setSelectedPolicy(null);
                setSelectedUsers(new Set());
                setShowBulkActions(false);
              }}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'policies'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Policies
            </button>
            <button
              onClick={() => {
                setViewMode('exclusions');
                setSelectedPolicy(null);
                setSelectedUsers(new Set());
                setShowBulkActions(false);
              }}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'exclusions'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Exclusions
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
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockCASummary.totalPolicies}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Policies</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-green-600">{mockCASummary.enabledPolicies}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Enabled</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-red-600">{mockCASummary.disabledPolicies}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Disabled</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-orange-600">{mockCASummary.totalExcludedUsers}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Exclusions</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-red-600">{mockCASummary.highRiskExclusions}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">High Risk</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-blue-600">{mockCASummary.averageComplianceScore}%</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Avg Compliance</div>
        </div>
      </div>

      {/* Policy Selection (when viewing exclusions) */}
      {viewMode === 'exclusions' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100 mr-4">
                {selectedPolicy ? `Viewing exclusions for: ${selectedPolicy.displayName}` : 'Viewing all exclusions across all policies'}
              </span>
            </div>
            {selectedPolicy && (
              <button
                onClick={() => setSelectedPolicy(null)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View All Exclusions
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {showBulkActions && viewMode === 'exclusions' && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                {selectedUsers.size} exclusion(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('Remove Exclusion')}
                disabled={isLoading}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Remove Exclusion
              </button>
              <button
                onClick={() => handleBulkAction('Review Access')}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Review Access
              </button>
              <button
                onClick={() => handleBulkAction('Flag for Review')}
                disabled={isLoading}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
              >
                Flag for Review
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
                placeholder={viewMode === 'policies' ? "Search policies..." : "Search excluded users..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
          
          {viewMode === 'policies' ? (
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            >
              <option value="all">All States</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
              <option value="enabledForReportingButNotEnforced">Report Only</option>
            </select>
          ) : (
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
          )}

          <button className="flex items-center px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'policies' ? (
        /* Policies Table */
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Policy Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Exclusions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Compliance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Modified
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{policy.displayName}</div>
                      <div className="text-sm text-slate-500">{policy.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {getStateIcon(policy.state)}
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStateColor(policy.state)}`}>
                          {policy.state === 'enabledForReportingButNotEnforced' ? 'Report Only' : 
                           policy.state.charAt(0).toUpperCase() + policy.state.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-slate-400 mr-1" />
                        <span className="text-sm text-slate-900 dark:text-white">
                          {policy.excludedUsers.length}
                        </span>
                        {policy.excludedUsers.filter(u => u.riskLevel === 'High').length > 0 && (
                          <AlertTriangle className="w-4 h-4 text-red-500 ml-2" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              policy.riskScore >= 90 ? 'bg-green-500' :
                              policy.riskScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${policy.riskScore}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-900 dark:text-white">{policy.riskScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-16 bg-slate-200 dark:bg-slate-600 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              policy.complianceScore >= 90 ? 'bg-green-500' :
                              policy.complianceScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${policy.complianceScore}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-900 dark:text-white">{policy.complianceScore}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(policy.modifiedDateTime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedPolicy(policy);
                          setViewMode('exclusions');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Exclusions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Exclusions Table */
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredExcludedUsers.length && filteredExcludedUsers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  {!selectedPolicy && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Policy
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Excluded Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredExcludedUsers.slice(0, 50).map((user) => (
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
                      <div className="font-medium text-slate-900 dark:text-white">{user.displayName}</div>
                      <div className="text-sm text-slate-500">{user.userPrincipalName}</div>
                    </td>
                    {!selectedPolicy && 'policyName' in user && (
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900 dark:text-white">{user.policyName}</div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                      {user.department}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(user.riskLevel)}`}>
                        {user.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center text-sm text-slate-900 dark:text-white">
                        <MapPin className="w-4 h-4 text-slate-400 mr-1" />
                        {user.location}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(user.excludedDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900 dark:text-white max-w-xs truncate" title={user.reason}>
                        {user.reason}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredExcludedUsers.length > 50 && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-400">
              Showing 50 of {filteredExcludedUsers.length} exclusions. Use filters to narrow results.
            </div>
          )}
        </div>
      )}
    </div>
  );
};