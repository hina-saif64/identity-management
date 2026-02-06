/**
 * 🔒 HYPERION CLOUD AUTHENTICATION - LOCKED MODULE
 * Version: 1.0.0-LOCKED
 * Last Modified: January 2, 2026
 * Status: PRODUCTION READY - DO NOT MODIFY
 */

import { runPs } from '../gateway-core.js';
import { sessionManager } from './auth-sessions.js';
import { AUTH_CONFIG, VALIDATION_PATTERNS, AUTH_ERRORS } from './auth-config.js';

/**
 * Get secret from Azure Key Vault
 */
const getVaultSecret = async (vaultName, secretName) => {
    const cmd = `Get-AzKeyVaultSecret -VaultName "${vaultName}" -Name "${secretName}" -AsPlainText -ErrorAction Stop`;
    const result = await runPs(cmd);
    if (result.status === 'success') return result.output.trim();
    throw new Error(result.detail || AUTH_ERRORS.VAULT_ACCESS_DENIED);
};

/**
 * Fetch OAuth token from Microsoft
 */
const fetchOAuthToken = async (tenantId, clientId, clientSecret, resource) => {
    const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: `${resource}/.default`,
            grant_type: 'client_credentials'
        })
    });
    
    const data = await response.json();
    
    if (!data.access_token) {
        throw new Error(data.error_description || AUTH_ERRORS.INVALID_TOKEN);
    }
    
    return {
        token: data.access_token,
        expiresIn: data.expires_in,
        expiresAt: Date.now() + (data.expires_in * 1000)
    };
};

/**
 * Test cloud connection
 */
export const testCloudConnection = async (params) => {
    const { tenantId, appId, vaultName, secretName, organization } = params;
    
    // Input validation
    if (!tenantId || !VALIDATION_PATTERNS.TENANT_ID.test(tenantId)) {
        throw new Error('Invalid tenant ID format');
    }
    
    if (!appId || !VALIDATION_PATTERNS.TENANT_ID.test(appId)) {
        throw new Error('Invalid application ID format');
    }
    
    if (!vaultName || !secretName) {
        throw new Error('Vault name and secret name are required');
    }
    
    try {
        // Get client secret from vault
        const clientSecret = await getVaultSecret(vaultName, secretName);
        
        // Get Graph API token
        const graphToken = await fetchOAuthToken(tenantId, appId, clientSecret, 'https://graph.microsoft.com');
        
        // Test Graph API access by fetching domains
        const domainResponse = await fetch('https://graph.microsoft.com/v1.0/domains', {
            headers: { 'Authorization': 'Bearer ' + graphToken.token }
        });
        
        if (!domainResponse.ok) {
            throw new Error('Failed to access Microsoft Graph API');
        }
        
        const domainData = await domainResponse.json();
        const verifiedDomains = (domainData.value || []).filter(d => d.isVerified).map(d => d.id);
        
        // Try to get Management API token (optional)
        let mgmtToken = null;
        try {
            mgmtToken = await fetchOAuthToken(tenantId, appId, clientSecret, 'https://manage.office.com');
        } catch (e) {
            console.warn('[CLOUD-AUTH] Management API token fetch failed - continuing without it');
        }
        
        // Create session on successful authentication
        const sessionId = sessionManager.create({
            type: 'CLOUD',
            tenantId,
            appId,
            vaultName,
            secretName,
            organization,
            graphToken: graphToken.token,
            graphTokenExpiry: graphToken.expiresAt,
            mgmtToken: mgmtToken?.token || null,
            mgmtTokenExpiry: mgmtToken?.expiresAt || null,
            verifiedDomains,
            authenticatedAt: Date.now()
        });
        
        return {
            success: true,
            sessionId,
            organization,
            verifiedDomains,
            hasManagementAccess: !!mgmtToken
        };
        
    } catch (error) {
        throw new Error(`Cloud authentication failed: ${error.message}`);
    }
};

/**
 * Validate cloud session and refresh tokens if needed
 */
export const validateCloudSession = async (sessionId) => {
    const session = sessionManager.get(sessionId);
    if (!session || session.type !== 'CLOUD') {
        return false;
    }
    
    // Check if Graph token needs refresh
    const now = Date.now();
    const bufferTime = AUTH_CONFIG.CLOUD_TOKEN_BUFFER;
    
    if (now >= (session.graphTokenExpiry - bufferTime)) {
        try {
            // Refresh Graph token
            const clientSecret = await getVaultSecret(session.vaultName, session.secretName);
            const newGraphToken = await fetchOAuthToken(
                session.tenantId, 
                session.appId, 
                clientSecret, 
                'https://graph.microsoft.com'
            );
            
            // Update session with new token
            sessionManager.update(sessionId, {
                graphToken: newGraphToken.token,
                graphTokenExpiry: newGraphToken.expiresAt
            });
            
        } catch (error) {
            console.error('[CLOUD-AUTH] Token refresh failed:', error.message);
            return false;
        }
    }
    
    return true;
};

/**
 * Get cloud session data
 */
export const getCloudSession = (sessionId) => {
    const session = sessionManager.get(sessionId);
    if (!session || session.type !== 'CLOUD') {
        return null;
    }
    
    return {
        tenantId: session.tenantId,
        appId: session.appId,
        organization: session.organization,
        graphToken: session.graphToken,
        mgmtToken: session.mgmtToken,
        verifiedDomains: session.verifiedDomains,
        hasManagementAccess: !!session.mgmtToken,
        authenticatedAt: session.authenticatedAt
    };
};

/**
 * Destroy cloud session
 */
export const destroyCloudSession = (sessionId) => {
    return sessionManager.destroy(sessionId);
};

// Export cloud authentication object
export const cloudAuth = {
    test: testCloudConnection,
    validate: validateCloudSession,
    getSession: getCloudSession,
    destroy: destroyCloudSession
};