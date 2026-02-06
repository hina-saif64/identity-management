/**
 * CA Exclusion Inspector - Constants
 * Isolated module for Conditional Access policy exclusion visibility
 */

// Geo Risk Classification
export const GEO_RISK = {
    GREEN: 'GREEN',   // UAE, KSA
    ORANGE: 'ORANGE', // Other countries
    GRAY: 'GRAY'      // No data
};

// Safe countries (ISO-2 codes)
export const SAFE_COUNTRIES = ['AE', 'SA'];

// Policy states
export const POLICY_STATE = {
    ENABLED: 'enabled',
    DISABLED: 'disabled',
    REPORT_ONLY: 'enabledForReportingButNotEnforced'
};

// Cache durations (ms)
export const CACHE_DURATION = {
    POLICIES: 5 * 60 * 1000,        // 5 minutes
    EXCLUDED_USERS: 5 * 60 * 1000,  // 5 minutes
    SIGN_IN_LOGS: 15 * 60 * 1000    // 15 minutes
};

// Sign-in log window
export const SIGN_IN_HOURS = 48;

// Graph API endpoints
export const GRAPH_ENDPOINTS = {
    CA_POLICIES: '/identity/conditionalAccess/policies',
    SIGN_IN_LOGS: '/auditLogs/signIns',
    USER: '/users'
};
