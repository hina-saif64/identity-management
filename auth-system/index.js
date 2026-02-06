/**
 * 🔒 HYPERION AUTHENTICATION SYSTEM - MAIN EXPORT
 * Version: 1.0.0-LOCKED
 * Last Modified: January 2, 2026
 * Status: PRODUCTION READY - DO NOT MODIFY
 */

// Core authentication
export { authCore, authMiddleware, requireSession, rateLimit, authErrorHandler, authHealthCheck } from './auth-core.js';

// Session management
export { sessionManager } from './auth-sessions.js';

// AD authentication
export { adAuth, testADConnection, validateADSession, getADSession, destroyADSession } from './auth-ad.js';

// Cloud authentication
export { cloudAuth, testCloudConnection, validateCloudSession, getCloudSession, destroyCloudSession } from './auth-cloud.js';

// Configuration
export { AUTH_CONFIG, VALIDATION_PATTERNS, AUTH_ERRORS } from './auth-config.js';

// Version info
export const AUTH_SYSTEM_VERSION = '1.0.0-LOCKED';
export const AUTH_SYSTEM_STATUS = 'PRODUCTION-READY';

console.log(`🔒 Hyperion Authentication System v${AUTH_SYSTEM_VERSION} - ${AUTH_SYSTEM_STATUS}`);