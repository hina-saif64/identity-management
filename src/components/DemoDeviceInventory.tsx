/**
 * Demo Device Inventory - Complete device management with mock data
 */

import React, { useState, useMemo } from 'react';
import { Monitor, Search, Filter, Download, RefreshCw, Trash2, Settings, AlertTriangle } from 'lucide-react';
import { mockDevices, mockDeviceSummary, mockDeletedDevices, MockDevice } from '../data/mockDevices';

interface DemoDeviceInventoryProps {
  cloudConnection: any;
  adConnection: any;
  addLog: (message: string, module: string, level?: string) => void;
}

export const DemoDeviceInventory: React.FC<DemoDeviceInventoryProps> = ({ addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [showDeletedDevices, setShowDeletedDevices] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSystem, setFilterSystem] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filter devices based on search and filters
  const filteredDevices = useMemo(() => {
    let devices = mockDevices;

    if (searchTerm) {
      devices = devices.filter(device => 
        device.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.lastUser.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      devices = devices.filter(device => device.healthStatus.toLowerCase() === filterStatus);
    }

    if (filterSystem !== 'all') {
      devices = devices.filter(device => {
        switch (filterSystem) {
          case 'entra': return device.entra;
          case 'intune': return device.intune;
          case 'ad': return device.ad;
          case 'all-systems': return device.entra && device.intune && device.ad;
          default: return true;
        }
      });
    }

    return devices;
  }, [searchTerm, filterStatus, filterSystem]);

  const handleSelectDevice = (deviceId: string) => {
    const newSelected = new Set(selectedDevices);
    if (newSelected.has(deviceId)) {
      newSelected.delete(deviceId);
    } else {
      newSelected.add(deviceId);
    }
    setSelectedDevices(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedDevices.size === filteredDevices.length) {
      setSelectedDevices(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedDevices(new Set(filteredDevices.map(d => d.deviceId)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = (action: string) => {
    setIsLoading(true);
    addLog(`Executing ${action} on ${selectedDevices.size} devices`, 'Device Inventory');
    
    setTimeout(() => {
      addLog(`${action} completed successfully for ${selectedDevices.size} devices`, 'Device Inventory', 'success');
      setSelectedDevices(new Set());
      setShowBulkActions(false);
      setIsLoading(false);
    }, 2000);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    addLog('Refreshing device inventory...', 'Device Inventory');
    
    setTimeout(() => {
      addLog('Device inventory refreshed successfully', 'Device Inventory', 'success');
      setIsLoading(false);
    }, 1500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-600 bg-green-100';
      case 'Warning': return 'text-yellow-600 bg-yellow-100';
      case 'Stale': return 'text-orange-600 bg-orange-100';
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
            <Monitor className="w-6 h-6 mr-2" />
            Device Inventory
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Unified view across Entra ID, Intune, and Active Directory
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
          <button
            onClick={() => setShowDeletedDevices(!showDeletedDevices)}
            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Deleted ({mockDeletedDevices.length})
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{mockDeviceSummary.total}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Devices</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-blue-600">{mockDeviceSummary.entra}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Entra ID</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-green-600">{mockDeviceSummary.intune}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Intune</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-orange-600">{mockDeviceSummary.ad}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Active Directory</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-green-600">{mockDeviceSummary.active}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Active</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="text-2xl font-bold text-red-600">{mockDeviceSummary.stale}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Stale</div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedDevices.size} device(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('Disable in Entra')}
                disabled={isLoading}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
              >
                Disable in Entra
              </button>
              <button
                onClick={() => handleBulkAction('Disable in Intune')}
                disabled={isLoading}
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50"
              >
                Disable in Intune
              </button>
              <button
                onClick={() => handleBulkAction('Move AD OU')}
                disabled={isLoading}
                className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                Move AD OU
              </button>
              <button
                onClick={() => handleBulkAction('Delete')}
                disabled={isLoading}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Delete
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
                placeholder="Search devices..."
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
            <option value="active">Active</option>
            <option value="warning">Warning</option>
            <option value="stale">Stale</option>
            <option value="disabled">Disabled</option>
          </select>

          <select
            value={filterSystem}
            onChange={(e) => setFilterSystem(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          >
            <option value="all">All Systems</option>
            <option value="entra">Entra ID Only</option>
            <option value="intune">Intune Only</option>
            <option value="ad">AD Only</option>
            <option value="all-systems">All Systems</option>
          </select>

          <button className="flex items-center px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Deleted Devices Panel */}
      {showDeletedDevices && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Recently Deleted Devices (Last 30 days)
          </h3>
          <div className="space-y-2">
            {mockDeletedDevices.map((device) => (
              <div key={device.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded border">
                <div>
                  <span className="font-medium">{device.displayName}</span>
                  <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                    Deleted {device.daysAgo} days ago by {device.deletedBy}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  {device.os} • Last seen: {new Date(device.lastSignIn).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedDevices.size === filteredDevices.length && filteredDevices.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Device Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Systems
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  OS
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Last User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredDevices.slice(0, 50).map((device) => (
                <tr key={device.deviceId} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedDevices.has(device.deviceId)}
                      onChange={() => handleSelectDevice(device.deviceId)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{device.displayName}</div>
                    <div className="text-sm text-slate-500">{device.deviceId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-1">
                      {device.entra && <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Entra</span>}
                      {device.intune && <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Intune</span>}
                      {device.ad && <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">AD</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(device.healthStatus)}`}>
                      {device.healthStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900 dark:text-white">{device.os}</div>
                    <div className="text-xs text-slate-500">{device.osVersion}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                    {device.lastUser}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(device.lastSeen).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      <Settings className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredDevices.length > 50 && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-400">
            Showing 50 of {filteredDevices.length} devices. Use filters to narrow results.
          </div>
        )}
      </div>
    </div>
  );
};