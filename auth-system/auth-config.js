/**
 * 🔒 HYPERION AUTHENTICATION CONFIGURATION - LOCKED MODULE
 * Version: 1.0.0-LOCKED
 * Last Modified: January 2, 2026
 * Status: PRODUCTION READY - DO NOT MODIFY
 */

// Security configuration
export const AUTH_CONFIG = {
    // Session settings
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    SESSION_CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
    
    // Security settings
    GATEWAY_SECRET: process.env.HYPERION_SECRET || "dev-gateway-key-change-in-production",
    
    // AD/LDAP settings
    AD_CONNECTION_TIMEOUT: 30000, // 30 seconds
    AD_QUERY_TIMEOUT: 60000, // 60 seconds
    
    // Cloud/Graph settings
    CLOUD_TOKEN_BUFFER: 5 * 60 * 1000, // 5 minutes before expiry
    
    // Validation settings
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
};

// Validation patterns
export const VALIDATION_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    DOMAIN: /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/,
    USERNAME: /^[a-zA-Z0-9._-]+$/,
    TENANT_ID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
};

// Error messages
export const AUTH_ERRORS = {
    INVALID_CREDENTIALS: 'Invalid username or password',
    CONNECTION_FAILED: 'Unable to connect to authentication server',
    SESSION_EXPIRED: 'Authentication session has expired',
    INVALID_TOKEN: 'Invalid or expired authentication token',
    PERMISSION_DENIED: 'Insufficient permissions for this operation',
    VALIDATION_FAILED: 'Input validation failed',
    VAULT_ACCESS_DENIED: 'Unable to access Azure Key Vault',
    HANDSHAKE_FAILED: 'Security handshake validation failed'
};