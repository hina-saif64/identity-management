/**
 * Unified Device Inventory - Defender for Endpoint Integration
 * Fetches device onboarding status from Microsoft Defender API
 */

import { spawn } from 'child_process';
import { deviceLogger } from './device.logger.js';

/**
 * Run PowerShell script for Defender API calls
 */
const runDefenderPowerShell = (script) => {
    return new Promise((resolve, reject) => {
        const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
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
 * Fetch all machines from Defender for Endpoint API
 * Uses the existing Azure Key Vault credentials
 */
export const fetchDefenderMachines = async (cloudCredentials) => {
    deviceLogger.info('Fetching machines from Defender for Endpoint...');

    const { tenantId, appId, vaultName, secretName } = cloudCredentials;

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            # Get secret from Key Vault
            $secret = Get-AzKeyVaultSecret -VaultName '${vaultName}' -Name '${secretName}' -AsPlainText -ErrorAction Stop

            # Get access token for Defender API (WindowsDefenderATP)
            $body = @{
                grant_type    = "client_credentials"
                client_id     = "${appId}"
                client_secret = $secret
                resource      = "https://securitycenter.onmicrosoft.com/windowsatpservice"
            }

            $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${tenantId}/oauth2/token" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
            $accessToken = $tokenResponse.access_token

            # Fetch machines from Defender API
            $headers = @{
                Authorization = "Bearer $accessToken"
                'Content-Type' = 'application/json'
            }

            $allMachines = @()
            $nextLink = "https://api.securitycenter.microsoft.com/api/machines?\$top=10000"

            while ($nextLink) {
                $response = Invoke-RestMethod -Uri $nextLink -Headers $headers -Method Get
                $allMachines += $response.value
                $nextLink = $response.'@odata.nextLink'
            }

            $result = @{
                machines = @($allMachines | ForEach-Object {
                    @{
                        id = $_.id
                        computerDnsName = $_.computerDnsName
                        deviceName = if ($_.computerDnsName) { ($_.computerDnsName -split '\\.')[0] } else { $null }
                        onboardingStatus = $_.onboardingStatus
                        healthStatus = $_.healthStatus
                        riskScore = $_.riskScore
                        exposureLevel = $_.exposureLevel
                        osPlatform = $_.osPlatform
                        osVersion = $_.osVersion
                        lastSeen = $_.lastSeen
                        machineTags = $_.machineTags
                    }
                })
                count = $allMachines.Count
            }

            $result | ConvertTo-Json -Depth 10 -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runDefenderPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.error('Defender fetch failed:', data.error);
            return { machines: [], count: 0, error: data.error };
        }

        deviceLogger.info(`Fetched ${data.count} machines from Defender for Endpoint`);

        // Create lookup map by device name (lowercase)
        const machineMap = new Map();
        for (const machine of data.machines) {
            if (machine.deviceName) {
                machineMap.set(machine.deviceName.toLowerCase(), machine);
            }
        }

        return {
            machines: data.machines,
            machineMap,
            count: data.count
        };
    } catch (err) {
        deviceLogger.error('Defender fetch error', err);
        return { machines: [], machineMap: new Map(), count: 0, error: err.message };
    }
};

/**
 * Get onboarding status for a single device
 * Returns: 'Onboarded', 'Not Onboarded', 'Unknown', 'Unsupported'
 */
export const getDefenderStatus = (deviceName, machineMap) => {
    if (!machineMap || !deviceName) {
        return 'Unknown';
    }

    const machine = machineMap.get(deviceName.toLowerCase());

    if (!machine) {
        return 'Unknown'; // Device not found in Defender
    }

    switch (machine.onboardingStatus) {
        case 'Onboarded':
            return 'Onboarded';
        case 'CanBeOnboarded':
            return 'Not Onboarded';
        case 'Unsupported':
            return 'Unsupported';
        case 'InsufficientInfo':
        default:
            return 'Unknown';
    }
};

export default {
    fetchDefenderMachines,
    getDefenderStatus
};
