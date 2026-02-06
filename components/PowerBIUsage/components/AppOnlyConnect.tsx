/**
 * App-Only Exchange Online Connection Component
 * 
 * Uses existing Cloud App credentials with certificate-based authentication
 * to connect to Exchange Online without interactive login.
 * 
 * @module PowerBIUsage/components/AppOnlyConnect
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Key, CheckCircle2, AlertCircle, Cloud } from 'lucide-react';
import { useAppOnlyAuth } from '../hooks/useAppOnlyAuth';
import { CloudConnectionState } from '../../../types';

interface AppOnlyConnectProps {
    /** Cloud connection state with app credentials */
    cloudConnection?: CloudConnectionState;
    /** Backend base URL */
    baseUrl: string;
    /** Success callback */
    onConnectionSuccess: (connectionInfo: any) => void;
    /** Error callback */
    onConnectionError: (error: string) => void;
}

/**
 * App-Only Exchange Online Connection Component
 * 
 * Automatically uses existing Cloud App credentials to establish
 * certificate-based Exchange Online connection.
 */
export const AppOnlyConnect: React.FC<AppOnlyConnectProps> = ({
    cloudConnection,
    baseUrl,
    onConnectionSuccess,
    onConnectionError
}) => {
    const { authState, connectAppOnly, testConnection } = useAppOnlyAuth(baseUrl);
    const [certificateThumbprint, setCertificateThumbprint] = useState('');
    const [organization, setOrganization] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);

    // Test connection on mount
    useEffect(() => {
        testConnection();
    }, [testConnection]);

    /**
     * Handles automatic connection using Cloud credentials
     */
    const handleAutoConnect = async () => {
        if (!cloudConnection?.isConnected) {
            onConnectionError('Cloud connection required for app-only authentication');
            return;
        }

        if (!certificateThumbprint.trim()) {
            onConnectionError('Certificate thumbprint is required');
            return;
        }

        if (!organization.trim()) {
            onConnectionError('Organization domain is required (e.g., tenant.onmicrosoft.com)');
            return;
        }

        const credentials = {
            appId: cloudConnection.appId || '',
            tenantId: organization.trim(), // Use organization as tenantId for EXO
            certificateThumbprint: certificateThumbprint.trim()
        };

        const result = await connectAppOnly(credentials);

        if (result.success) {
            onConnectionSuccess(result.data);
        } else {
            onConnectionError(result.error || 'Connection failed');
        }
    };

    if (authState.isConnected) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                <div className="flex flex-col items-center max-w-md mx-auto">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-2">
                        Exchange Online Connected
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                        Organization: {authState.organization}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                        Connected at: {authState.connectedAt ? new Date(authState.connectedAt).toLocaleString() : 'Unknown'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="max-w-md mx-auto">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        App-Only Authentication
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Uses certificate-based authentication with your existing Cloud App credentials.
                        No interactive login required.
                    </p>
                </div>

                {/* Cloud Connection Status */}
                {cloudConnection?.isConnected ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                            <Cloud className="w-4 h-4" />
                            <span className="font-medium">Using Cloud App:</span>
                            <span className="font-mono text-xs">{cloudConnection.appId?.substring(0, 8)}...</span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>Cloud connection required for app-only authentication</span>
                        </div>
                    </div>
                )}

                {/* Organization & Certificate Input */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Organization Domain
                        </label>
                        <input
                            type="text"
                            value={organization}
                            onChange={(e) => setOrganization(e.target.value)}
                            placeholder="e.g., contoso.onmicrosoft.com"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Your tenant's onmicrosoft.com domain
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Certificate Thumbprint
                        </label>
                        <input
                            type="text"
                            value={certificateThumbprint}
                            onChange={(e) => setCertificateThumbprint(e.target.value)}
                            placeholder="Enter certificate thumbprint (40 hex characters)"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            maxLength={40}
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            The thumbprint of the certificate uploaded to your Azure App registration
                        </p>
                    </div>

                    <button
                        onClick={handleAutoConnect}
                        disabled={authState.isConnecting || !cloudConnection?.isConnected || !certificateThumbprint.trim() || !organization.trim()}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                    >
                        {authState.isConnecting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> CONNECTING...
                            </>
                        ) : (
                            <>
                                <Key className="w-4 h-4" /> CONNECT WITH CERTIFICATE
                            </>
                        )}
                    </button>

                    {authState.error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                                {authState.error}
                            </p>
                        </div>
                    )}
                </div>

                {/* Help Text */}
                <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                        Certificate Setup Required:
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        <li>• Upload certificate to your Azure App registration</li>
                        <li>• Assign Exchange Administrator role to the app</li>
                        <li>• Copy the certificate thumbprint (40 hex characters)</li>
                        <li>• Paste thumbprint above and click Connect</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};