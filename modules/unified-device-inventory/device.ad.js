/**
 * Unified Device Inventory - Active Directory Device Fetcher
 * Uses existing LDAP session from auth system
 */

import { spawn } from 'child_process';
import { deviceLogger } from './device.logger.js';
import { getSession } from '../../auth-system/auth-sessions.js';

/**
 * Run PowerShell script for AD queries
 * Uses the server's existing AD connection context
 */
const runAdPowerShell = (script) => {
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
 * Fetch all AD computer objects
 * Uses session-based authentication - server domain context
 */
export const fetchAdDevices = async (adCredentials) => {
    deviceLogger.info('Fetching devices from Active Directory...');

    const { server, sessionId } = adCredentials;

    // Since we have a valid session, use current user's domain credentials
    // This leverages the existing LDAP/Kerberos session established by UniversalAuth
    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            Import-Module ActiveDirectory -ErrorAction Stop

            # Use domain-joined context with existing session
            $computers = Get-ADComputer -Filter "OperatingSystem -like 'Windows*'" -Server '${server}' -Properties Name,OperatingSystem,OperatingSystemVersion,Created,LastLogonDate,DNSHostName,DistinguishedName,Enabled,Description

            $result = @{
                devices = @($computers | ForEach-Object {
                    @{
                        name = $_.Name
                        os = $_.OperatingSystem
                        osVersion = $_.OperatingSystemVersion
                        created = if ($_.Created) { $_.Created.ToString('yyyy-MM-ddTHH:mm:ss') } else { $null }
                        lastLogon = if ($_.LastLogonDate) { $_.LastLogonDate.ToString('yyyy-MM-ddTHH:mm:ss') } else { $null }
                        dnsHostName = $_.DNSHostName
                        distinguishedName = $_.DistinguishedName
                        enabled = $_.Enabled
                        description = $_.Description
                    }
                })
                count = $computers.Count
            }

            $result | ConvertTo-Json -Depth 10 -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runAdPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.error('AD fetch failed:', data.error);
            return { devices: [], count: 0, error: data.error };
        }

        deviceLogger.info(`Fetched ${data.count} devices from Active Directory`);

        // Map to normalized format
        const devices = data.devices.map(d => ({
            displayName: d.name,
            os: d.os,
            osVersion: d.osVersion,
            createdDate: d.created,
            lastLogon: d.lastLogon,
            dnsHostName: d.dnsHostName,
            distinguishedName: d.distinguishedName,
            enabled: d.enabled,
            description: d.description,
            source: 'ad'
        }));

        return { devices, count: devices.length };
    } catch (err) {
        deviceLogger.error('AD fetch error', err);
        return { devices: [], count: 0, error: err.message };
    }
};

/**
 * Disable computer in AD
 */
export const disableAdDevice = async (adCredentials, distinguishedName) => {
    deviceLogger.audit('DISABLE_AD_START', { distinguishedName });

    const { server } = adCredentials;
    const escapedDN = distinguishedName.replace(/'/g, "''");

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            Import-Module ActiveDirectory -ErrorAction Stop

            Disable-ADAccount -Identity '${escapedDN}' -Server '${server}'

            @{ success = $true } | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runAdPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.audit('DISABLE_AD_FAILED', { distinguishedName, error: data.error });
            throw new Error(data.error);
        }

        deviceLogger.audit('DISABLE_AD_SUCCESS', { distinguishedName });
        return { success: true };
    } catch (err) {
        deviceLogger.error('Disable AD device error', err);
        throw err;
    }
};

/**
 * Delete computer from AD
 */
export const deleteAdDevice = async (adCredentials, distinguishedName) => {
    deviceLogger.audit('DELETE_AD_START', { distinguishedName });

    const { server } = adCredentials;
    const escapedDN = distinguishedName.replace(/'/g, "''");

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            Import-Module ActiveDirectory -ErrorAction Stop

            Remove-ADComputer -Identity '${escapedDN}' -Server '${server}' -Confirm:$false

            @{ success = $true } | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runAdPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.audit('DELETE_AD_FAILED', { distinguishedName, error: data.error });
            throw new Error(data.error);
        }

        deviceLogger.audit('DELETE_AD_SUCCESS', { distinguishedName });
        return { success: true };
    } catch (err) {
        deviceLogger.error('Delete AD device error', err);
        throw err;
    }
};

/**
 * Fetch AD Organizational Units
 */
export const fetchAdOUs = async (adCredentials, parentDN = null) => {
    deviceLogger.info(`Fetching OUs${parentDN ? ` under ${parentDN}` : ' (root level)'}`);

    const { server } = adCredentials;
    const searchBase = parentDN || '';

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            Import-Module ActiveDirectory -ErrorAction Stop

            ${parentDN ? `
                $ous = Get-ADOrganizationalUnit -Filter * -Server '${server}' -SearchBase '${parentDN}' -SearchScope OneLevel -Properties Name,DistinguishedName
            ` : `
                $domain = Get-ADDomain -Server '${server}'
                $ous = Get-ADOrganizationalUnit -Filter * -Server '${server}' -SearchBase $domain.DistinguishedName -SearchScope OneLevel -Properties Name,DistinguishedName
            `}

            $result = @{
                ous = @($ous | ForEach-Object {
                    @{
                        name = $_.Name
                        dn = $_.DistinguishedName
                        children = @()
                        isExpanded = $false
                        isLoading = $false
                    }
                })
                count = $ous.Count
            }

            $result | ConvertTo-Json -Depth 10 -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runAdPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.error('OU fetch failed:', data.error);
            throw new Error(data.error);
        }

        deviceLogger.info(`Fetched ${data.count} OUs`);
        return data.ous;
    } catch (err) {
        deviceLogger.error('Fetch OUs error', err);
        throw err;
    }
};

/**
 * Move computer to different OU in AD
 */
export const moveAdDevice = async (adCredentials, distinguishedName, targetOU) => {
    deviceLogger.audit('MOVE_AD_START', { distinguishedName, targetOU });

    const { server } = adCredentials;
    const escapedDN = distinguishedName.replace(/'/g, "''");
    const escapedTargetOU = targetOU.replace(/'/g, "''");

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            Import-Module ActiveDirectory -ErrorAction Stop

            Move-ADObject -Identity '${escapedDN}' -TargetPath '${escapedTargetOU}' -Server '${server}'

            @{ success = $true } | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runAdPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            deviceLogger.audit('MOVE_AD_FAILED', { distinguishedName, targetOU, error: data.error });
            throw new Error(data.error);
        }

        deviceLogger.audit('MOVE_AD_SUCCESS', { distinguishedName, targetOU });
        return { success: true };
    } catch (err) {
        deviceLogger.error('Move AD device error', err);
        throw err;
    }
};

// ... existing single functions ...

/**
 * Bulk Disable devices in AD (Single PS Session)
 */
export const bulkDisableAdDevices = async (adCredentials, distinguishedNames) => {
    if (!distinguishedNames || distinguishedNames.length === 0) return [];

    deviceLogger.audit('BULK_DISABLE_AD_START', { count: distinguishedNames.length });

    const { server } = adCredentials;

    // Safely encode DNs for PowerShell array
    const dnArray = distinguishedNames.map(dn => `'${dn.replace(/'/g, "''")}'`).join(',');

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            Import-Module ActiveDirectory -ErrorAction Stop

            $dns = @(${dnArray})
            $results = @()

            foreach ($dn in $dns) {
                try {
                    Disable-ADAccount -Identity $dn -Server '${server}' -ErrorAction Stop
                    $results += @{ dn = $dn; success = $true }
                } catch {
                    $results += @{ dn = $dn; success = $false; error = $_.Exception.Message }
                }
            }

            $results | ConvertTo-Json -Compress
        } catch {
            @{ error = "FATAL: " + $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runAdPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            throw new Error(data.error);
        }

        // Convert array result to map for easy lookup
        // PowerShell ConvertTo-Json might return single object if array has 1 item
        const resultsArray = Array.isArray(data) ? data : [data];

        deviceLogger.audit('BULK_DISABLE_AD_COMPLETE', {
            total: resultsArray.length,
            success: resultsArray.filter(r => r.success).length
        });

        return resultsArray;
    } catch (err) {
        deviceLogger.error('Bulk disable AD error', err);
        throw err;
    }
};

/**
 * Bulk Delete devices from AD (Single PS Session)
 */
export const bulkDeleteAdDevices = async (adCredentials, distinguishedNames) => {
    if (!distinguishedNames || distinguishedNames.length === 0) return [];

    deviceLogger.audit('BULK_DELETE_AD_START', { count: distinguishedNames.length });

    // Debug: Log what credentials we received
    deviceLogger.info('AD Credentials received:', { 
        hasServer: !!adCredentials?.server,
        hasUsername: !!adCredentials?.username, 
        hasPassword: !!adCredentials?.password,
        hasSessionId: !!adCredentials?.sessionId,
        server: adCredentials?.server
    });

    let { server, username, password, sessionId } = adCredentials;
    
    // If we have a sessionId, retrieve the actual credentials from the session
    if (sessionId && !username && !password) {
        const session = getSession(sessionId);
        if (session) {
            username = session.username;
            password = session.password;
            deviceLogger.info('Retrieved credentials from session');
        } else {
            deviceLogger.error('Session expired or invalid:', sessionId);
            throw new Error('Session expired. Please re-authenticate to perform AD operations.');
        }
    }

    const dnArray = distinguishedNames.map(dn => `'${dn.replace(/'/g, "''")}'`).join(',');

    // Build authentication part of the script
    let authScript = '';
    let removeCommand = '';
    
    if (username && password) {
        // Use explicit credentials
        authScript = `
            $securePassword = ConvertTo-SecureString '${password.replace(/'/g, "''")}' -AsPlainText -Force
            $credential = New-Object System.Management.Automation.PSCredential('${username.replace(/'/g, "''")}', $securePassword)
        `;
        removeCommand = `Remove-ADComputer -Identity $dn -Server '${server}' -Credential $credential -Confirm:$false -ErrorAction Stop`;
        deviceLogger.info('Using explicit credentials for AD deletion');
    } else {
        throw new Error('No valid AD credentials available for device deletion');
    }

    const script = `
        $ProgressPreference = 'SilentlyContinue'
        $WarningPreference = 'SilentlyContinue'
        $ErrorActionPreference = 'Stop'
        try {
            Import-Module ActiveDirectory -ErrorAction Stop
            ${authScript}

            $dns = @(${dnArray})
            $results = @()

            foreach ($dn in $dns) {
                try {
                    ${removeCommand}
                    $results += @{ dn = $dn; success = $true }
                } catch {
                    $results += @{ dn = $dn; success = $false; error = $_.Exception.Message }
                }
            }

            $results | ConvertTo-Json -Compress
        } catch {
            @{ error = "FATAL: " + $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runAdPowerShell(script);
        
        // Debug: Log the raw PowerShell output
        deviceLogger.info('PowerShell raw output:', result.output);
        deviceLogger.info('PowerShell stderr:', result.stderr);
        
        const data = JSON.parse(result.output);

        if (data.error) {
            throw new Error(data.error);
        }

        const resultsArray = Array.isArray(data) ? data : [data];

        deviceLogger.audit('BULK_DELETE_AD_COMPLETE', {
            total: resultsArray.length,
            success: resultsArray.filter(r => r.success).length
        });

        return resultsArray;
    } catch (err) {
        deviceLogger.error('Bulk delete AD error', err);
        throw err;
    }
};

export default {
    fetchAdDevices,
    disableAdDevice,
    deleteAdDevice,
    fetchAdOUs,
    moveAdDevice,
    bulkDisableAdDevices,
    bulkDeleteAdDevices
};
