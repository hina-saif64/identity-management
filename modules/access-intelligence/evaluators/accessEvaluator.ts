/**
 * ACCESS INTELLIGENCE - ACCESS EVALUATOR
 * Derives privilege levels from roles and permissions.
 * Used for Topology coloring and Risk Scoring.
 */

import { Permission } from '../models/domain.types';

export class AccessEvaluator {

    /**
     * Calculates the highest privilege level from a set of permissions.
     */
    assessPrivilegeLevel(permissions: Permission[]): 'High' | 'Medium' | 'Low' {
        let maxLevel: 'High' | 'Medium' | 'Low' = 'Low';

        for (const perm of permissions) {
            // HIGH PRIVILEGE: Global Admin, Owner, or "All"
            const name = perm.name.toLowerCase();
            if (
                name.includes('global admin') ||
                name.includes('company admin') ||
                name.includes('privilege role admin') ||
                name.includes('owner')
            ) {
                return 'High'; // Return immediately if High is found
            }

            // MEDIUM PRIVILEGE: Specific Admins, Contributors, Write access
            if (
                name.includes('admin') ||
                name.includes('contributor') ||
                name.includes('editor') ||
                name.includes('write')
            ) {
                maxLevel = 'Medium';
            }
        }

        return maxLevel;
    }

    /**
     * Determines if an identity is considered "High Risk" based on privileges.
     */
    isHighRisk(permissions: Permission[]): boolean {
        return this.assessPrivilegeLevel(permissions) === 'High';
    }
}
