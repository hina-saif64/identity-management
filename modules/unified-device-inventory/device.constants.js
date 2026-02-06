/**
 * Unified Device Inventory - Constants
 * Thresholds, mappings, and configuration
 */

// Health status thresholds (days since last seen)
export const HEALTH_THRESHOLDS = {
    ACTIVE: 30,      // ≤30 days = Active
    WARNING: 90,     // 31-90 days = Warning
    // >90 days = Stale
};

// Health status values
export const HEALTH_STATUS = {
    ACTIVE: 'Active',
    WARNING: 'Warning',
    STALE: 'Stale',
    DISABLED: 'Disabled',
    UNKNOWN: 'Unknown'
};

// System presence categories
export const SYSTEM_PRESENCE = {
    ENTRA_ONLY: 'Entra Only',
    INTUNE_ONLY: 'Intune Only',
    AD_ONLY: 'AD Only',
    ENTRA_AD: 'Entra + AD',
    ENTRA_INTUNE: 'Entra + Intune',
    INTUNE_AD: 'Intune + AD',
    ALL_SYSTEMS: 'All Systems'
};

// OS mapping for Win10/11 detection
export const OS_PATTERNS = {
    WINDOWS_11: ['Windows 11', '10.0.22'],
    WINDOWS_10: ['Windows 10', '10.0.19', '10.0.18', '10.0.17'],
    WINDOWS_SERVER: ['Server']
};

// Graph API endpoints
export const GRAPH_ENDPOINTS = {
    DEVICES: 'https://graph.microsoft.com/v1.0/devices',
    INTUNE_DEVICES: 'https://graph.microsoft.com/v1.0/deviceManagement/managedDevices'
};

// Cache TTL (milliseconds)
export const CACHE_TTL = {
    DEVICES: 15 * 60 * 1000,  // 15 minutes
    SUMMARY: 5 * 60 * 1000    // 5 minutes
};

// Export color codes (for Excel)
export const EXPORT_COLORS = {
    ACTIVE: '#E6FFE6',    // Light Green
    WARNING: '#FFFFC8',   // Light Yellow
    STALE: '#FFDCDC',     // Light Red
    DISABLED: '#DCDCDC'   // Gray
};

// CSV column mappings (from user's Excel)
export const CSV_COLUMN_MAP = {
    TAG: 'Tag',
    STATUS: 'Status',
    ALLOCATED_TO: 'Allocated To',
    DEPARTMENT: 'User Dept',
    SITE: 'Site',
    DESCRIPTION: 'Description',
    SERIAL: 'Serial'
};

// Recommended actions
export const RECOMMENDATIONS = {
    NO_ACTION: 'No Action Needed',
    MONITOR: 'Monitor',
    ENROLL_CLOUD: 'Enroll in Entra & Intune',
    CHECK_AD_SYNC: 'Check AD Sync',
    CHECK_ENTRA_SYNC: 'Check Entra Sync',
    ENROLL_INTUNE: 'Enroll in Intune',
    INVESTIGATE: 'Investigate',
    DISABLE_AD: 'Disable in AD',
    REMOVE_AD: 'Remove from AD',
    RETIRE_CLOUD: 'Retire from Cloud',
    REVIEW_REMOVAL: 'Review for Removal'
};

export default {
    HEALTH_THRESHOLDS,
    HEALTH_STATUS,
    SYSTEM_PRESENCE,
    OS_PATTERNS,
    GRAPH_ENDPOINTS,
    CACHE_TTL,
    EXPORT_COLORS,
    CSV_COLUMN_MAP,
    RECOMMENDATIONS
};
