import { GraphCollector } from '../collectors/graphCollector';
import { ActivityCache, PRIVILEGED_OPERATIONS } from '../models/activityTypes';

export class SmartActivityAnalyzer {
    private cache = new Map<string, ActivityCache>();
    private graphCollector: GraphCollector;

    constructor() {
        this.graphCollector = new GraphCollector();
    }

    /**
     * MAIN METHOD: Analyze user activity for a specific role
     * This is what you'll call from the UI
     */
    async analyzeUserActivity(userId: string, role: string, creds: any): Promise<ActivityCache> {
        const cacheKey = `${userId}-${role}`;
        const cached = this.cache.get(cacheKey);

        // Use cache if less than 1 hour old
        if (cached && this.isCacheValid(cached)) {
            return cached;
        }

        try {
            // Fetch minimal data efficiently
            const analysis = await this.fetchMinimalActivityData(userId, role, creds);

            // Cache for 1 hour
            const cacheEntry: ActivityCache = {
                ...analysis,
                cacheValidUntil: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
            };

            this.cache.set(cacheKey, cacheEntry);
            return cacheEntry;

        } catch (error) {
            console.error(`Activity analysis failed for ${userId}:`, error);

            // Return default "unknown" state
            return {
                userId,
                role,
                lastUpdated: new Date(),
                regularActivity: null,
                privilegedActivity: null,
                privilegedCount: 0,
                cacheValidUntil: new Date(Date.now() + 5 * 60 * 1000) // 5 min cache for errors
            };
        }
    }

    /**
     * BATCH PROCESSING: Analyze multiple users efficiently
     */
    async batchAnalyzeUsers(userRolePairs: { userId: string, role: string }[], creds: any, onProgress?: (progress: number) => void): Promise<Map<string, ActivityCache>> {
        const results = new Map<string, ActivityCache>();
        const total = userRolePairs.length;
        let completed = 0;

        // Process in chunks of 5 to avoid rate limiting
        const chunks = this.chunkArray(userRolePairs, 5);

        for (const chunk of chunks) {
            const chunkPromises = chunk.map(pair =>
                this.analyzeUserActivity(pair.userId, pair.role, creds)
            );

            const chunkResults = await Promise.all(chunkPromises);

            // Store results
            chunk.forEach((pair, index) => {
                const key = `${pair.userId}-${pair.role}`;
                results.set(key, chunkResults[index]);
            });

            completed += chunk.length;

            // Report progress
            if (onProgress) {
                onProgress((completed / total) * 100);
            }

            // Small delay to be nice to the API
            if (chunks.indexOf(chunk) < chunks.length - 1) {
                await this.delay(200);
            }
        }

        return results;
    }

    /**
     * PRIVATE: Fetch only the data we actually need
     */
    private async fetchMinimalActivityData(userId: string, role: string, creds: any): Promise<Omit<ActivityCache, 'cacheValidUntil'>> {
        // Strategy: Get just the LATEST records, not full history
        const [latestSignIn, latestPrivilegedOp, privilegedCount] = await Promise.all([
            this.getLatestSignIn(userId, creds),
            this.getLatestPrivilegedOperation(userId, role, creds),
            this.getPrivilegedOperationCount(userId, role, creds)
        ]);

        return {
            userId,
            role,
            lastUpdated: new Date(),
            regularActivity: latestSignIn,
            privilegedActivity: latestPrivilegedOp,
            privilegedCount: privilegedCount
        };
    }

    /**
     * PRIVATE: Get user's latest sign-in (any sign-in, not just admin)
     */
    private async getLatestSignIn(userId: string, creds: any): Promise<Date | null> {
        try {
            // Use the user's signInActivity property (most efficient)
            const user = await this.graphCollector.fetchUserSignInActivity(creds, userId);
            return user?.signInActivity?.lastSignInDateTime ? new Date(user.signInActivity.lastSignInDateTime) : null;
        } catch (error) {
            console.warn(`Could not get sign-in activity for ${userId}:`, error);
            return null;
        }
    }

    /**
     * PRIVATE: Get user's latest privileged operation for specific role
     */
    private async getLatestPrivilegedOperation(userId: string, role: string, creds: any): Promise<Date | null> {
        try {
            const operations = PRIVILEGED_OPERATIONS[role];
            if (!operations || operations.length === 0) {
                return null;
            }

            // Build filter for Graph API (server-side filtering!)
            const operationFilter = operations.map(op => `Activity eq '${op}'`).join(' or ');
            const filter = `initiatedBy/user/id eq '${userId}' and (${operationFilter})`;

            const auditLogs = await this.graphCollector.fetchAuditLogs(creds, {
                filter: filter,
                top: 1,
                orderBy: 'activityDateTime desc'
            });

            return auditLogs.length > 0 ? new Date(auditLogs[0].activityDateTime) : null;

        } catch (error) {
            console.warn(`Could not get privileged operations for ${userId}:`, error);
            return null;
        }
    }

    /**
     * PRIVATE: Get count of privileged operations in last 90 days
     */
    private async getPrivilegedOperationCount(userId: string, role: string, creds: any): Promise<number> {
        try {
            const operations = PRIVILEGED_OPERATIONS[role];
            if (!operations || operations.length === 0) {
                return 0;
            }

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 90);

            const operationFilter = operations.map(op => `Activity eq '${op}'`).join(' or ');
            const filter = `initiatedBy/user/id eq '${userId}' and activityDateTime ge ${startDate.toISOString()} and (${operationFilter})`;

            const auditLogs = await this.graphCollector.fetchAuditLogs(creds, {
                filter: filter,
                top: 999 // Get count, not full data
            });

            return auditLogs.length;

        } catch (error) {
            console.warn(`Could not count privileged operations for ${userId}:`, error);
            return 0;
        }
    }

    /**
     * UTILITY METHODS
     */
    private isCacheValid(cached: ActivityCache): boolean {
        return new Date() < cached.cacheValidUntil;
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * RISK CALCULATION: Determine if user activity is risky
 */
export const calculateActivityRisk = (cache: ActivityCache): {
    riskLevel: 'Active' | 'Stale-Privileged' | 'Unused' | 'Unknown';
    riskReasons: string[];
} => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const reasons: string[] = [];

    // Case 1: Jose's scenario - Active user but stale privileged access
    if (cache.regularActivity && cache.regularActivity > thirtyDaysAgo) {
        if (!cache.privilegedActivity || cache.privilegedActivity < thirtyDaysAgo) {
            reasons.push(`User active but hasn't used ${cache.role} permissions in 30+ days`);
            return { riskLevel: 'Stale-Privileged', riskReasons: reasons };
        }

        // User is actively using both regular and privileged access
        return { riskLevel: 'Active', riskReasons: ['User actively using privileged permissions'] };
    }

    // Case 2: No recent activity at all
    if (!cache.regularActivity || cache.regularActivity < ninetyDaysAgo) {
        reasons.push(`No sign-in activity in 90+ days`);
        return { riskLevel: 'Unused', riskReasons: reasons };
    }

    // Case 3: Some activity but unclear pattern
    if (!cache.privilegedActivity) {
        reasons.push(`No privileged operations found`);
        return { riskLevel: 'Unknown', riskReasons: reasons };
    }

    // Default: Active
    return { riskLevel: 'Active', riskReasons: ['Regular activity pattern'] };
};
