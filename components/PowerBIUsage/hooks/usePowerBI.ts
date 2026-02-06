import { useCallback } from 'react';
import { useExchangeConnection } from './useExchangeConnection';
import { usePowerBIData } from './usePowerBIData';

// Use the same security key as the main apiService
const GATEWAY_SECRET = import.meta.env.VITE_API_KEY;

/**
 * Main PowerBI hook that combines connection and data management
 * 
 * This hook orchestrates Exchange Online connection management and
 * PowerBI usage data operations by combining focused sub-hooks.
 * 
 * @param baseUrl - The base URL for API calls
 * @returns Object containing all PowerBI operations and state
 * 
 * @example
 * ```tsx
 * const {
 *   usageData,
 *   connectionState,
 *   connectExchange,
 *   fetchUsage
 * } = usePowerBI('http://localhost:3001');
 * ```
 */
export const usePowerBI = (baseUrl: string) => {
    const {
        connectionState,
        checkConnection,
        connectExchange,
        updateConnectionState
    } = useExchangeConnection(baseUrl);

    const {
        usageData,
        isLoading,
        lastUpdated,
        error,
        fetchUsage,
        exportData,
        setUsageData,
        setIsLoading,
        setError,
        setLastUpdated
    } = usePowerBIData(baseUrl, updateConnectionState);

    /**
     * Fetch PowerBI usage data with app-only authentication
     */
    const fetchUsageAppOnly = useCallback(async (daysBack: number) => {
        setIsLoading(true);
        setError(null);

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

            if (result.status === 'success') {
                setUsageData(result);
                setLastUpdated(new Date());
            } else {
                setError(result.detail || result.error || 'Failed to fetch PowerBI usage');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Network error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [baseUrl, setIsLoading, setError, setUsageData, setLastUpdated]);
    /**
     * Fetch PowerBI usage data via Power BI Activity Events API
     * Uses Key Vault credentials - FAST synchronous API (28 days max)
     */
    const fetchUsageGraph = useCallback(async (credentials: {
        tenantId: string;
        appId: string;
        vaultName: string;
        secretName: string;
    }, daysBack: number = 28) => {
        setIsLoading(true);
        setError(null);

        try {
            // Use the fast Activity Events API (28 days max, but synchronous)
            const response = await fetch(`${baseUrl}/api/powerbi/activity-events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Hyperion-Key': GATEWAY_SECRET
                },
                body: JSON.stringify({ ...credentials, daysBack: Math.min(daysBack, 28) })
            });

            const result = await response.json();

            if (result.status === 'success') {
                setUsageData(result);
                setLastUpdated(new Date());
                return { success: true, data: result };
            } else {
                setError(result.detail || result.error || 'Failed to fetch PowerBI usage');
                return { success: false, error: result.detail || result.error };
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Network error occurred';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, [baseUrl, setIsLoading, setError, setUsageData, setLastUpdated]);
    /**
     * Fetch PowerBI usage via Office 365 Management Activity API
     * Headless, production-ready approach with 90+ days history
     * Uses Audit.PowerBI content type
     */
    const fetchUsageManagementAPI = useCallback(async (
        daysBack: number = 90,
        credentials?: { tenantId?: string; appId?: string; organization?: string; vaultName?: string; secretName?: string; certThumbprint?: string }
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${baseUrl}/api/powerbi/management-activity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Hyperion-Key': GATEWAY_SECRET
                },
                body: JSON.stringify({ ...credentials, daysBack })
            });

            const result = await response.json();

            if (result.status === 'success') {
                setUsageData(result);
                setLastUpdated(new Date());
                return { success: true, data: result };
            } else {
                const errorMsg = result.detail || result.error || 'Failed to fetch PowerBI audit data';
                setError(errorMsg);
                return { success: false, error: errorMsg };
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Network error occurred';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, [baseUrl, setIsLoading, setError, setUsageData, setLastUpdated]);

    /**
     * Fetch PowerBI usage with real-time progress via Server-Sent Events
     * Shows actual day-by-day progress and updates table incrementally
     */
    const fetchUsageWithRealTimeProgress = useCallback(async (
        daysBack: number = 7,
        credentials: { tenantId: string; appId: string; organization: string; certThumbprint: string },
        onProgress?: (progress: { current: number; total: number; message: string }) => void,
        onDataUpdate?: (newData: any[]) => void
    ) => {
        setIsLoading(true);
        setError(null);
        
        // Initialize empty data structure
        const accumulatedData: any[] = [];
        setUsageData({ status: 'success', data: [], totalUsers: 0, totalActivities: 0 });

        try {
            const response = await fetch(`${baseUrl}/api/powerbi/management-activity-stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Hyperion-Key': GATEWAY_SECRET
                },
                body: JSON.stringify({ ...credentials, daysBack })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('No response body reader available');
            }

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const eventData = JSON.parse(line.slice(6));
                            
                            switch (eventData.type) {
                                case 'connected':
                                    onProgress?.({ current: 0, total: daysBack, message: eventData.message });
                                    break;
                                    
                                case 'progress':
                                    onProgress?.({ 
                                        current: eventData.day, 
                                        total: eventData.total, 
                                        message: eventData.message 
                                    });
                                    break;
                                    
                                case 'day_complete':
                                    // Add new data to accumulated data
                                    if (eventData.newData && eventData.newData.length > 0) {
                                        accumulatedData.push(...eventData.newData);
                                        
                                        // Update the table with new data
                                        const updatedUsageData = {
                                            status: 'success',
                                            data: [...accumulatedData],
                                            totalUsers: eventData.totalUsers,
                                            totalActivities: eventData.totalRecords
                                        };
                                        setUsageData(updatedUsageData);
                                        onDataUpdate?.(eventData.newData);
                                    }
                                    
                                    onProgress?.({ 
                                        current: eventData.day, 
                                        total: eventData.total, 
                                        message: eventData.message 
                                    });
                                    break;
                                    
                                case 'day_error':
                                    onProgress?.({ 
                                        current: eventData.day, 
                                        total: eventData.total, 
                                        message: eventData.message 
                                    });
                                    break;
                                    
                                case 'complete':
                                    const finalUsageData = {
                                        status: 'success',
                                        data: eventData.data || accumulatedData,
                                        totalUsers: eventData.totalUsers,
                                        totalActivities: eventData.totalRecords
                                    };
                                    setUsageData(finalUsageData);
                                    setLastUpdated(new Date());
                                    return { success: true, data: finalUsageData };
                                    
                                case 'error':
                                    throw new Error(eventData.message);
                                    
                                case 'finished':
                                    // Stream ended
                                    break;
                            }
                        } catch (parseError) {
                            console.error('Error parsing SSE event:', parseError);
                        }
                    }
                }
            }

            return { success: true, data: { status: 'success', data: accumulatedData } };
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Network error occurred';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, [baseUrl, setIsLoading, setError, setUsageData, setLastUpdated]);

    return {
        usageData,
        connectionState,
        isLoading,
        lastUpdated,
        error,
        checkConnection,
        connectExchange,
        fetchUsage,
        fetchUsageAppOnly,
        fetchUsageGraph,
        fetchUsageManagementAPI,
        fetchUsageWithRealTimeProgress,
        exportData
    };
};