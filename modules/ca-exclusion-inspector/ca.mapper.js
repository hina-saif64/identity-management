/**
 * CA Exclusion Inspector - Data Mapper
 * Normalize Microsoft Graph responses to consistent format
 */

import { GEO_RISK, SAFE_COUNTRIES, POLICY_STATE } from './ca.constants.js';

/**
 * Map CA policy to comprehensive format
 * 🚀 ENHANCED: Extract ALL policy components for real similarity analysis
 */
export const mapPolicy = (policy) => {
    const conditions = policy.conditions || {};
    const users = conditions.users || {};
    const applications = conditions.applications || {};
    const grantControls = policy.grantControls || {};
    const sessionControls = policy.sessionControls || {};

    // Count excluded users and groups
    const excludedUsers = users.excludeUsers || [];
    const excludedGroups = users.excludeGroups || [];

    return {
        // Basic info
        id: policy.id,
        displayName: policy.displayName,
        state: mapPolicyState(policy.state),
        stateRaw: policy.state,
        createdDateTime: policy.createdDateTime,
        modifiedDateTime: policy.modifiedDateTime,
        
        // Legacy exclusion counts (keep for compatibility)
        excludedUsersCount: excludedUsers.length,
        excludedGroupsCount: excludedGroups.length,
        excludedUserIds: excludedUsers,
        excludedGroupIds: excludedGroups,

        // 🚀 REAL POLICY DATA: User/Group Conditions
        userConditions: {
            includeUsers: users.includeUsers || [],
            excludeUsers: users.excludeUsers || [],
            includeGroups: users.includeGroups || [],
            excludeGroups: users.excludeGroups || [],
            includeRoles: users.includeRoles || [],
            excludeRoles: users.excludeRoles || []
        },

        // 🚀 REAL POLICY DATA: Application Conditions
        applicationConditions: {
            includeApplications: applications.includeApplications || [],
            excludeApplications: applications.excludeApplications || [],
            includeUserActions: applications.includeUserActions || []
        },

        // 🚀 REAL POLICY DATA: Other Conditions
        locationConditions: {
            includeLocations: conditions.locations?.includeLocations || [],
            excludeLocations: conditions.locations?.excludeLocations || []
        },
        
        platformConditions: {
            includePlatforms: conditions.platforms?.includePlatforms || [],
            excludePlatforms: conditions.platforms?.excludePlatforms || []
        },

        deviceConditions: {
            includeDevices: conditions.devices?.includeDevices || [],
            excludeDevices: conditions.devices?.excludeDevices || []
        },

        // 🚀 REAL POLICY DATA: Risk Levels
        riskLevels: {
            signInRiskLevels: conditions.signInRiskLevels || [],
            userRiskLevels: conditions.userRiskLevels || [],
            servicePrincipalRiskLevels: conditions.servicePrincipalRiskLevels || []
        },

        // 🚀 REAL POLICY DATA: Client App Types
        clientAppTypes: conditions.clientAppTypes || [],

        // 🚀 REAL POLICY DATA: Grant Controls (THE MOST IMPORTANT!)
        grantControls: {
            operator: grantControls.operator || 'OR',
            builtInControls: grantControls.builtInControls || [],
            customAuthenticationFactors: grantControls.customAuthenticationFactors || [],
            termsOfUse: grantControls.termsOfUse || []
        },

        // 🚀 REAL POLICY DATA: Session Controls
        sessionControls: {
            signInFrequency: sessionControls.signInFrequency || null,
            persistentBrowser: sessionControls.persistentBrowser || null,
            applicationEnforcedRestrictions: sessionControls.applicationEnforcedRestrictions || null,
            cloudAppSecurity: sessionControls.cloudAppSecurity || null
        }
    };
};

/**
 * Map policy state to readable format
 */
export const mapPolicyState = (state) => {
    switch (state) {
        case POLICY_STATE.ENABLED:
            return 'Enabled';
        case POLICY_STATE.DISABLED:
            return 'Disabled';
        case POLICY_STATE.REPORT_ONLY:
            return 'Report-only';
        default:
            return state;
    }
};

/**
 * Map excluded user with sign-in data
 */
export const mapExcludedUser = (user, signInData = null) => {
    const geoData = signInData ? extractGeoData(signInData) : null;

    return {
        id: user.id,
        displayName: user.displayName,
        userPrincipalName: user.userPrincipalName,
        mail: user.mail,
        exclusionType: user.exclusionType || 'Direct', // Direct or Group-based
        sourceGroup: user.sourceGroup || null,

        // Sign-in geo data
        lastSignIn: geoData ? {
            country: geoData.country,
            countryCode: geoData.countryCode,
            city: geoData.city,
            ipAddress: geoData.ipAddress,
            timestamp: geoData.timestamp
        } : null,

        geoRisk: calculateGeoRisk(geoData)
    };
};

/**
 * Extract geo data from sign-in log
 */
const extractGeoData = (signIn) => {
    const location = signIn.location || {};

    return {
        country: location.countryOrRegion || null,
        countryCode: location.countryOrRegion || null, // Graph returns country name, need to map
        city: location.city || null,
        ipAddress: signIn.ipAddress || null,
        timestamp: signIn.createdDateTime || null
    };
};

/**
 * Calculate geo risk based on country
 */
export const calculateGeoRisk = (geoData) => {
    if (!geoData || !geoData.countryCode) {
        return GEO_RISK.GRAY;
    }

    // Check if country code is in safe list
    // Note: Graph returns full country name, so we need to handle both
    const countryUpper = (geoData.countryCode || '').toUpperCase();
    const countryName = (geoData.country || '').toLowerCase();

    // UAE variations
    if (countryUpper === 'AE' || countryName.includes('emirates') || countryName.includes('uae')) {
        return GEO_RISK.GREEN;
    }

    // Saudi Arabia variations
    if (countryUpper === 'SA' || countryName.includes('saudi')) {
        return GEO_RISK.GREEN;
    }

    return GEO_RISK.ORANGE;
};

/**
 * Map multiple policies
 */
export const mapPolicies = (policies) => {
    return policies.map(mapPolicy);
};

export default {
    mapPolicy,
    mapPolicies,
    mapPolicyState,
    mapExcludedUser,
    calculateGeoRisk
};
