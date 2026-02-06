import React, { useState } from 'react';
import { Shield, Loader2, Play } from 'lucide-react';
import { PowerBIConnectionState } from '../powerbi.types';

/**
 * Props for the ExchangeConnect component
 */
interface ExchangeConnectProps {
    connectionState: PowerBIConnectionState;
    onConnect: (upn: string) => void;
}

/**
 * Exchange Online Connection Component
 * 
 * Provides a secure connection interface for Exchange Online using Universal Authentication.
 * Displays connection status, handles authentication flow, and shows error states.
 * 
 * Features:
 * - Universal Auth integration (no separate credentials needed)
 * - Visual connection status indicators
 * - Error handling and display
 * - Loading states during connection
 * 
 * @param connectionState - Current connection state and status
 * @param onConnect - Callback function to initiate connection
 * @param organization - Organization name from Universal Auth context
 * 
 * @example
 * ```tsx
 * <ExchangeConnect
 *   connectionState={connectionState}
 *   onConnect={handleConnect}
 *   organization="Your Organization"
 * />
 * ```
 */
export const ExchangeConnect: React.FC<{ connectionState: PowerBIConnectionState; onConnect: () => void; organization?: string }> = ({ connectionState, onConnect, organization }) => {
    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center">
            <div className="flex flex-col items-center max-w-md mx-auto">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                    <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Connect to Exchange Online</h3>

                {organization ? (
                    <>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Secure connection available via <strong>{organization}</strong> Universal Auth Context.
                            <br />No additional credentials required.
                        </p>
                        <button
                            onClick={onConnect}
                            disabled={connectionState.isConnecting}
                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-600/20"
                        >
                            {connectionState.isConnecting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> ESTABLISHING SESSION...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" /> CONNECT USING APP CONTEXT
                                </>
                            )}
                        </button>
                    </>
                ) : (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg text-yellow-700 dark:text-yellow-500 text-sm">
                        Please enable Universal Cloud Authentication in the main dashboard to access this feature.
                    </div>
                )}

                {connectionState.error && (
                    <p className="mt-4 text-xs text-red-500 font-medium bg-red-50 dark:bg-red-500/10 p-2 rounded animate-in shake">
                        {connectionState.error}
                    </p>
                )}
            </div>
        </div>
    );
};
