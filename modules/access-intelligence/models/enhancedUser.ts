/**
 * ENHANCED USER MODELS
 * Defines the data structures for multi-source user intelligence.
 */

export interface EnhancedUser {
    // Identity (primary keys for correlation)
    id: string;                    // Primary identifier (AD DN)
    upn: string;                   // User Principal Name
    samAccountName: string;        // SAM account name

    // Basic Attributes (existing - preserved)
    name: string;
    email: string;
    status: 'Active' | 'Disabled';
    department?: string;
    distinguishedName: string;
    lastLogin?: string;
    lastPasswordSet?: string;
    created?: string;

    // Multi-Source Presence Flags
    sources: {
        ad: boolean;               // Exists in Active Directory
        entra: boolean;            // Exists in Entra ID
        exchange: boolean;         // Has Exchange mailbox
    };

    // Entra ID Enrichment
    entraData?: {
        objectId: string;
        lastSignIn?: Date;
        mfaEnabled: boolean;
        licenseAssignments: string[];
        userType: 'Member' | 'Guest';
        accountEnabled: boolean;
        riskLevel?: 'Low' | 'Medium' | 'High';
        complianceState?: 'Compliant' | 'NonCompliant' | 'Unknown';
        onPremisesSyncEnabled?: boolean;
        creationType?: string;
    };

    // Exchange Online Enrichment
    exchangeData?: {
        mailboxType: 'UserMailbox' | 'SharedMailbox' | 'RoomMailbox';
        mailboxSize?: number;
        lastActivity?: Date;
        forwardingEnabled: boolean;
        archiveEnabled: boolean;
        litigationHoldEnabled: boolean;
    };

    // Calculated Intelligence
    healthStatus: 'Active' | 'Warning' | 'Stale' | 'Disabled';
    riskFactors: string[];
    recommendations: string[];

    // Special Categories
    isGuest: boolean;              // Entra ID guest user
    isTarget: boolean;             // UPN contains "target.ae#EXT#@"
    isPrivileged: boolean;         // Has admin roles
    isServiceAccount: boolean;     // Identified as service account
}

// Multi-Source Collection Result
export interface UserCollectionResult {
    users: EnhancedUser[];
    sources: {
        ad: { success: boolean; count: number; duration: number; error?: string };
        entra: { success: boolean; count: number; duration: number; error?: string };
        exchange: { success: boolean; count: number; duration: number; error?: string };
    };
    correlationStats: {
        totalUsers: number;
        adOnly: number;
        entraOnly: number;
        exchangeOnly: number;
        allSources: number;
        partialSources: number;
    };
    performance: {
        totalDuration: number;
        cacheHits: number;
        apiCalls: number;
    };
}

// Enhanced Dashboard Summary
export interface UserSummary {
    // Existing tiles (preserved)
    total: number;
    enabled: number;
    disabled: number;
    withEmail: number;
    neverChanged: number;
    stalled: number;
    neverLogin: number;
    passwordExpired: number;
    licenseE5: number;
    licenseE3: number;
    licenseE1: number;
    licenseF3: number;
    noMfa: number;

    // New enhanced tiles
    guestUsers: number;            // Entra ID guest users
    targetUsers: number;           // Users with target.ae#EXT#@ pattern
    privilegedUsers: number;       // Users with admin roles
    serviceAccounts: number;       // Identified service accounts
    multiSourceUsers: number;      // Users present in multiple sources
    healthyUsers: number;          // Users with 'Active' health status
    atRiskUsers: number;          // Users with warnings or risks

    // Source distribution
    adOnlyUsers: number;
    entraOnlyUsers: number;
    exchangeOnlyUsers: number;
    allSourcesUsers: number;
}
