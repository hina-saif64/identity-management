/**
 * Unified Device Inventory - Entra ID Device Fetcher
 * Fetches devices from Microsoft Entra ID via Graph API
 */

import { spawn } from 'child_process';
import { deviceLogger } from './device.logger.js';
import { GRAPH_ENDPOINTS } from './device.constants.js';

/**
 * Run PowerShell script for Graph API call
 */
const runGraphPowerShell = (script) => {
    return new Promise((resolve, reject) => {
        const ps = spawn('powershell.exe', [
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy', 'Bypass',
            '-Command', script
        ]);

        let stdout = '';
        let stderr = '';

        ps.stdout.on('data', (data) => { stdout += data.toString(); });
        ps.stderr.on('data', (data) => { stderr += data.toString(); });

        ps.on('close', (code) => {
            if (code !== 0 && !stdout.trim()) {
                reject(new Error(stderr || `PowerShell exited with code ${code}`));
            } else {
                resolve({ output: stdout.trim(), stderr: stderr.trim() });
            }
        });

        ps.on('error', reject);
    });
};

/**
 * Fetch all Entra ID devices with pagination
 * Returns Windows devices only
 */
export const fetchEntraDevices = async (credentials, pageSize = 100, onProgress = null) => {
    deviceLogger.info('Fetching devices from Entra ID...');

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            $clientSecret = Get-AzKeyVaultSecret -VaultName '${credentials.vaultName}' -Name '${credentials.secretName}' -AsPlainText

            $body = @{
                grant_type    = 'client_credentials'
                client_id     = '${credentials.appId}'
                client_secret = $clientSecret
                scope         = 'https://graph.microsoft.com/.default'
            }

            $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token" -Method POST -Body $body
            $token = $tokenResponse.access_token

            $headers = @{
                'Authorization' = "Bearer " + $token
                'Content-Type'  = 'application/json'
            }

            $allDevices = @()
            $uri = "https://graph.microsoft.com/v1.0/devices?" + '$top=${pageSize}&$filter=startswith(operatingSystem,''Windows'')&$select=id,displayName,deviceId,operatingSystem,operatingSystemVersion,trustType,approximateLastSignInDateTime,registrationDateTime,accountEnabled'

            do {
                $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method GET
                $allDevices += $response.value
                $uri = $response.'@odata.nextLink'
            } while ($uri)

            $result = @{
                devices = $allDevices
                count = $allDevices.Count
            }

            $result | ConvertTo-Json -Depth 10 -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.error('Entra fetch failed:', data.error);
            return { devices: [], count: 0, error: data.error };
        }

        deviceLogger.info(`Fetched ${data.count} devices from Entra ID`);

        // Map to normalized format
        const devices = data.devices.map(d => ({
            id: d.id,
            deviceId: d.deviceId,
            displayName: d.displayName,
            os: d.operatingSystem,
            osVersion: d.operatingSystemVersion,
            trustType: d.trustType, // ServerAd = Hybrid, AzureAd = AAD Joined
            lastSignIn: d.approximateLastSignInDateTime,
            registeredDate: d.registrationDateTime,
            enabled: d.accountEnabled,
            source: 'entra'
        }));

        return { devices, count: devices.length };
    } catch (err) {
        deviceLogger.error('Entra fetch error', err);
        return { devices: [], count: 0, error: err.message };
    }
};

/**
 * Remove device from Entra ID
 */
export const removeEntraDevice = async (credentials, deviceId) => {
    deviceLogger.audit('REMOVE_ENTRA_START', { deviceId });

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            $clientSecret = Get-AzKeyVaultSecret -VaultName '${credentials.vaultName}' -Name '${credentials.secretName}' -AsPlainText

            $body = @{
                grant_type    = 'client_credentials'
                client_id     = '${credentials.appId}'
                client_secret = $clientSecret
                scope         = 'https://graph.microsoft.com/.default'
            }

            $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token" -Method POST -Body $body
            $token = $tokenResponse.access_token

            $headers = @{
                'Authorization' = "Bearer " + $token
            }

            Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/devices/${deviceId}" -Headers $headers -Method DELETE

            @{ success = $true } | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.audit('REMOVE_ENTRA_FAILED', { deviceId, error: data.error });
            throw new Error(data.error);
        }

        deviceLogger.audit('REMOVE_ENTRA_SUCCESS', { deviceId });
        return { success: true };
    } catch (err) {
        deviceLogger.error('Remove Entra device error', err);
        throw err;
    }
};

/**
 * Fetch deleted Entra ID devices from last X days
 * Uses Audit Logs API since devices are not supported in deletedItems endpoint
 */
export const fetchEntraDeletedDevices = async (credentials, daysBack = 7) => {
    deviceLogger.info(`Fetching deleted devices from Entra ID audit logs (last ${daysBack} days)...`);

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            $clientSecret = Get-AzKeyVaultSecret -VaultName '${credentials.vaultName}' -Name '${credentials.secretName}' -AsPlainText

            $body = @{
                grant_type    = 'client_credentials'
                client_id     = '${credentials.appId}'
                client_secret = $clientSecret
                scope         = 'https://graph.microsoft.com/.default'
            }

            $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token" -Method POST -Body $body
            $token = $tokenResponse.access_token

            $headers = @{
                'Authorization' = "Bearer " + $token
                'Content-Type'  = 'application/json'
            }

            # Calculate date filter for last X days (ISO 8601 format)
            $cutoffDate = (Get-Date).AddDays(-${daysBack}).ToString('yyyy-MM-ddTHH:mm:ss.fffZ')

            # Fetch audit logs for device deletions
            # Filter: activityDisplayName eq 'Delete device' and activityDateTime ge cutoffDate
            $filter = "activityDisplayName eq 'Delete device' and activityDateTime ge $cutoffDate"
            $uri = "https://graph.microsoft.com/v1.0/auditLogs/directoryAudits?" + '$filter=' + [System.Web.HttpUtility]::UrlEncode($filter) + '&$top=999&$orderby=activityDateTime desc'

            $allDeletedDevices = @()
            do {
                $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method GET
                
                # Process audit log entries to extract device information
                foreach ($auditEntry in $response.value) {
                    # Extract device info from targetResources
                    foreach ($target in $auditEntry.targetResources) {
                        if ($target.type -eq 'Device' -and $target.displayName) {
                            $deviceInfo = @{
                                id = $auditEntry.id
                                displayName = $target.displayName
                                deviceId = $target.id
                                deletedDateTime = $auditEntry.activityDateTime
                                deletedBy = if ($auditEntry.initiatedBy.user) { $auditEntry.initiatedBy.user.userPrincipalName } else { 'System' }
                                correlationId = $auditEntry.correlationId
                                # Try to extract OS info from additional details if available
                                operatingSystem = 'Windows' # Default assumption since we're filtering Windows devices
                                operatingSystemVersion = ''
                            }
                            $allDeletedDevices += $deviceInfo
                        }
                    }
                }
                
                $uri = $response.'@odata.nextLink'
            } while ($uri)

            $result = @{
                devices = $allDeletedDevices
                count = $allDeletedDevices.Count
                daysBack = ${daysBack}
                cutoffDate = $cutoffDate
            }

            $result | ConvertTo-Json -Depth 10 -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.error('Entra deleted devices fetch failed:', data.error);
            return { devices: [], count: 0, error: data.error, daysBack };
        }

        deviceLogger.info(`Fetched ${data.count} deleted devices from Entra ID (last ${daysBack} days)`);

        // Map to normalized format (from audit logs)
        const devices = data.devices.map(d => ({
            id: d.id, // audit log ID
            deviceId: d.deviceId,
            displayName: d.displayName,
            os: d.operatingSystem || 'Windows',
            osVersion: d.operatingSystemVersion || '',
            deletedDate: d.deletedDateTime,
            lastSignIn: null, // Not available in audit logs
            deletedBy: d.deletedBy,
            correlationId: d.correlationId,
            source: 'entra-deleted',
            daysAgo: Math.floor((new Date() - new Date(d.deletedDateTime)) / (1000 * 60 * 60 * 24))
        }));

        return { devices, count: devices.length, daysBack };
    } catch (err) {
        deviceLogger.error('Entra deleted devices fetch error', err);
        return { devices: [], count: 0, error: err.message, daysBack };
    }
};

/**
 * Disable device in Entra ID
 */
export const disableEntraDevice = async (credentials, deviceId) => {
    deviceLogger.audit('DISABLE_ENTRA_START', { deviceId });

    try {
        const accessToken = await getAccessToken(credentials);

        // Disable device by setting accountEnabled to false
        const response = await fetch(`https://graph.microsoft.com/v1.0/devices/${deviceId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accountEnabled: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        deviceLogger.audit('DISABLE_ENTRA_SUCCESS', { deviceId });
        return { success: true };
    } catch (err) {
        deviceLogger.audit('DISABLE_ENTRA_FAILED', { deviceId, error: err.message });
        throw err;
    }
};

export default {
    fetchEntraDevices,
    removeEntraDevice,
    fetchEntraDeletedDevices,
    disableEntraDevice
};
