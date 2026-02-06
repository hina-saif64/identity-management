/**
 * Unified Device Inventory - Health Status Calculator
 * Calculates device health based on last activity and state
 */

import { HEALTH_THRESHOLDS, HEALTH_STATUS, SYSTEM_PRESENCE, OS_PATTERNS, RECOMMENDATIONS } from './device.constants.js';

/**
 * Calculate days since a given date
 */
export const daysSince = (dateString) => {
    if (!dateString) return 999;
    try {
        const date = new Date(dateString);
        const now = new Date();
        return Math.floor((now - date) / (1000 * 60 * 60 * 24));
    } catch {
        return 999;
    }
};

/**
 * Get most recent date from multiple sources
 */
export const getMostRecentDate = (dates) => {
    const validDates = dates.filter(d => d && d !== 'N/A');
    if (validDates.length === 0) return null;

    return validDates
        .map(d => new Date(d))
        .sort((a, b) => b - a)[0]
        .toISOString();
};

/**
 * Calculate health status based on last activity
 */
export const calculateHealthStatus = (device) => {
    // If disabled in AD, status is Disabled
    if (device.adEnabled === false) {
        return HEALTH_STATUS.DISABLED;
    }

    // Get most recent activity date
    const lastSeen = getMostRecentDate([
        device.adLastLogon,
        device.entraLastSignIn,
        device.intuneLastSync
    ]);

    if (!lastSeen) {
        return HEALTH_STATUS.UNKNOWN;
    }

    const days = daysSince(lastSeen);

    if (days <= HEALTH_THRESHOLDS.ACTIVE) {
        return HEALTH_STATUS.ACTIVE;
    } else if (days <= HEALTH_THRESHOLDS.WARNING) {
        return HEALTH_STATUS.WARNING;
    } else {
        return HEALTH_STATUS.STALE;
    }
};

/**
 * Determine system presence category
 */
export const calculateSystemPresence = (device) => {
    const inEntra = !!device.entra;
    const inIntune = !!device.intune;
    const inAd = !!device.ad;

    if (inEntra && inIntune && inAd) return SYSTEM_PRESENCE.ALL_SYSTEMS;
    if (inEntra && inIntune && !inAd) return SYSTEM_PRESENCE.ENTRA_INTUNE;
    if (inEntra && inAd && !inIntune) return SYSTEM_PRESENCE.ENTRA_AD;
    if (inIntune && inAd && !inEntra) return SYSTEM_PRESENCE.INTUNE_AD;
    if (inEntra && !inIntune && !inAd) return SYSTEM_PRESENCE.ENTRA_ONLY;
    if (inIntune && !inEntra && !inAd) return SYSTEM_PRESENCE.INTUNE_ONLY;
    if (inAd && !inEntra && !inIntune) return SYSTEM_PRESENCE.AD_ONLY;

    return 'Unknown';
};

/**
 * Detect Windows version (10 vs 11)
 */
export const detectOsVersion = (os, osVersion) => {
    if (!os && !osVersion) return 'Unknown';

    const combined = `${os || ''} ${osVersion || ''}`;

    // Windows 11 detection
    for (const pattern of OS_PATTERNS.WINDOWS_11) {
        if (combined.includes(pattern)) return 'Windows 11';
    }

    // Windows Server detection
    for (const pattern of OS_PATTERNS.WINDOWS_SERVER) {
        if (combined.includes(pattern)) return 'Windows Server';
    }

    // Windows 10 detection
    for (const pattern of OS_PATTERNS.WINDOWS_10) {
        if (combined.includes(pattern)) return 'Windows 10';
    }

    return 'Other Windows';
};

/**
 * Calculate recommended action based on device state
 */
export const calculateRecommendation = (device) => {
    const { healthStatus, systemPresence, adEnabled } = device;

    // Disabled devices
    if (adEnabled === false) {
        if (device.entra || device.intune) {
            return RECOMMENDATIONS.RETIRE_CLOUD;
        }
        return RECOMMENDATIONS.REVIEW_REMOVAL;
    }

    // Stale devices
    if (healthStatus === HEALTH_STATUS.STALE) {
        if (device.ad && !device.entra && !device.intune) {
            return RECOMMENDATIONS.REMOVE_AD;
        }
        if (device.ad) {
            return RECOMMENDATIONS.DISABLE_AD;
        }
        return RECOMMENDATIONS.INVESTIGATE;
    }

    // System presence issues
    switch (systemPresence) {
        case SYSTEM_PRESENCE.AD_ONLY:
            if (healthStatus === HEALTH_STATUS.ACTIVE || healthStatus === HEALTH_STATUS.WARNING) {
                return RECOMMENDATIONS.ENROLL_CLOUD;
            }
            return RECOMMENDATIONS.INVESTIGATE;

        case SYSTEM_PRESENCE.ENTRA_ONLY:
            return RECOMMENDATIONS.INVESTIGATE;

        case SYSTEM_PRESENCE.INTUNE_ONLY:
            return RECOMMENDATIONS.INVESTIGATE;

        case SYSTEM_PRESENCE.ENTRA_AD:
            if (healthStatus === HEALTH_STATUS.ACTIVE) {
                return RECOMMENDATIONS.ENROLL_INTUNE;
            }
            return RECOMMENDATIONS.MONITOR;

        case SYSTEM_PRESENCE.ENTRA_INTUNE:
            return RECOMMENDATIONS.CHECK_AD_SYNC;

        case SYSTEM_PRESENCE.INTUNE_AD:
            return RECOMMENDATIONS.CHECK_ENTRA_SYNC;

        case SYSTEM_PRESENCE.ALL_SYSTEMS:
            if (healthStatus === HEALTH_STATUS.ACTIVE) {
                return RECOMMENDATIONS.NO_ACTION;
            }
            return RECOMMENDATIONS.MONITOR;

        default:
            return RECOMMENDATIONS.MONITOR;
    }
};

/**
 * Calculate device age in days
 */
export const calculateDeviceAge = (device) => {
    const createdDate = device.adCreated || device.entraRegistered || device.intuneEnrolled;
    if (!createdDate) return null;

    return daysSince(createdDate);
};

export default {
    daysSince,
    getMostRecentDate,
    calculateHealthStatus,
    calculateSystemPresence,
    detectOsVersion,
    calculateRecommendation,
    calculateDeviceAge
};
