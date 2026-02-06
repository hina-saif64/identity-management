/**
 * 🔒 HYPERION AD AUTHENTICATION - LOCKED MODULE
 * Version: 1.0.0-LOCKED
 * Last Modified: January 2, 2026
 * Status: PRODUCTION READY - DO NOT MODIFY
 */

import { runPs } from '../gateway-core.js';
import { sessionManager } from './auth-sessions.js';
import { AUTH_CONFIG, VALIDATION_PATTERNS, AUTH_ERRORS } from './auth-config.js';

/**
 * Sanitize input for PowerShell
 */
const sanitizeInput = (input) => {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/'/g, "''").replace(/"/g, '""');
};

/**
 * Get secret from Azure Key Vault
 */
const getVaultSecret = async (vaultName, secretName, tenantId, clientId, clientSecret) => {
    const cmd = `
        try {
            if (-not (Get-Module -ListAvailable -Name Az.KeyVault)) {
                Install-Module -Name Az.KeyVault -Force -AllowClobber -Scope CurrentUser
            }
            Import-Module Az.KeyVault -Force
            
            $secureSecret = ConvertTo-SecureString "${sanitizeInput(clientSecret)}" -AsPlainText -Force
            $credential = New-Object System.Management.Automation.PSCredential("${sanitizeInput(clientId)}", $secureSecret)
            Connect-AzAccount -ServicePrincipal -Credential $credential -Tenant "${sanitizeInput(tenantId)}" -ErrorAction Stop
            
            $secret = Get-AzKeyVaultSecret -VaultName "${sanitizeInput(vaultName)}" -Name "${sanitizeInput(secretName)}" -AsPlainText -ErrorAction Stop
            return $secret
        } catch {
            return "VAULT_ERROR: " + $_.Exception.Message
        }
    `;
    
    const result = await runPs(cmd);
    if (result.status === 'success' && !result.output.startsWith('VAULT_ERROR:')) {
        return result.output.trim();
    }
    
    throw new Error(result.output || AUTH_ERRORS.VAULT_ACCESS_DENIED);
};

/**
 * Test AD connection
 */
export const testADConnection = async (params) => {
    const { server, username, password, method, tenantId, clientId, clientSecret, vaultName, secretName } = params;
    
    // Input validation
    if (!server || !VALIDATION_PATTERNS.DOMAIN.test(server)) {
        throw new Error('Invalid server domain format');
    }
    
    if (!username || !VALIDATION_PATTERNS.USERNAME.test(username)) {
        throw new Error('Invalid username format');
    }
    
    let actualPassword = password;
    
    // Handle Azure Key Vault authentication
    if (method === 'AzureKeyVault') {
        if (!tenantId || !VALIDATION_PATTERNS.TENANT_ID.test(tenantId)) {
            throw new Error('Invalid tenant ID format');
        }
        
        if (!clientId || !clientSecret || !vaultName || !secretName) {
            throw new Error('Missing Key Vault parameters');
        }
        
        actualPassword = await getVaultSecret(vaultName, secretName, tenantId, clientId, clientSecret);
    }
    
    if (!actualPassword) {
        throw new Error('Password is required');
    }
    
    // Sanitize inputs
    const s = sanitizeInput(server);
    const u = sanitizeInput(username);
    const p = sanitizeInput(actualPassword);
    
    const cmd = `
        $ProgressPreference = 'SilentlyContinue'
        try { 
            Import-Module ActiveDirectory -Force -DisableNameChecking -ErrorAction Stop 
        } catch { 
            return "FAIL_ENV: ActiveDirectory PowerShell module (RSAT) missing or could not be loaded on host." 
        }
        
        try {
            $params = @{}
            if ('${s}') { 
                $test = Test-NetConnection -ComputerName "${s}" -Port 389 -InformationLevel Quiet
                if (-not $test) { return "FAIL_REACH: DC Server ${s} not responding on LDAP port 389." }
                $params["Server"] = "${s}" 
            }
            
            if ('${u}' -and '${p}') {
                $netCred = New-Object System.Net.NetworkCredential('${u}', '${p}')
                $params["Credential"] = New-Object System.Management.Automation.PSCredential ('${u}', $netCred.SecurePassword)
            }
            
            $root = Get-ADRootDSE @params -ErrorAction Stop
            return "SUCCESS: Connected to $($root.dnsHostName)"
        } catch {
            $msg = $_.Exception.Message
            if ($msg -like "*Logon failure*") { return "FAIL_AUTH: Authentication failed for user ${u}. Check credentials." }
            if ($msg -like "*The server is not operational*") { return "FAIL_REACH: Target domain/server is not reachable via LDAP." }
            return "FAIL_GENERIC: " + $msg
        }
    `;
    
    const result = await runPs(cmd);
    
    if (result.status !== 'success') {
        throw new Error(result.detail || AUTH_ERRORS.CONNECTION_FAILED);
    }
    
    if (!result.output.startsWith('SUCCESS:')) {
        throw new Error(result.output || AUTH_ERRORS.INVALID_CREDENTIALS);
    }
    
    // Create session on successful authentication
    const sessionId = sessionManager.create({
        type: 'AD',
        server,
        username,
        password: actualPassword, // Store the actual password (from vault if applicable)
        method,
        authenticatedAt: Date.now()
    });
    
    return {
        success: true,
        message: result.output,
        sessionId,
        server,
        username
    };
};

/**
 * Validate AD session
 */
export const validateADSession = (sessionId) => {
    const session = sessionManager.get(sessionId);
    return session && session.type === 'AD';
};

/**
 * Get AD session data
 */
export const getADSession = (sessionId) => {
    const session = sessionManager.get(sessionId);
    if (!session || session.type !== 'AD') {
        return null;
    }
    
    return {
        server: session.server,
        username: session.username,
        password: session.password,
        method: session.method,
        authenticatedAt: session.authenticatedAt
    };
};

/**
 * Destroy AD session
 */
export const destroyADSession = (sessionId) => {
    return sessionManager.destroy(sessionId);
};

// Export AD authentication object
export const adAuth = {
    test: testADConnection,
    validate: validateADSession,
    getSession: getADSession,
    destroy: destroyADSession
};