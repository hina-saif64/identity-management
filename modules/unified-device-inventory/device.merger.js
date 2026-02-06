/**
 * Unified Device Inventory - Device Merger
 * Merges device data from Entra, Intune, and AD
 */

import { deviceLogger } from './device.logger.js';
import {
    calculateHealthStatus,
    calculateSystemPresence,
    detectOsVersion,
    calculateRecommendation,
    calculateDeviceAge,
    getMostRecentDate
} from './device.health.js';

/**
 * Normalize device name for matching
 */
const normalizeDeviceName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim();
};

/**
 * Merge device data from all three sources
 * Key: device name (case-insensitive)
 */
export const mergeDevices = (entraDevices, intuneDevices, adDevices) => {
    deviceLogger.info('Merging devices from all sources...');

    const deviceMap = new Map();

    // Add Entra devices
    for (const device of entraDevices) {
        const key = normalizeDeviceName(device.displayName);
        if (!key) continue;

        deviceMap.set(key, {
            displayName: device.displayName,
            deviceId: device.deviceId,
            entra: device,
            intune: null,
            ad: null
        });
    }

    // Merge Intune devices
    for (const device of intuneDevices) {
        const key = normalizeDeviceName(device.displayName);
        if (!key) continue;

        if (deviceMap.has(key)) {
            deviceMap.get(key).intune = device;
        } else {
            deviceMap.set(key, {
                displayName: device.displayName,
                entra: null,
                intune: device,
                ad: null
            });
        }
    }

    // Merge AD devices
    for (const device of adDevices) {
        const key = normalizeDeviceName(device.displayName);
        if (!key) continue;

        if (deviceMap.has(key)) {
            deviceMap.get(key).ad = device;
        } else {
            deviceMap.set(key, {
                displayName: device.displayName,
                entra: null,
                intune: null,
                ad: device
            });
        }
    }

    deviceLogger.info(`Merged ${deviceMap.size} unique devices`);

    // Process merged devices
    const result = [];

    for (const [key, merged] of deviceMap) {
        const processed = processDevice(merged);
        result.push(processed);
    }

    return result;
};

/**
 * Process a merged device to add calculated fields
 */
const processDevice = (merged) => {
    const { displayName, entra, intune, ad } = merged;

    // Extract raw data from sources
    const entraData = entra || {};
    const intuneData = intune || {};
    const adData = ad || {};

    // Build unified device object
    const device = {
        // Identity
        displayName,
        deviceId: entraData.deviceId || intuneData.id || null,

        // Source data (for UI detail view)
        entra: entra ? true : false,
        intune: intune ? true : false,
        ad: ad ? true : false,

        // Entra fields
        entraId: entraData.id,
        entraTrustType: entraData.trustType,
        entraLastSignIn: entraData.lastSignIn,
        entraRegistered: entraData.registeredDate,
        entraEnabled: entraData.enabled,

        // Intune fields
        intuneId: intuneData.id,
        intuneComplianceState: intuneData.complianceState,
        intuneLastSync: intuneData.lastSync,
        intuneEnrolled: intuneData.enrolledDate,
        intuneUser: intuneData.userPrincipalName || intuneData.userDisplayName,

        // AD fields
        adDistinguishedName: adData.distinguishedName,
        adLastLogon: adData.lastLogon,
        adCreated: adData.createdDate,
        adEnabled: adData.enabled,
        adDescription: adData.description,
        adDnsHostName: adData.dnsHostName,

        // OS Info (prioritize AD, then Entra, then Intune)
        os: adData.os || entraData.os || intuneData.os || 'Unknown',
        osVersion: adData.osVersion || entraData.osVersion || intuneData.osVersion || '',
    };

    // Calculate derived fields
    device.osCategory = detectOsVersion(device.os, device.osVersion);
    device.systemPresence = calculateSystemPresence({ entra, intune, ad });
    device.healthStatus = calculateHealthStatus(device);
    device.recommendation = calculateRecommendation({
        ...device,
        healthStatus: device.healthStatus,
        systemPresence: device.systemPresence
    });
    device.deviceAge = calculateDeviceAge(device);
    device.lastSeen = getMostRecentDate([
        device.adLastLogon,
        device.entraLastSignIn,
        device.intuneLastSync
    ]);

    // Last user (from Intune primarily)
    device.lastUser = intuneData.userPrincipalName || intuneData.userDisplayName || 'N/A';

    return device;
};

/**
 * Calculate summary statistics from merged devices
 */
export const calculateSummary = (devices) => {
    const summary = {
        total: devices.length,
        entra: 0,
        intune: 0,
        ad: 0,
        active: 0,
        warning: 0,
        stale: 0,
        disabled: 0,
        unknown: 0,
        windows10: 0,
        windows11: 0,
        windowsServer: 0,
        otherOs: 0,
        compliance: 0,
        allSystems: 0,
        defenderOnboarded: 0,
        defenderNotOnboarded: 0
    };

    for (const device of devices) {
        // Source counts
        if (device.entra) summary.entra++;
        if (device.intune) summary.intune++;
        if (device.ad) summary.ad++;

        // Health status
        switch (device.healthStatus) {
            case 'Active': summary.active++; break;
            case 'Warning': summary.warning++; break;
            case 'Stale': summary.stale++; break;
            case 'Disabled': summary.disabled++; break;
            default: summary.unknown++; break;
        }

        // OS distribution
        switch (device.osCategory) {
            case 'Windows 10': summary.windows10++; break;
            case 'Windows 11': summary.windows11++; break;
            case 'Windows Server': summary.windowsServer++; break;
            default: summary.otherOs++; break;
        }

        // Defender status
        if (device.defenderStatus === 'Onboarded') {
            summary.defenderOnboarded++;
        } else if (device.defenderStatus === 'Not Onboarded') {
            summary.defenderNotOnboarded++;
        }

        // All systems count (for compliance score)
        if (device.entra && device.intune && device.ad) {
            summary.allSystems++;
        }
    }

    // Compliance score: % of devices in all 3 systems
    summary.compliance = summary.total > 0
        ? Math.round((summary.allSystems / summary.total) * 100)
        : 0;

    return summary;
};

export default {
    mergeDevices,
    calculateSummary
};
