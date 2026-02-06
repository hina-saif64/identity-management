/**
 * ACCESS INTELLIGENCE - RISK EVALUATOR
 * Analyzes Resource Groups and assigns risk scores/levels based on heuristics.
 */

import { ResourceGroup } from '../collectors/azureCollector';

export type RiskLevel = 'High' | 'Medium' | 'Low';

export interface RiskFactor {
    code: string;
    description: string;
    severity: 'High' | 'Medium' | 'Low';
}

export interface RiskAnalysisResult {
    score: number; // 0-100
    level: RiskLevel;
    factors: RiskFactor[];
}

export interface AnalyzedIdentity {
    type: string;
    roleType: string;
    assignmentType: 'Direct' | 'Group';
    lastSignIn?: string; // ISO Date
}

export interface ResourceFortressContext {
    owners: AnalyzedIdentity[];
    contributors: AnalyzedIdentity[];
    others: AnalyzedIdentity[];
}

export class RiskEvaluator {

    /**
     * Analyze a single Resource Group Fortress
     */
    public evaluate(context: ResourceFortressContext): RiskAnalysisResult {
        const factors: RiskFactor[] = [];
        let score = 0;

        // 1. excessive Owners (> 3)
        // High Risk: Too many cooks in the kitchen
        if (context.owners.length > 3) {
            factors.push({
                code: 'EXCESSIVE_OWNERS',
                description: `${context.owners.length} Owners detected (Best practice: < 3)`,
                severity: 'High'
            });
            score += 40;
        }

        // 2. External Access (Guest Users)
        // High Risk: Data exfiltration risk form external identities
        const externalOwners = context.owners.filter(i => this.isExternal(i));
        const externalContributors = context.contributors.filter(i => this.isExternal(i));

        if (externalOwners.length > 0) {
            factors.push({
                code: 'EXTERNAL_OWNER',
                description: `${externalOwners.length} Guest User(s) have Owner rights`,
                severity: 'High'
            });
            score += 50;
        } else if (externalContributors.length > 0) {
            factors.push({
                code: 'EXTERNAL_CONTRIBUTOR',
                description: `${externalContributors.length} Guest User(s) have Contributor rights`,
                severity: 'Medium'
            });
            score += 20;
        }

        // 3. Direct Assignments (User assigned directly, not via Group)
        // Medium Risk: Hard to manage lifecycle
        const directOwners = context.owners.filter(i => i.assignmentType === 'Direct' && i.type === 'User');
        if (directOwners.length > 0) {
            factors.push({
                code: 'DIRECT_USER_ASSIGNMENT',
                description: `${directOwners.length} Users assigned directly (Recommendation: Use Groups)`,
                severity: 'Medium'
            });
            score += 15;
        }

        // 4. Dormant Admins (Last Sign In > 30 Days)
        // High Risk: Stale accounts are prime targets for takeover
        const dormantOwners = context.owners.filter(i => this.isDormant(i.lastSignIn));
        if (dormantOwners.length > 0) {
            factors.push({
                code: 'DORMANT_ADMIN',
                description: `${dormantOwners.length} Owners inactive for >30 days`,
                severity: 'High'
            });
            score += 40;
        }

        return {
            score: Math.min(score, 100),
            level: this.getLevel(score),
            factors
        };
    }

    private isExternal(identity: AnalyzedIdentity): boolean {
        // Simple heuristic: If type is 'User' but principal name contains #EXT# or similar, 
        // OR explicit type is 'Guest' (if we had that data)
        // For now, we rely on the caller passing 'Guest' type or checking principalName convention
        return identity.type === 'Guest';
    }

    private isDormant(lastSignIn?: string): boolean {
        if (!lastSignIn) return false; // Can't determine, assume active / unknown
        const last = new Date(lastSignIn).getTime();
        const now = new Date().getTime();
        const diffDays = (now - last) / (1000 * 3600 * 24);
        return diffDays > 30;
    }

    private getLevel(score: number): RiskLevel {
        if (score >= 40) return 'High';
        if (score >= 15) return 'Medium';
        return 'Low';
    }
}
