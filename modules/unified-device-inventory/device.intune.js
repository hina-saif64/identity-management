/**
 * Unified Device Inventory - Intune Device Fetcher
 * Fetches devices from Microsoft Intune via Graph API
 */

import { spawn } from 'child_process';
import { deviceLogger } from './device.logger.js';

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
 * Fetch all Intune managed devices with pagination
 * Returns Windows devices only
 */
export const fetchIntuneDevices = async (credentials, pageSize = 100) => {
    deviceLogger.info('Fetching devices from Intune...');

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
            $uri = "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?" + '$top=${pageSize}&$filter=startswith(operatingSystem,''Windows'')&$select=id,deviceName,operatingSystem,osVersion,complianceState,lastSyncDateTime,enrolledDateTime,userPrincipalName,userDisplayName,managementAgent,deviceEnrollmentType'

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
            deviceLogger.error('Intune fetch failed:', data.error);
            return { devices: [], count: 0, error: data.error };
        }

        deviceLogger.info(`Fetched ${data.count} devices from Intune`);

        // Map to normalized format
        const devices = data.devices.map(d => ({
            id: d.id,
            displayName: d.deviceName,
            os: d.operatingSystem,
            osVersion: d.osVersion,
            complianceState: d.complianceState,
            lastSync: d.lastSyncDateTime,
            enrolledDate: d.enrolledDateTime,
            userPrincipalName: d.userPrincipalName,
            userDisplayName: d.userDisplayName,
            managementAgent: d.managementAgent,
            enrollmentType: d.deviceEnrollmentType,
            source: 'intune'
        }));

        return { devices, count: devices.length };
    } catch (err) {
        deviceLogger.error('Intune fetch error', err);
        return { devices: [], count: 0, error: err.message };
    }
};

/**
 * Remove device from Intune (retire/wipe)
 */
export const removeIntuneDevice = async (credentials, deviceId) => {
    deviceLogger.audit('REMOVE_INTUNE_START', { deviceId });

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

            # Retire the device (removes company data but keeps personal)
            Invoke-RestMethod -Uri "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${deviceId}/retire" -Headers $headers -Method POST

            @{ success = $true } | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.audit('REMOVE_INTUNE_FAILED', { deviceId, error: data.error });
            throw new Error(data.error);
        }

        deviceLogger.audit('REMOVE_INTUNE_SUCCESS', { deviceId });
        return { success: true };
    } catch (err) {
        deviceLogger.error('Remove Intune device error', err);
        throw err;
    }
};

/**
 * Disable device in Intune (set to non-compliant/block)
 */
export const disableIntuneDevice = async (credentials, deviceId) => {
    deviceLogger.audit('DISABLE_INTUNE_START', { deviceId });

    try {
        const accessToken = await getAccessToken(credentials);

        // Retire the device (soft disable)
        const response = await fetch(`https://graph.microsoft.com/v1.0/deviceManagement/managedDevices/${deviceId}/retire`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        deviceLogger.audit('DISABLE_INTUNE_SUCCESS', { deviceId });
        return { success: true };
    } catch (err) {
        deviceLogger.audit('DISABLE_INTUNE_FAILED', { deviceId, error: err.message });
        throw err;
    }
};

export default {
    fetchIntuneDevices,
    removeIntuneDevice,
    disableIntuneDevice
};
