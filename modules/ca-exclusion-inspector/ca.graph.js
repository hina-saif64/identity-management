/**
 * CA Exclusion Inspector - Microsoft Graph API Client
 * All Graph API calls for this module
 * 
 * USES EXISTING AUTH: Relies on cloudConnection credentials passed from frontend
 */

import { spawn } from 'child_process';
import { GRAPH_ENDPOINTS, SIGN_IN_HOURS } from './ca.constants.js';
import caLogger from './ca.logger.js';

/**
 * Execute PowerShell command for Graph API
 * Uses Azure Key Vault credentials from cloudConnection
 */
const runGraphPowerShell = async (script) => {
    return new Promise((resolve, reject) => {
        const ps = spawn('pwsh', ['-NoProfile', '-Command', script], {
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        });

        let stdout = '';
        let stderr = '';

        ps.stdout.on('data', (data) => { stdout += data.toString(); });
        ps.stderr.on('data', (data) => { stderr += data.toString(); });

        ps.on('close', (code) => {
            if (code === 0) {
                resolve({ status: 'success', output: stdout.trim() });
            } else {
                reject({ status: 'error', error: stderr || 'PowerShell execution failed' });
            }
        });

        ps.on('error', (err) => {
            reject({ status: 'error', error: err.message });
        });
    });
};

/**
 * Fetch all Conditional Access policies
 */
export const fetchCaPolicies = async (credentials) => {
    caLogger.info('Fetching CA policies...');

    const script = `
        $ErrorActionPreference = 'Stop'
        try {
            # Get access token from Key Vault
            $clientSecret = Get-AzKeyVaultSecret -VaultName '${credentials.vaultName}' -Name '${credentials.secretName}' -AsPlainText
            
            # Get Graph token
            $body = @{
                grant_type    = 'client_credentials'
                client_id     = '${credentials.appId}'
                client_secret = $clientSecret
                scope         = 'https://graph.microsoft.com/.default'
            }
            
            $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token" -Method POST -Body $body
            $token = $tokenResponse.access_token
            
            # Fetch CA policies
            $headers = @{
                'Authorization' = "Bearer $token"
                'Content-Type'  = 'application/json'
            }
            
            $response = Invoke-RestMethod -Uri 'https://graph.microsoft.com/v1.0${GRAPH_ENDPOINTS.CA_POLICIES}' -Headers $headers -Method GET
            
            $response.value | ConvertTo-Json -Depth 10 -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            throw new Error(data.error);
        }

        caLogger.info('Fetched ' + (Array.isArray(data) ? data.length : 0) + ' CA policies');
        return Array.isArray(data) ? data : [];
    } catch (err) {
        caLogger.error('Failed to fetch CA policies', err);
        throw err;
    }
};

/**
 * Fetch user details by ID
 */
export const fetchUser = async (credentials, userId) => {
    // Build URL without using $ in template - use string concatenation
    const graphUrl = 'https://graph.microsoft.com/v1.0/users/' + userId;

    const script = `
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
                'Authorization' = "Bearer $token"
                'Content-Type'  = 'application/json'
            }
            
            $response = Invoke-RestMethod -Uri '${graphUrl}' -Headers $headers -Method GET
            
            $response | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            caLogger.warn('Failed to fetch user ' + userId + ':', data.error);
            return null;
        }

        return data;
    } catch (err) {
        caLogger.warn('Failed to fetch user ' + userId, err);
        return null;
    }
};

/**
 * Fetch group members
 */
export const fetchGroupMembers = async (credentials, groupId) => {
    const graphUrl = 'https://graph.microsoft.com/v1.0/groups/' + groupId + '/members';

    const script = `
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
                'Authorization' = "Bearer $token"
                'Content-Type'  = 'application/json'
            }
            
            $response = Invoke-RestMethod -Uri '${graphUrl}' -Headers $headers -Method GET
            
            $response.value | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            caLogger.warn('Failed to fetch group members ' + groupId + ':', data.error);
            return [];
        }

        return Array.isArray(data) ? data : [];
    } catch (err) {
        caLogger.warn('Failed to fetch group members ' + groupId, err);
        return [];
    }
};

/**
 * Fetch recent sign-in logs for a user (last 48 hours)
 */
export const fetchUserSignIns = async (credentials, userId) => {
    const startDate = new Date(Date.now() - SIGN_IN_HOURS * 60 * 60 * 1000).toISOString();

    const script = `
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
                'Authorization' = "Bearer $token"
                'Content-Type'  = 'application/json'
            }
            
            # Filter: last 48 hours, successful sign-ins only
            $filter = "userId eq '${userId}' and createdDateTime ge ${startDate} and status/errorCode eq 0"
            $url = "https://graph.microsoft.com/v1.0/auditLogs/signIns?" + '$' + "filter=" + [System.Web.HttpUtility]::UrlEncode($filter) + "&" + '$' + "orderby=createdDateTime desc&" + '$' + "top=1"
            
            $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
            
            $response.value | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            caLogger.debug('No sign-ins for user ' + userId + ':', data.error);
            return null;
        }

        // Return most recent sign-in
        return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (err) {
        caLogger.debug('Failed to fetch sign-ins for user ' + userId, err);
        return null;
    }
};

/**
 * Fetch multiple users in a SINGLE PowerShell call (batch operation)
 * Much faster than calling fetchUser for each user
 */
export const fetchUsersBatch = async (credentials, userIds) => {
    if (!userIds || userIds.length === 0) return [];

    // Filter out special values
    const validUserIds = userIds.filter(id => id && id !== 'All' && id !== 'GuestsOrExternalUsers');
    if (validUserIds.length === 0) return [];

    caLogger.info('Batch fetching ' + validUserIds.length + ' users...');

    // Create comma-separated list of user IDs for PowerShell
    const userIdsJson = JSON.stringify(validUserIds);

    const script = `
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
            
            $userIds = '${userIdsJson}' | ConvertFrom-Json
            $results = @()
            
            foreach ($userId in $userIds) {
                try {
                    $url = "https://graph.microsoft.com/v1.0/users/" + $userId
                    $user = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
                    $results += @{
                        id = $user.id
                        displayName = $user.displayName
                        userPrincipalName = $user.userPrincipalName
                        mail = $user.mail
                    }
                } catch {
                    # Skip failed users
                }
            }
            
            $results | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            caLogger.error('Batch user fetch failed:', data.error);
            return [];
        }

        caLogger.info('Batch fetched ' + (Array.isArray(data) ? data.length : 1) + ' users');

        // Handle single result vs array
        if (Array.isArray(data)) {
            return data;
        } else if (data && data.id) {
            return [data];
        }
        return [];
    } catch (err) {
        caLogger.error('Batch user fetch error', err);
        return [];
    }
};

/**
 * Fetch sign-in logs for multiple users in a SINGLE PowerShell call (batch operation)
 */
export const fetchSignInsBatch = async (credentials, userIds) => {
    if (!userIds || userIds.length === 0) return {};

    const startDate = new Date(Date.now() - SIGN_IN_HOURS * 60 * 60 * 1000).toISOString();
    const userIdsJson = JSON.stringify(userIds);

    caLogger.info('Batch fetching sign-ins for ' + userIds.length + ' users...');

    const script = `
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
            
            $userIds = '${userIdsJson}' | ConvertFrom-Json
            $results = @{}
            
            foreach ($userId in $userIds) {
                try {
                    $filter = "userId eq '" + $userId + "' and createdDateTime ge ${startDate}"
                    $url = "https://graph.microsoft.com/v1.0/auditLogs/signIns?" + '$' + "filter=" + [System.Web.HttpUtility]::UrlEncode($filter) + "&" + '$' + "orderby=createdDateTime desc&" + '$' + "top=1"
                    
                    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET
                    
                    if ($response.value -and $response.value.Count -gt 0) {
                        $signIn = $response.value[0]
                        $results[$userId] = @{
                            country = $signIn.location.countryOrRegion
                            city = $signIn.location.city
                            ipAddress = $signIn.ipAddress
                            timestamp = $signIn.createdDateTime
                        }
                    }
                } catch {
                    # Skip failed users - no sign-in data
                }
            }
            
            $results | ConvertTo-Json -Compress -Depth 3
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            caLogger.warn('Batch sign-in fetch failed:', data.error);
            return {};
        }

        const count = Object.keys(data).length;
        caLogger.info('Batch fetched sign-ins for ' + count + ' users');
        return data;
    } catch (err) {
        caLogger.warn('Batch sign-in fetch error', err);
        return {};
    }
};

/**
 * Remove users from CA policy exclusion list via Graph PATCH
 * WRITE ACTION - Requires Policy.ReadWrite.ConditionalAccess permission
 */
export const removeExclusions = async (credentials, policyId, userIdsToRemove) => {
    if (!policyId || !userIdsToRemove || userIdsToRemove.length === 0) {
        throw new Error('Policy ID and user IDs are required');
    }

    caLogger.audit('REMOVE_EXCLUSION_START', { policyId, userCount: userIdsToRemove.length });

    const userIdsJson = JSON.stringify(userIdsToRemove);

    const script = `
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
            
            # First, get current policy to preserve other exclusions
            $policyUrl = "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies/${policyId}"
            $policy = Invoke-RestMethod -Uri $policyUrl -Headers $headers -Method GET
            
            # Get current excluded users
            $currentExcluded = @($policy.conditions.users.excludeUsers)
            $removeIds = '${userIdsJson}' | ConvertFrom-Json
            
            # Filter out the users to remove
            $newExcluded = @($currentExcluded | Where-Object { $_ -notin $removeIds })
            
            # Create PATCH body - only update excludeUsers
            $patchBody = @{
                conditions = @{
                    users = @{
                        excludeUsers = $newExcluded
                    }
                }
            } | ConvertTo-Json -Depth 5 -Compress
            
            # PATCH the policy
            $result = Invoke-RestMethod -Uri $policyUrl -Headers $headers -Method PATCH -Body $patchBody
            
            @{
                success = $true
                removedCount = $removeIds.Count
                remainingExcluded = $newExcluded.Count
            } | ConvertTo-Json -Compress
        } catch {
            @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runGraphPowerShell(script);
        const data = JSON.parse(result.output);

        if (data.error) {
            caLogger.audit('REMOVE_EXCLUSION_FAILED', { policyId, error: data.error });
            throw new Error(data.error);
        }

        caLogger.audit('REMOVE_EXCLUSION_SUCCESS', {
            policyId,
            removedCount: data.removedCount,
            remainingExcluded: data.remainingExcluded
        });

        return data;
    } catch (err) {
        caLogger.error('Remove exclusions error', err);
        throw err;
    }
};

export default {
    fetchCaPolicies,
    fetchUser,
    fetchUsersBatch,
    fetchGroupMembers,
    fetchUserSignIns,
    fetchSignInsBatch,
    removeExclusions
};
