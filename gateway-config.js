
/**
 * HYPERION GLOBAL CONFIGURATION
 * CENTRALIZED SETTINGS FOR ALL MODULES
 * (ESM VERSION)
 */

// Development mode - simplified security for local use
// Development mode - simplified security for local use
export const GATEWAY_SECRET = process.env.HYPERION_SECRET;
if (!GATEWAY_SECRET) {
    console.error("❌ FATAL: HYPERION_SECRET not found in environment variables.");
    process.exit(1);
}

export const LDAP_PAGE_SIZE = 1000;
export const QUERY_TIMEOUT_MS = 30000;
export const ENGINE_VERSION = "2.7.1-SECURITY-HARDENED";
