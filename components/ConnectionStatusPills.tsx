import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { ConnectionState, CloudConnectionState } from '../types';

interface ConnectionHealth {
  ad: {
    isHealthy: boolean;
    lastChecked: Date | null;
    error: string | null;
  };
  cloud: {
    isHealthy: boolean;
    lastChecked: Date | null;
    error: string | null;
  };
}

interface ConnectionStatusPillsProps {
  connection: ConnectionState;
  cloudConnection: CloudConnectionState;
  health: ConnectionHealth;
  onRetryAd: () => void;
  onRetryCloud: () => void;
  isRetrying?: { ad: boolean; cloud: boolean };
}

export const ConnectionStatusPills: React.FC<ConnectionStatusPillsProps> = ({
  connection,
  cloudConnection,
  health,
  onRetryAd,
  onRetryCloud,
  isRetrying = { ad: false, cloud: false }
}) => {
  const getAdStatus = () => {
    if (!connection.isConnected) return 'disconnected';
    if (isRetrying.ad) return 'retrying';
    if (!health.ad.lastChecked) return 'checking';
    return health.ad.isHealthy ? 'healthy' : 'unhealthy';
  };

  const getCloudStatus = () => {
    if (!cloudConnection.isConnected) return 'disconnected';
    if (isRetrying.cloud) return 'retrying';
    if (!health.cloud.lastChecked) return 'checking';
    return health.cloud.isHealthy ? 'healthy' : 'unhealthy';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy':
        return {
          icon: CheckCircle2,
          color: 'bg-green-500/10 text-green-600 border-green-500/20',
          text: 'Connected'
        };
      case 'unhealthy':
        return {
          icon: AlertCircle,
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
          text: 'Needs Retry'
        };
      case 'disconnected':
        return {
          icon: XCircle,
          color: 'bg-red-500/10 text-red-600 border-red-500/20',
          text: 'Disconnected'
        };
      case 'retrying':
        return {
          icon: RefreshCw,
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
          text: 'Retrying...'
        };
      case 'checking':
        return {
          icon: Clock,
          color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
          text: 'Checking...'
        };
      default:
        return {
          icon: XCircle,
          color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
          text: 'Unknown'
        };
    }
  };

  const adStatus = getAdStatus();
  const cloudStatus = getCloudStatus();
  const adConfig = getStatusConfig(adStatus);
  const cloudConfig = getStatusConfig(cloudStatus);

  return (
    <div className="flex items-center gap-2">
      {/* AD Status Pill - Smaller */}
      <div className="group relative">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-tight transition-all ${adConfig.color}`}>
          <adConfig.icon className={`w-2 h-2 ${isRetrying.ad ? 'animate-spin' : ''}`} />
          <span>AD</span>
          <span className="hidden sm:inline text-[8px]">{adConfig.text === 'Connected' ? 'Connected' : adConfig.text === 'Needs Retry' ? 'Retry' : adConfig.text === 'Retrying...' ? 'Retry' : 'Off'}</span>
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          <div className="font-semibold">Active Directory</div>
          <div>Domain: {connection.domain || 'Not set'}</div>
          <div>Server: {connection.server || 'Not set'}</div>
          {health.ad.lastChecked && (
            <div>Last checked: {health.ad.lastChecked.toLocaleTimeString()}</div>
          )}
          {health.ad.error && (
            <div className="text-red-300">Error: {health.ad.error}</div>
          )}
          {adStatus === 'unhealthy' && (
            <button
              onClick={onRetryAd}
              className="mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors"
            >
              Retry AD Connection
            </button>
          )}
        </div>
      </div>

      {/* Cloud Status Pill - Smaller */}
      <div className="group relative">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-tight transition-all ${cloudConfig.color}`}>
          <cloudConfig.icon className={`w-2 h-2 ${isRetrying.cloud ? 'animate-spin' : ''}`} />
          <span>Entra</span>
          <span className="hidden sm:inline text-[8px]">{cloudConfig.text === 'Connected' ? 'ID' : cloudConfig.text === 'Needs Retry' ? 'Retry' : cloudConfig.text === 'Retrying...' ? 'Retry' : 'Off'}</span>
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          <div className="font-semibold">Microsoft Entra ID</div>
          <div>Tenant: {cloudConnection.tenantId ? `${cloudConnection.tenantId.substring(0, 8)}...` : 'Not set'}</div>
          <div>App ID: {cloudConnection.appId ? `${cloudConnection.appId.substring(0, 8)}...` : 'Not set'}</div>
          {health.cloud.lastChecked && (
            <div>Last checked: {health.cloud.lastChecked.toLocaleTimeString()}</div>
          )}
          {health.cloud.error && (
            <div className="text-red-300">Error: {health.cloud.error}</div>
          )}
          {cloudStatus === 'unhealthy' && (
            <button
              onClick={onRetryCloud}
              className="mt-2 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium transition-colors"
            >
              Retry Cloud Connection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};