/**
 * Demo Universal Auth - Shows connected status with demo credentials
 */

import React from 'react';
import { CheckCircle, Cloud, Database } from 'lucide-react';

interface DemoUniversalAuthProps {
  cloudConnection: {
    isConnected: boolean;
    tenantId: string;
    appId: string;
    vaultName: string;
    secretName: string;
  };
  adConnection: {
    isConnected: boolean;
    server: string;
    sessionId: string;
  };
  onCloudConnect: (connection: any) => void;
  onAdConnect: (connection: any) => void;
}

export const DemoUniversalAuth: React.FC<DemoUniversalAuthProps> = ({
  cloudConnection,
  adConnection
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-6">
        {/* Cloud Connection Status */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <Cloud className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Microsoft Graph
            </span>
          </div>
          {cloudConnection.isConnected ? (
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Disconnected</span>
          )}
        </div>

        {/* AD Connection Status */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <Database className="w-4 h-4 text-orange-500 mr-2" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Active Directory
            </span>
          </div>
          {adConnection.isConnected ? (
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Disconnected</span>
          )}
        </div>
      </div>

      {/* Demo Credentials Display */}
      {cloudConnection.isConnected && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono">
            Tenant: {cloudConnection.tenantId.substring(0, 8)}...
          </span>
          <span className="ml-4 font-mono">
            Vault: {cloudConnection.vaultName}
          </span>
        </div>
      )}
    </div>
  );
};