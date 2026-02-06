/**
 * CA Similarity Engine - Type Definitions
 */

import { CaPolicy } from '../../ca-exclusions/ca.types';

// 🚀 NASA LEVEL: Enhanced normalized feature vector for comprehensive comparison
export interface PolicyVector {
    id: string;
    displayName: string;
    state: string;
    
    // Core Targeting (Who & What)
    users: string[];      // e.g. ["SCOPE:ALL_USERS", "ROLE:admin", "EXCLUDE_USER:john"]
    apps: string[];       // e.g. ["SCOPE:ALL_APPS", "APP:office365", "ACTION:register_security_info"]
    scenarios: string[];  // e.g. ["browser", "mobileAppsAndDesktopClients"]
    
    // Advanced Conditions
    conditions: {
        locations: string[];        // e.g. ["any", "trusted", "named_location_guid"]
        platforms: string[];        // e.g. ["windows", "iOS", "android"]
        risk: string[];            // e.g. ["high", "medium", "low"]
        devices: string[];         // e.g. ["DEVICE:compliant", "FILTER:include", "RULE:device.isManaged"]
        userRisk: string[];        // e.g. ["high", "medium", "low"]
        servicePrincipalRisk: string[]; // e.g. ["high", "medium", "low"]
        insiderRisk: string[];     // e.g. ["elevated", "minor"]
    };
    
    // Policy Actions (What Happens)
    controls: {
        grant: string[];    // e.g. ["OP:AND", "BUILTIN:mfa", "BUILTIN:compliantDevice", "AUTH_STRENGTH:guid"]
        session: string[];  // e.g. ["FREQ:1Hours", "PERSIST:Never", "MCAS:blockDownloads", "CAE:Enabled"]
    };
    
    // 🎯 NASA LEVEL: Exclusion Analysis (Critical for Redundancy Detection)
    exclusions: {
        users: string[];     // Excluded users
        groups: string[];    // Excluded groups  
        roles: string[];     // Excluded roles
        apps: string[];      // Excluded applications
        locations: string[]; // Excluded locations
        platforms: string[]; // Excluded platforms
    };
}

// 🚀 NASA LEVEL: Enhanced detailed score breakdown
export interface JaccardScore {
    total: number;       // 0-100
    breakdown: {
        users: number;      // 0-100
        apps: number;       // 0-100
        controls: number;   // 0-100
        conditions: number; // 0-100
        exclusions: number; // 0-100 🎯 NEW
    };
    explanation: string[]; // Human readable reasons for score
}

// 🚀 NASA LEVEL: Enhanced comparison result with conflict and redundancy analysis
export interface SimilarityResult {
    sourceId: string;
    targetId: string;
    score: JaccardScore;
    isRedundant: boolean;
    isConflict: boolean;
    
    // 🎯 NASA LEVEL: Advanced analysis details
    conflictDetails?: {
        hasConflict: boolean;
        conflictType: string;
        severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        conflicts: ConflictDetail[];
        overallRisk: string;
    };
    
    redundancyDetails?: {
        isRedundant: boolean;
        redundancyType: 'EXACT_DUPLICATE' | 'SUBSET_REDUNDANCY' | 'FUNCTIONAL_REDUNDANCY' | 'EXCLUSION_REDUNDANCY' | '';
        confidence: number; // 0-100
        reasons: string[];
        recommendation: string;
    };
}

// 🎯 NASA LEVEL: Detailed conflict analysis
export interface ConflictDetail {
    type: 'GRANT_LOGIC' | 'MFA_CONFLICT' | 'SESSION_CONFLICT' | 'CONDITION_CONFLICT';
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    overlapPercentage: number;
    affectedUsers?: string[];
    recommendation?: string;
}

// Galaxy Cluster Node
export interface PolicyCluster {
    id: string;
    centerPolicyId: string;
    members: string[]; // Policy IDs
    avgSimilarity: number;
    label: string; // Auto-generated label
}
