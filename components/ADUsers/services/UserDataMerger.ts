// User Data Merger - Correlates users across multiple sources
// Label: USER-DATA-MERGER

import type { EnhancedUser, UserCollectionResult } from '../types/enhanced.types';

export class UserDataMerger {

    async mergeUserData(
        adUsers: EnhancedUser[],
        entraUsers: EnhancedUser[],
        exchangeUsers: EnhancedUser[]
    ): Promise<EnhancedUser[]> {
        const startTime = Date.now();

        // Create a map to store merged users by correlation key
        const userMap = new Map<string, EnhancedUser>();

        // Step 1: Add all AD users as base (preserve existing functionality)
        console.log(`Merging users: AD=${adUsers.length}, Entra=${entraUsers.length}, Exchange=${exchangeUsers.length}`);

        for (const adUser of adUsers) {
            const correlationKey = this.generateCorrelationKey(adUser);
            userMap.set(correlationKey, { ...adUser });
        }

        // Step 2: Merge Entra ID users
        for (const entraUser of entraUsers) {
            const correlationKey = this.findBestMatch(entraUser, userMap);

            if (correlationKey) {
                // Merge with existing user
                const existingUser = userMap.get(correlationKey)!;
                const mergedUser = this.mergeEntraData(existingUser, entraUser);
                userMap.set(correlationKey, mergedUser);
            } else {
                // Add as new Entra-only user
                const newKey = this.generateCorrelationKey(entraUser);
                userMap.set(newKey, { ...entraUser });
            }
        }

        // Step 3: Merge Exchange users
        for (const exchangeUser of exchangeUsers) {
            const correlationKey = this.findBestMatch(exchangeUser, userMap);

            if (correlationKey) {
                // Merge with existing user
                const existingUser = userMap.get(correlationKey)!;
                const mergedUser = this.mergeExchangeData(existingUser, exchangeUser);
                userMap.set(correlationKey, mergedUser);
            } else {
                // Add as new Exchange-only user
                const newKey = this.generateCorrelationKey(exchangeUser);
                userMap.set(newKey, { ...exchangeUser });
            }
        }

        // Step 4: Finalize all users with calculated intelligence
        const finalUsers = Array.from(userMap.values()).map(user =>
            this.finalizeUser(user)
        );

        const duration = Date.now() - startTime;
        console.log(`User correlation completed in ${Math.round(duration)}ms. Final count: ${finalUsers.length}`);

        return finalUsers;
    }

    private generateCorrelationKey(user: EnhancedUser): string {
        // Primary key: UPN (most reliable)
        if (user.upn && user.upn.includes('@')) {
            return `upn:${user.upn.toLowerCase()}`;
        }

        // Secondary key: Email
        if (user.email && user.email.includes('@')) {
            return `email:${user.email.toLowerCase()}`;
        }

        // Tertiary key: samAccountName (less reliable for cross-source matching)
        if (user.samAccountName) {
            return `sam:${user.samAccountName.toLowerCase()}`;
        }

        // Fallback: Use ID
        return `id:${user.id}`;
    }

    private findBestMatch(user: EnhancedUser, userMap: Map<string, EnhancedUser>): string | null {
        // Try multiple matching strategies in order of reliability

        // 1. Exact UPN match
        if (user.upn && user.upn.includes('@')) {
            const upnKey = `upn:${user.upn.toLowerCase()}`;
            if (userMap.has(upnKey)) {
                return upnKey;
            }
        }

        // 2. Exact email match
        if (user.email && user.email.includes('@')) {
            const emailKey = `email:${user.email.toLowerCase()}`;
            if (userMap.has(emailKey)) {
                return emailKey;
            }
        }

        // 3. Cross-field matching (UPN vs Email)
        if (user.upn && user.upn.includes('@')) {
            const keys = Array.from(userMap.keys());
            for (const key of keys) {
                const existingUser = userMap.get(key)!;
                if (existingUser.email &&
                    existingUser.email.toLowerCase() === user.upn.toLowerCase()) {
                    return key;
                }
            }
        }

        if (user.email && user.email.includes('@')) {
            const keys = Array.from(userMap.keys());
            for (const key of keys) {
                const existingUser = userMap.get(key)!;
                if (existingUser.upn &&
                    existingUser.upn.toLowerCase() === user.email.toLowerCase()) {
                    return key;
                }
            }
        }

        // 4. SAM account name match (within same domain)
        if (user.samAccountName) {
            const samKey = `sam:${user.samAccountName.toLowerCase()}`;
            if (userMap.has(samKey)) {
                return samKey;
            }

            // Cross-field SAM matching
            const keys = Array.from(userMap.keys());
            for (const key of keys) {
                const existingUser = userMap.get(key)!;
                if (existingUser.samAccountName &&
                    existingUser.samAccountName.toLowerCase() === user.samAccountName.toLowerCase()) {
                    return key;
                }
            }
        }

        // 5. Fuzzy matching by name and domain
        return this.findFuzzyMatch(user, userMap);
    }

    private findFuzzyMatch(user: EnhancedUser, userMap: Map<string, EnhancedUser>): string | null {
        const userDomain = this.extractDomain(user.upn || user.email || '');
        if (!userDomain) return null;

        const keys = Array.from(userMap.keys());
        for (const key of keys) {
            const existingUser = userMap.get(key)!;
            const existingDomain = this.extractDomain(existingUser.upn || existingUser.email || '');

            // Same domain and similar name
            if (existingDomain === userDomain &&
                this.namesAreSimilar(user.name, existingUser.name)) {
                return key;
            }
        }

        return null;
    }

    private extractDomain(email: string): string | null {
        const match = email.match(/@(.+)$/);
        return match ? match[1].toLowerCase() : null;
    }

    private namesAreSimilar(name1: string, name2: string): boolean {
        if (!name1 || !name2) return false;

        const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');
        const n1 = normalize(name1);
        const n2 = normalize(name2);

        // Exact match
        if (n1 === n2) return true;

        // One is substring of the other
        if (n1.includes(n2) || n2.includes(n1)) return true;

        // Levenshtein distance for typos
        return this.levenshteinDistance(n1, n2) <= 2;
    }

    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    private mergeEntraData(existingUser: EnhancedUser, entraUser: EnhancedUser): EnhancedUser {
        // Merge risk factors and recommendations without Set spread
        const combinedRiskFactors = existingUser.riskFactors.concat(entraUser.riskFactors);
        const combinedRecommendations = existingUser.recommendations.concat(entraUser.recommendations);

        return {
            ...existingUser,
            // Update source flags
            sources: {
                ...existingUser.sources,
                entra: true
            },
            // Merge Entra-specific data
            entraData: entraUser.entraData,

            // SYNTHESIZE USAGE DATA (Fix for missing activity dates)
            usageData: {
                ...existingUser.usageData,
                lastInteractiveSignIn: entraUser.entraData?.lastSignIn?.toISOString() || existingUser.usageData?.lastInteractiveSignIn,
                // Teams activity might come from future Teams collector
                teamsLastActivity: existingUser.usageData?.teamsLastActivity
            },

            // Update fields if missing in existing user
            email: existingUser.email || entraUser.email,
            department: existingUser.department || entraUser.department,
            // PRESERVE AD LICENSE (Priority: AD > Entra)
            license: existingUser.license,
            // Merge special categories
            isGuest: existingUser.isGuest || entraUser.isGuest,
            isPrivileged: existingUser.isPrivileged || entraUser.isPrivileged,
            // Merge risk factors and recommendations (remove duplicates manually)
            riskFactors: this.removeDuplicates(combinedRiskFactors),
            recommendations: this.removeDuplicates(combinedRecommendations)
        };
    }

    private mergeExchangeData(existingUser: EnhancedUser, exchangeUser: EnhancedUser): EnhancedUser {
        // Merge risk factors and recommendations without Set spread
        const combinedRiskFactors = existingUser.riskFactors.concat(exchangeUser.riskFactors);
        const combinedRecommendations = existingUser.recommendations.concat(exchangeUser.recommendations);

        return {
            ...existingUser,
            // Update source flags
            sources: {
                ...existingUser.sources,
                exchange: true
            },
            // Merge Exchange-specific data
            exchangeData: exchangeUser.exchangeData,

            // SYNTHESIZE USAGE DATA (Fix for missing activity dates)
            usageData: {
                ...existingUser.usageData,
                exchangeLastActivity: exchangeUser.exchangeData?.lastActivity?.toISOString() || existingUser.usageData?.exchangeLastActivity
            },

            // Update fields if missing in existing user
            email: existingUser.email || exchangeUser.email,
            department: existingUser.department || exchangeUser.department,
            // PRESERVE AD LICENSE
            license: existingUser.license,
            // Merge special categories
            isServiceAccount: existingUser.isServiceAccount || exchangeUser.isServiceAccount,
            // Merge risk factors and recommendations (remove duplicates manually)
            riskFactors: this.removeDuplicates(combinedRiskFactors),
            recommendations: this.removeDuplicates(combinedRecommendations)
        };
    }

    private removeDuplicates(array: string[]): string[] {
        const unique: string[] = [];
        for (const item of array) {
            if (!unique.includes(item)) {
                unique.push(item);
            }
        }
        return unique;
    }

    private finalizeUser(user: EnhancedUser): EnhancedUser {
        return {
            ...user,
            // Recalculate health status based on all available data
            healthStatus: this.calculateFinalHealthStatus(user),
            // Update special categories based on merged data
            isPrivileged: this.calculateFinalPrivilegedStatus(user),
            isServiceAccount: this.calculateFinalServiceAccountStatus(user),
            // Generate final recommendations
            recommendations: this.generateFinalRecommendations(user)
        };
    }

    private calculateFinalHealthStatus(user: EnhancedUser): 'Active' | 'Warning' | 'Stale' | 'Disabled' {
        // If disabled in any source, mark as disabled
        if (user.status === 'Disabled' ||
            (user.entraData && !user.entraData.accountEnabled)) {
            return 'Disabled';
        }

        // Check for stale activity across all sources
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        let hasRecentActivity = false;

        // Check AD last login
        if (user.lastLogin && user.lastLogin !== 'Never') {
            try {
                const lastLogin = new Date(user.lastLogin);
                if (lastLogin > ninetyDaysAgo) {
                    hasRecentActivity = true;
                }
            } catch (error) {
                // Invalid date
            }
        }

        // Check Entra ID last sign-in
        if (user.entraData?.lastSignIn && user.entraData.lastSignIn > ninetyDaysAgo) {
            hasRecentActivity = true;
        }

        // Check Exchange activity
        if (user.exchangeData?.lastActivity && user.exchangeData.lastActivity > ninetyDaysAgo) {
            hasRecentActivity = true;
        }

        if (!hasRecentActivity) {
            return 'Stale';
        }

        // Check for warnings
        if (user.riskFactors.length > 0 ||
            (user.entraData?.riskLevel && user.entraData.riskLevel !== 'Low')) {
            return 'Warning';
        }

        return 'Active';
    }

    private calculateFinalPrivilegedStatus(user: EnhancedUser): boolean {
        // User is privileged if marked as privileged in any source
        if (user.isPrivileged) return true;

        // Check Entra ID admin roles
        if (user.entraData?.adminRoles && user.entraData.adminRoles.length > 0) {
            return true;
        }

        return false;
    }

    private calculateFinalServiceAccountStatus(user: EnhancedUser): boolean {
        // User is service account if marked in any source
        if (user.isServiceAccount) return true;

        // Additional logic based on merged data
        const hasNeverLoggedIn = user.lastLogin === 'Never' &&
            !user.entraData?.lastSignIn;

        const hasServiceNaming = [user.name, user.samAccountName, user.email]
            .some(field => field?.toLowerCase().includes('service') ||
                field?.toLowerCase().includes('svc'));

        return hasNeverLoggedIn && hasServiceNaming;
    }

    private generateFinalRecommendations(user: EnhancedUser): string[] {
        const recommendations = [...user.recommendations];

        // Multi-source specific recommendations
        const sourceCount = Object.values(user.sources).filter(Boolean).length;

        if (sourceCount === 1) {
            if (user.sources.ad && !user.sources.entra) {
                recommendations.push('Consider syncing to Entra ID for cloud access');
            }
            if (user.sources.entra && !user.sources.exchange) {
                recommendations.push('Consider assigning Exchange Online license');
            }
        }

        if (sourceCount > 1) {
            // Check for inconsistencies
            if (user.sources.ad && user.sources.entra) {
                if (user.status === 'Active' && user.entraData && !user.entraData.accountEnabled) {
                    recommendations.push('Resolve account status inconsistency between AD and Entra ID');
                }
            }
        }

        // Remove duplicates and return
        return this.removeDuplicates(recommendations);
    }

    // Generate correlation statistics for reporting
    generateCorrelationStats(
        adUsers: EnhancedUser[],
        entraUsers: EnhancedUser[],
        exchangeUsers: EnhancedUser[],
        mergedUsers: EnhancedUser[]
    ) {
        const stats = {
            totalUsers: mergedUsers.length,
            adOnly: 0,
            entraOnly: 0,
            exchangeOnly: 0,
            allSources: 0,
            partialSources: 0
        };

        for (const user of mergedUsers) {
            const sourceCount = Object.values(user.sources).filter(Boolean).length;

            if (sourceCount === 1) {
                if (user.sources.ad) stats.adOnly++;
                else if (user.sources.entra) stats.entraOnly++;
                else if (user.sources.exchange) stats.exchangeOnly++;
            } else if (sourceCount === 3) {
                stats.allSources++;
            } else {
                stats.partialSources++;
            }
        }

        return stats;
    }
}