/**
 * CA Exclusion Inspector - TypeScript Types
 */

export type GeoRisk = 'GREEN' | 'ORANGE' | 'GRAY';
export type PolicyState = 'Enabled' | 'Disabled' | 'Report-only';

export interface CaPolicy {
    id: string;
    displayName: string;
    state: PolicyState;
    stateRaw: string;
    createdDateTime: string;
    modifiedDateTime: string;
    
    // Legacy fields (keep for compatibility)
    excludedUsersCount: number;
    excludedGroupsCount: number;
    excludedUserIds: string[];
    excludedGroupIds: string[];
    
    // 🚀 REAL POLICY DATA: Complete CA policy structure
    userConditions: {
        includeUsers: string[];
        excludeUsers: string[];
        includeGroups: string[];
        excludeGroups: string[];
        includeRoles: string[];
        excludeRoles: string[];
    };
    
    applicationConditions: {
        includeApplications: string[];
        excludeApplications: string[];
        includeUserActions: string[];
    };
    
    locationConditions: {
        includeLocations: string[];
        excludeLocations: string[];
    };
    
    platformConditions: {
        includePlatforms: string[];
        excludePlatforms: string[];
    };
    
    deviceConditions: {
        includeDevices: string[];
        excludeDevices: string[];
    };
    
    riskLevels: {
        signInRiskLevels: string[];
        userRiskLevels: string[];
        servicePrincipalRiskLevels: string[];
    };
    
    clientAppTypes: string[];
    
    grantControls: {
        operator: string;
        builtInControls: string[];
        customAuthenticationFactors: string[];
        termsOfUse: string[];
    };
    
    sessionControls: {
        signInFrequency: any;
        persistentBrowser: any;
        applicationEnforcedRestrictions: any;
        cloudAppSecurity: any;
    };
}

// 🎯 Complete CA Policy Conditions
export interface CaPolicyConditions {
    users?: {
        includeUsers?: string[];
        excludeUsers?: string[];
        includeGroups?: string[];
        excludeGroups?: string[];
        includeRoles?: string[];
        excludeRoles?: string[];
    };
    applications?: {
        includeApplications?: string[];
        excludeApplications?: string[];
        includeUserActions?: string[];
        includeAuthenticationContextClassReferences?: string[];
    };
    locations?: {
        includeLocations?: string[];
        excludeLocations?: string[];
    };
    platforms?: {
        includePlatforms?: string[];
        excludePlatforms?: string[];
    };
    devices?: {
        includeDevices?: string[];
        excludeDevices?: string[];
        deviceFilter?: {
            mode: string;
            rule: string;
        };
    };
    clientAppTypes?: string[];
    signInRiskLevels?: string[];
    userRiskLevels?: string[];
    servicePrincipalRiskLevels?: string[];
    insiderRiskLevels?: string[];
}

// 🔐 Grant Controls (The Heart of CA Policies)
export interface CaGrantControls {
    operator: 'AND' | 'OR';
    builtInControls?: string[];
    customAuthenticationFactors?: string[];
    termsOfUse?: string[];
    authenticationStrength?: {
        id: string;
        displayName: string;
    };
}

// ⏱️ Session Controls
export interface CaSessionControls {
    applicationEnforcedRestrictions?: {
        isEnabled: boolean;
    };
    cloudAppSecurity?: {
        isEnabled: boolean;
        cloudAppSecurityType: string;
    };
    signInFrequency?: {
        value: number;
        type: 'Days' | 'Hours';
        isEnabled: boolean;
    };
    persistentBrowser?: {
        mode: 'Always' | 'Never';
        isEnabled: boolean;
    };
    continuousAccessEvaluation?: {
        mode: 'Enabled' | 'Disabled' | 'StrictEnforcement';
    };
    disableResilienceDefaults?: boolean;
}

export interface LastSignIn {
    country: string | null;
    countryCode: string | null;
    city: string | null;
    ipAddress: string | null;
    timestamp: string | null;
}

export interface ExcludedUser {
    id: string;
    displayName: string;
    userPrincipalName: string;
    mail: string | null;
    exclusionType: 'Direct' | 'Group-based';
    sourceGroup: string | null;
    lastSignIn: LastSignIn | null;
    geoRisk: GeoRisk;
}

export interface CaPoliciesResponse {
    status: 'success' | 'error';
    policies: CaPolicy[];
    count: number;
    fromCache: boolean;
    error?: string;
    detail?: string;
}

export interface ExcludedUsersResponse {
    status: 'success' | 'error';
    users: ExcludedUser[];
    policy: CaPolicy;
    count: number;
    fromCache: boolean;
    error?: string;
    detail?: string;
}

export interface CaCredentials {
    tenantId: string;
    appId: string;
    vaultName: string;
    secretName: string;
}
