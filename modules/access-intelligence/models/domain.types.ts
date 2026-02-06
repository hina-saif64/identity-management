/**
 * ACCESS INTELLIGENCE - DOMAIN MODELS
 * Defines the core vocabulary for the module.
 */

export type PrincipalType = 'User' | 'ServicePrincipal' | 'Group' | 'ManagedIdentity';

export interface Principal {
    id: string;
    displayName: string;
    userPrincipalName?: string; // Only for Users
    appId?: string;            // Only for SPs
    type: PrincipalType;
    riskLevel?: 'High' | 'Medium' | 'Low' | 'None';
    tags?: string[];           // e.g. "Admin", "BreakGlass"
}

export type PermissionType = 'Role' | 'Scope' | 'AppRole';

export interface Permission {
    id: string;
    name: string; // e.g. "Global Administrator" or "Contributor"
    type: PermissionType;
    isPrivileged: boolean;
    assignmentType: 'Direct' | 'Group' | 'PIM';
}

// 🔐 MFA MODELS

export type MfaState =
    | 'ENFORCED_READY'         // CA requires MFA + User has methods
    | 'ENFORCED_NOT_READY'     // CA requires MFA + User has NO methods (High Risk)
    | 'BYPASSED'               // CA Excluded or Legacy Auth allowed
    | 'NOT_REQUIRED'           // No CA policy targets this user
    | 'UNKNOWN';

export interface MfaStatus {
    state: MfaState;
    methods: string[];         // e.g. ["Microsoft Authenticator", "FIDO2"]
    policiesApplied: string[]; // Names of CA policies enforcing MFA
    bypassReason?: string;     // e.g. "Excluded from Policy X"
}

// 🕸️ TOPOLOGY MODELS

export interface AccessTopologyNode {
    id: string;
    label: string;
    type: 'Principal' | 'Role' | 'Resource' | 'Policy';
    data: {
        principal?: Principal;
        permission?: Permission;
        mfaStatus?: MfaStatus;
    };
    style?: any; // For React Flow
}

export interface AccessTopologyEdge {
    id: string;
    source: string;
    target: string;
    label?: string; // e.g. "Assigned"
    animated?: boolean;
    style?: any; // e.g. { stroke: 'red' }
}
