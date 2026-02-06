import { useState, useCallback } from 'react';
import { apiService } from '../../../services/apiService';
import { PowerBIUsageReport } from '../powerbi.types';
import * as XLSX from 'xlsx';

/**
 * Custom hook for managing PowerBI usage data fetching and export
 * 
 * Handles PowerBI usage data retrieval from Exchange Online and
 * provides export functionality in multiple formats.
 * 
 * @param baseUrl - The base URL for API calls
 * @param onConnectionUpdate - Optional callback to update connection state
 * @returns Object containing data state and methods
 * 
 * @example
 * ```tsx
 * const {
 *   usageData,
 *   isLoading,
 *   error,
 *   fetchUsage,
 *   exportData
 * } = usePowerBIData('http://localhost:3001');
 * ```
 */
export const usePowerBIData = (baseUrl: string, onConnectionUpdate?: (connected: boolean) => void) => {
    const [usageData, setUsageData] = useState<PowerBIUsageReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetches PowerBI usage data from Exchange Online
     * 
     * Retrieves PowerBI activity logs for the specified time period.
     * Can optionally auto-connect if credentials are provided.
     * 
     * @param daysBack - Number of days to look back for usage data (default: 90)
     * @param credentials - Optional credentials for auto-connection
     * @param credentials.tenantId - Azure Tenant ID
     * @param credentials.appId - Azure App ID
     * @param credentials.vaultName - Key Vault name
     * @param credentials.secretName - Secret name in Key Vault
     * @param credentials.organization - Organization name
     * @returns Promise<void>
     * 
     * @example
     * ```tsx
     * // Fetch last 30 days of data
     * await fetchUsage(30);
     * 
     * // Fetch with auto-connect
     * await fetchUsage(90, {
     *   tenantId: 'tenant-id',
     *   appId: 'app-id',
     *   vaultName: 'vault-name',
     *   secretName: 'secret-name',
     *   organization: 'Org Name'
     * });
     * ```
     */
    const fetchUsage = useCallback(async (daysBack: number = 90, credentials?: { tenantId: string, appId: string, vaultName: string, secretName: string, organization: string, certificateThumbprint?: string }) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await apiService.fetchPowerBIUsage(baseUrl, daysBack, credentials);
            if (result.status === 'success') {
                setUsageData(result);
                setLastUpdated(new Date());
                // Mark as connected if we got data
                onConnectionUpdate?.(true);
            } else {
                throw new Error(result.error || 'Failed to fetch usage data');
            }
        } catch (err: any) {
            setError(err.message);
            // If fetch fails with auth error, update connection state
            if (err.message.includes('Not connected')) {
                onConnectionUpdate?.(false);
            }
        } finally {
            setIsLoading(false);
        }
    }, [baseUrl]);

    /**
     * Exports PowerBI usage data in specified format
     * 
     * Creates downloadable files in CSV, Excel, or JSON format containing
     * all current usage data. Automatically triggers browser download.
     * 
     * @param format - Export format ('csv' | 'xlsx' | 'json')
     * 
     * @example
     * ```tsx
     * // Export as CSV
     * exportData('csv');
     * 
     * // Export as Excel
     * exportData('xlsx');
     * 
     * // Export as JSON
     * exportData('json');
     * ```
     */
    const exportData = useCallback((format: 'csv' | 'xlsx' | 'json') => {
        if (!usageData?.data || usageData.data.length === 0) {
            return;
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `PowerBI_Usage_${timestamp}`;

        if (format === 'csv') {
            // Create CSV content
            const headers = ['User ID', 'Operations', 'Creation Date', 'Client IP', 'Item Name', 'Workspace Name'];
            const csvContent = [
                headers.join(','),
                ...usageData.data.map(item => [
                    `"${item.userIds || ''}"`,
                    `"${item.operations || ''}"`,
                    `"${item.creationDate || ''}"`,
                    `"${item.clientIP || ''}"`,
                    `"${item.itemName || ''}"`,
                    `"${item.workspaceName || ''}"`
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${filename}.csv`;
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else if (format === 'xlsx') {
            // Create worksheet data (array of arrays)
            const worksheetData = [
                ['User ID', 'Operations', 'Creation Date', 'Client IP', 'Item Name', 'Workspace Name'], // Headers
                ...usageData.data.map(item => [
                    item.userIds || '',
                    item.operations || '',
                    item.creationDate || '',
                    item.clientIP || '',
                    item.itemName || '',
                    item.workspaceName || ''
                ])
            ];

            // Create worksheet from array of arrays
            const ws = XLSX.utils.aoa_to_sheet(worksheetData);

            // Create workbook and add worksheet
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "PowerBI Usage");

            // Write file (this creates proper ZIP structure automatically)
            XLSX.writeFile(wb, `${filename}.xlsx`);
        } else if (format === 'json') {
            const blob = new Blob([JSON.stringify(usageData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${filename}.json`;
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }, [usageData]);

    return {
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
    };
};