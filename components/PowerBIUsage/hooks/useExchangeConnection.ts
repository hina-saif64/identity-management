import { useState, useCallback } from 'react';
import { apiService } from '../../../services/apiService';
import { PowerBIConnectionState } from '../powerbi.types';

/**
 * Custom hook for managing Exchange Online connection state
 * 
 * Handles Exchange Online authentication and connection management
 * using Universal Authentication credentials from Cloud configuration.
 * 
 * @param baseUrl - The base URL for API calls
 * @returns Object containing connection state and methods
 * 
 * @example
 * ```tsx
 * const {
 *   connectionState,
 *   checkConnection,
 *   connectExchange
 * } = useExchangeConnection('http://localhost:3001');
 * ```
 */
export const useExchangeConnection = (baseUrl: string) => {
    const [connectionState, setConnectionState] = useState<PowerBIConnectionState>({
        connected: false,
        connectedAt: null,
        userPrincipalName: null,
        isConnecting: false,
        error: null
    });

    /**
     * Checks the current Exchange Online connection status
     * 
     * Verifies if the Exchange session is still active and updates
     * the connection state accordingly. Used for session validation.
     * 
     * @returns Promise<void>
     */
    const checkConnection = useCallback(async () => {
        try {
            const status = await apiService.getExchangeStatus(baseUrl);
            if (status.connected) {
                setConnectionState(prev => ({
                    ...prev,
                    connected: true,
                    // If we had a UPN stored or returned from status, we'd use it here.
                    // For now, status check assumes session is alive.
                    error: null
                }));
            } else {
                setConnectionState(prev => ({ ...prev, connected: false }));
            }
        } catch (err: any) {
            setConnectionState(prev => ({
                ...prev,
                connected: false,
                error: err.message
            }));
        }
    }, [baseUrl]);

    /**
     * Establishes connection to Exchange Online using Universal Authentication
     * 
     * Uses the existing Cloud App credentials (App ID, Tenant ID, Vault secrets)
     * to authenticate with Exchange Online. No separate certificate required.
     * 
     * @param authParams - Authentication parameters from Universal Auth context
     * @param authParams.appId - Azure App ID from Cloud configuration
     * @param authParams.tenantId - Azure Tenant ID
     * @param authParams.vaultName - Key Vault name for secrets
     * @param authParams.secretName - Secret name in Key Vault
     * @param authParams.organization - Organization name for display
     * @returns Promise<boolean> - Success status of connection attempt
     * 
     * @example
     * ```tsx
     * const success = await connectExchange({
     *   appId: 'your-app-id',
     *   tenantId: 'your-tenant-id',
     *   vaultName: 'your-vault',
     *   secretName: 'your-secret',
     *   organization: 'Your Org'
     * });
     * ```
     */
    const connectExchange = useCallback(async (authParams: any) => {
        setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));
        try {
            // Check if we have the full cloud config object
            if (typeof authParams === 'object' && authParams.appId) {
                const result = await apiService.connectExchangeOnline(baseUrl, authParams);
                if (result.status === 'success') {
                    setConnectionState({
                        connected: true,
                        connectedAt: new Date().toISOString(),
                        userPrincipalName: result.organization, // Use organization name for display
                        isConnecting: false,
                        error: null
                    });
                    return true;
                } else {
                    throw new Error(result.error || 'Connection failed');
                }
            } else {
                // Fallback to legacy string UPN (though backend might fail if it expects object)
                // But user's backend change (Step 858) EXPECTS object. 
                // So we must pass object.
                throw new Error("Universal Auth Configuration Required");
            }
        } catch (err: any) {
            setConnectionState(prev => ({
                ...prev,
                isConnecting: false,
                error: err.message
            }));
            return false;
        }
    }, [baseUrl]);

    /**
     * Updates connection state externally
     * 
     * Allows other hooks to update the connection state when they
     * detect connection status changes during their operations.
     * 
     * @param connected - New connection status
     */
    const updateConnectionState = useCallback((connected: boolean) => {
        setConnectionState(prev => ({ ...prev, connected }));
    }, []);

    return {
        connectionState,
        checkConnection,
        connectExchange,
        updateConnectionState
    };
};