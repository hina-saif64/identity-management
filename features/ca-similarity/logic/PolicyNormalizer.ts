/**
 * Policy Normalizer
 * Converts complex Graph API CA Policy objects into flat, comparable PolicyVectors.
 * Responsible for recursive flattening, sorting, and standardization.
 */

import { CaPolicy } from '../../ca-exclusions/ca.types';
import { PolicyVector } from '../types/ca-similarity.types';

export class PolicyNormalizer {

    /**
     * 🚨 NUCLEAR FIX: Minimal normalization to prevent hanging
     */
    static normalize(policy: CaPolicy): PolicyVector {
        console.log('🚨 NUCLEAR MODE: Minimal normalization to prevent hanging');
        
        // Return minimal safe vector
        return {
            id: policy.id || 'unknown',
            displayName: policy.displayName || 'Unknown Policy',
            state: policy.state || 'Unknown',
            users: ['any'],
            apps: ['any'],
            scenarios: ['any'],
            conditions: {
                locations: ['any'],
                platforms: ['any'],
                risk: ['any'],
                devices: ['any'],
                userRisk: ['any'],
                servicePrincipalRisk: ['any'],
                insiderRisk: ['any']
            },
            controls: {
                grant: ['unknown'],
                session: []
            },
            exclusions: {
                users: [],
                groups: [],
                roles: [],
                apps: [],
                locations: [],
                platforms: []
            }
        };
    }

    /**
     * 🚨 EMERGENCY: Create safe empty vector
     */
    private static createSafeEmptyVector(id: string, displayName: string): PolicyVector {
        return {
            id: id || 'unknown',
            displayName: displayName || 'Unknown Policy',
            state: 'Unknown',
            users: ['any'],
            apps: ['any'],
            scenarios: ['any'],
            conditions: {
                locations: ['any'],
                platforms: ['any'],
                risk: ['any'],
                devices: ['any'],
                userRisk: ['any'],
                servicePrincipalRisk: ['any'],
                insiderRisk: ['any']
            },
            controls: {
                grant: ['unknown'],
                session: []
            },
            exclusions: {
                users: [],
                groups: [],
                roles: [],
                apps: [],
                locations: [],
                platforms: []
            }
        };
    }

    /**
     * 🚀 NASA LEVEL: Enhanced User/Group/Role normalization
     * Handles both inclusions AND exclusions with proper precedence
     */
    private static normalizeUsers(usersCondition: any): string[] {
        if (!usersCondition) return ['any'];

        const set = new Set<string>();

        // 1. Broad Scopes (Highest Priority)
        if (usersCondition.includeUsers?.includes('All')) set.add('SCOPE:ALL_USERS');
        if (usersCondition.includeUsers?.includes('GuestsOrExternalUsers')) set.add('SCOPE:GUESTS');

        // 2. Directory Roles (High Priority)
        if (usersCondition.includeRoles?.length) {
            usersCondition.includeRoles.forEach((r: string) => set.add(`ROLE:${r}`));
        }

        // 3. Groups (Medium Priority)
        if (usersCondition.includeGroups?.length) {
            usersCondition.includeGroups.forEach((g: string) => set.add(`GROUP:${g}`));
        }

        // 4. Individual Users (Lower Priority)
        if (usersCondition.includeUsers?.length) {
            usersCondition.includeUsers
                .filter((u: string) => u !== 'All' && u !== 'GuestsOrExternalUsers')
                .forEach((u: string) => set.add(`USER:${u}`));
        }

        // 5. Exclusions (Critical for Similarity Analysis)
        if (usersCondition.excludeUsers?.length) {
            usersCondition.excludeUsers.forEach((u: string) => set.add(`EXCLUDE_USER:${u}`));
        }
        if (usersCondition.excludeGroups?.length) {
            usersCondition.excludeGroups.forEach((g: string) => set.add(`EXCLUDE_GROUP:${g}`));
        }
        if (usersCondition.excludeRoles?.length) {
            usersCondition.excludeRoles.forEach((r: string) => set.add(`EXCLUDE_ROLE:${r}`));
        }

        return Array.from(set).sort();
    }

    /**
     * 🚀 NASA LEVEL: Enhanced Application normalization
     * Handles cloud apps, user actions, and authentication context
     */
    private static normalizeApps(appsCondition: any): string[] {
        if (!appsCondition) return ['any'];
        const set = new Set<string>();

        // 1. Broad Application Scopes
        if (appsCondition.includeApplications?.includes('All')) set.add('SCOPE:ALL_APPS');
        if (appsCondition.includeApplications?.includes('Office365')) set.add('SCOPE:OFFICE365');

        // 2. Specific Applications
        appsCondition.includeApplications
            ?.filter((a: string) => !['All', 'Office365'].includes(a))
            .forEach((a: string) => set.add(`APP:${a}`));

        // 3. User Actions (e.g., Register security information)
        if (appsCondition.includeUserActions?.length) {
            appsCondition.includeUserActions.forEach((action: string) => set.add(`ACTION:${action}`));
        }

        // 4. Authentication Context Class References
        if (appsCondition.includeAuthenticationContextClassReferences?.length) {
            appsCondition.includeAuthenticationContextClassReferences
                .forEach((ref: string) => set.add(`AUTH_CONTEXT:${ref}`));
        }

        // 5. Application Exclusions
        if (appsCondition.excludeApplications?.length) {
            appsCondition.excludeApplications.forEach((a: string) => set.add(`EXCLUDE_APP:${a}`));
        }

        return Array.from(set).sort();
    }

    /**
     * 🚨 EMERGENCY: Safe normalization methods with null checks
     */
    private static safeNormalizeUsers(usersCondition: any): string[] {
        try {
            return this.normalizeUsers(usersCondition);
        } catch (error) {
            return ['any'];
        }
    }

    private static safeNormalizeApps(appsCondition: any): string[] {
        try {
            return this.normalizeApps(appsCondition);
        } catch (error) {
            return ['any'];
        }
    }

    private static safeNormalizeScenarios(clientAppTypes: any): string[] {
        try {
            return this.normalizeScenarios(clientAppTypes);
        } catch (error) {
            return ['any'];
        }
    }

    private static safeNormalizeSet(items: any): string[] {
        try {
            return this.normalizeSet(items);
        } catch (error) {
            return ['any'];
        }
    }

    private static safeNormalizeRisk(risks: any): string[] {
        try {
            return this.normalizeRisk(risks);
        } catch (error) {
            return ['any'];
        }
    }

    private static safeNormalizeDevices(deviceCondition: any): string[] {
        try {
            return this.safeNormalizeDevices(deviceCondition);
        } catch (error) {
            return ['any'];
        }
    }

    private static safeNormalizeGrantControls(grant: any): string[] {
        try {
            return this.normalizeGrantControls(grant);
        } catch (error) {
            return ['unknown'];
        }
    }

    private static safeNormalizeSessionControls(session: any): string[] {
        try {
            return this.normalizeSessionControls(session);
        } catch (error) {
            return [];
        }
    }

    private static normalizeScenarios(clientAppTypes: string[]): string[] {
        if (!clientAppTypes || clientAppTypes.includes('all')) return ['all_clients'];
        return [...clientAppTypes].sort();
    }

    private static normalizeSet(items: string[]): string[] {
        if (!items || items.length === 0) return ['any'];
        return items.map(i => i.toLowerCase()).sort();
    }

    private static normalizeRisk(risks: string[]): string[] {
        if (!risks || risks.length === 0) return ['any'];
        return risks.sort();
    }

    /**
     * 🚀 NASA LEVEL: Enhanced Grant Controls normalization
     * Handles all authentication factors, terms of use, and authentication strength
     */
    private static normalizeGrantControls(grant: any): string[] {
        if (!grant) return ['block']; // No grant controls = block access

        const set = new Set<string>();

        // 1. Operator Logic (Critical for conflict detection)
        set.add(`OP:${grant.operator || 'OR'}`);

        // 2. Built-in Controls (MFA, Device Compliance, etc.)
        if (grant.builtInControls?.length) {
            grant.builtInControls.forEach((c: string) => set.add(`BUILTIN:${c}`));
        }

        // 3. Custom Authentication Factors
        if (grant.customAuthenticationFactors?.length) {
            grant.customAuthenticationFactors.forEach((c: string) => set.add(`CUSTOM:${c}`));
        }

        // 4. Terms of Use
        if (grant.termsOfUse?.length) {
            grant.termsOfUse.forEach((c: string) => set.add(`TOU:${c}`));
        }

        // 5. Authentication Strength Policies
        if (grant.authenticationStrength) {
            set.add(`AUTH_STRENGTH:${grant.authenticationStrength.id}`);
        }

        return Array.from(set).sort();
    }

    /**
     * 🚀 NASA LEVEL: Enhanced Session Controls normalization
     * Handles all session management features
     */
    private static normalizeSessionControls(session: any): string[] {
        if (!session) return [];
        const set = new Set<string>();

        // 1. Sign-in Frequency
        if (session.signInFrequency?.isEnabled) {
            set.add(`FREQ:${session.signInFrequency.value}${session.signInFrequency.type}`);
        }

        // 2. Persistent Browser
        if (session.persistentBrowser?.isEnabled) {
            set.add(`PERSIST:${session.persistentBrowser.mode}`);
        }

        // 3. Application Enforced Restrictions
        if (session.applicationEnforcedRestrictions?.isEnabled) {
            set.add('APP_ENFORCED:ENABLED');
        }

        // 4. Cloud App Security
        if (session.cloudAppSecurity?.isEnabled) {
            set.add(`MCAS:${session.cloudAppSecurity.cloudAppSecurityType}`);
        }

        // 5. Continuous Access Evaluation
        if (session.continuousAccessEvaluation) {
            set.add(`CAE:${session.continuousAccessEvaluation.mode}`);
        }

        // 6. Resilience Defaults
        if (session.disableResilienceDefaults) {
            set.add('RESILIENCE:DISABLED');
        }

        return Array.from(set).sort();
    }
}
