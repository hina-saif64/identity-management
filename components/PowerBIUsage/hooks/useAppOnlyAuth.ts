/**
 * App-Only Authentication Hook for Exchange Online
 * 
 * Uses certificate-based authentication with Windows PowerShell 5.1
 * to connect to Exchange Online without interactive login.
 * 
 * @module PowerBIUsage/hooks/useAppOnlyAuth
 */

import { useState, useCallback } from 'react';

// Use the same security key as the main apiService
const GATEWAY_SECRET = import.meta.env.VITE_API_KEY;

interface AppOnlyAuthState {
    isConnected: boolean;
    isConnecting: boolean;
    organization?: string;
    connectionId?: string;
    connectedAt?: string;
    error?: string;
}

interface AppOnlyCredentials {
    appId: string;
    tenantId: string;
    certificateThumbprint: string;
}

/**
 * Custom hook for app-only Exchange Online authentication
 * 
 * @param baseUrl - Backend base URL
 * @returns Authentication state and methods
 */
export const useAppOnlyAuth = (baseUrl: string) => {
    const [authState, setAuthState] = useState<AppOnlyAuthState>({
        isConnected: false,
        isConnecting: false
    });

    /**
     * Connect to Exchange Online using app-only authentication
     */
    const connectAppOnly = useCallback(async (credentials: AppOnlyCredentials) => {
        setAuthState(prev => ({ ...prev, isConnecting: true, error: undefined }));

        try {
            const response = await fetch(`${baseUrl}/api/powerbi/connect-app-only`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Hyperion-Key': GATEWAY_SECRET
                },
                body: JSON.stringify(credentials)
            });

            const result = await response.json();

            if (result.status === 'success') {
                setAuthState({
                    isConnected: true,
                    isConnecting: false,
                    organization: result.organization,
                    connectionId: result.connectionId,
                    connectedAt: result.connectedAt
                });
                return { success: true, data: result };
            } else {
                setAuthState({
                    isConnected: false,
                    isConnecting: false,
                    error: result.detail || result.error
                });
                return { success: false, error: result.detail || result.error };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            setAuthState({
                isConnected: false,
                isConnecting: false,
                error: errorMessage
            });
            return { success: false, error: errorMessage };
        }
    }, [baseUrl]);

    /**
     * Test current Exchange Online connection
     */
    const testConnection = useCallback(async () => {
        try {
            const response = await fetch(`${baseUrl}/api/powerbi/test-connection`, {
                method: 'GET',
                headers: {
                    'X-Hyperion-Key': GATEWAY_SECRET
                }
            });
            const result = await response.json();

            setAuthState(prev => ({
                ...prev,
                isConnected: result.connected,
                organization: result.organization,
                connectionId: result.connectionId,
                error: result.connected ? undefined : result.error
            }));

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Test failed';
            setAuthState(prev => ({ ...prev, error: errorMessage }));
            return { connected: false, error: errorMessage };
        }
    }, [baseUrl]);

    /**
     * Fetch PowerBI usage data using app-only authentication
     */
    const fetchUsageAppOnly = useCallback(async (daysBack: number = 90) => {
        try {
            const response = await fetch(`${baseUrl}/api/powerbi/usage-app-only`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Hyperion-Key': GATEWAY_SECRET
                },
                body: JSON.stringify({ daysBack })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Fetch failed';
            return { status: 'error', error: 'FETCH_FAILED', detail: errorMessage };
        }
    }, [baseUrl]);

    return {
        authState,
        connectAppOnly,
        testConnection,
        fetchUsageAppOnly
    };
};