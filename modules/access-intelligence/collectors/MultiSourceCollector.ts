import { EnhancedUser, UserCollectionResult } from '../models/enhancedUser.js';
import { IUserCollector, TTLCache } from './baseCollector.js';
import { ADUserCollector } from './ADUserCollector.js';
import { EntraUserCollector } from './EntraUserCollector.js';
import { ExchangeUserCollector } from './ExchangeUserCollector.js';
import { UserDataMerger } from '../logic/UserDataMerger.js';

export class MultiSourceCollector {
    private adCollector: ADUserCollector;
    private entraCollector: EntraUserCollector;
    private exchangeCollector: ExchangeUserCollector;
    private merger: UserDataMerger;
    private cache: TTLCache<UserCollectionResult>;

    constructor() {
        this.adCollector = new ADUserCollector();
        this.entraCollector = new EntraUserCollector();
        this.exchangeCollector = new ExchangeUserCollector();
        this.merger = new UserDataMerger();
        this.cache = new TTLCache(15 * 60 * 1000); // 15 minutes TTL
    }

    async collectUsers(credentials: { ad: any, entra: any, exchange: any }): Promise<UserCollectionResult> {
        const cacheKey = this.generateCacheKey(credentials);
        const cached = this.cache.get(cacheKey);

        if (cached) {
            // Update performance metric for cache hit (optional)
            cached.performance.cacheHits++;
            return cached;
        }

        const startTime = performance.now();

        // Parallel collection from all sources
        // We use allSettled to allow some to fail without breaking the whole
        const [adResult, entraResult, exchangeResult] = await Promise.allSettled([
            this.adCollector.fetchUsers(credentials.ad),
            this.entraCollector.fetchUsers(credentials.entra),
            this.exchangeCollector.fetchUsers(credentials.exchange)
        ]);

        // Process results with graceful degradation
        const sources = {
            ad: this.processResult(adResult, 'Active Directory'),
            entra: this.processResult(entraResult, 'Entra ID'),
            exchange: this.processResult(exchangeResult, 'Exchange Online')
        };

        const adUsers = sources.ad.success && adResult.status === 'fulfilled' ? adResult.value : [];
        const entraUsers = sources.entra.success && entraResult.status === 'fulfilled' ? entraResult.value : [];
        const exchangeUsers = sources.exchange.success && exchangeResult.status === 'fulfilled' ? exchangeResult.value : [];

        // Merge and correlate user data
        const mergedUsers = await this.merger.mergeUserData(
            adUsers,
            entraUsers,
            exchangeUsers
        );

        const result: UserCollectionResult = {
            users: mergedUsers,
            sources,
            correlationStats: this.calculateCorrelationStats(mergedUsers),
            performance: {
                totalDuration: performance.now() - startTime,
                cacheHits: 0,
                apiCalls: Object.values(sources).filter(s => s.success).length
            }
        };

        this.cache.set(cacheKey, result);
        return result;
    }

    private processResult(result: PromiseSettledResult<any>, sourceName: string) {
        if (result.status === 'fulfilled') {
            return {
                success: true,
                count: Array.isArray(result.value) ? result.value.length : 0,
                duration: 0 // We don't track per-call duration in this simplified version
            };
        } else {
            console.warn(`${sourceName} collection failed:`, result.reason);
            return {
                success: false,
                count: 0,
                duration: 0,
                error: result.reason?.message || 'Unknown error'
            };
        }
    }

    private calculateCorrelationStats(users: EnhancedUser[]) {
        let adOnly = 0;
        let entraOnly = 0;
        let exchangeOnly = 0;
        let allSources = 0;
        let partialSources = 0;

        for (const user of users) {
            const s = user.sources;
            if (s.ad && !s.entra && !s.exchange) adOnly++;
            else if (!s.ad && s.entra && !s.exchange) entraOnly++;
            else if (!s.ad && !s.entra && s.exchange) exchangeOnly++;
            else if (s.ad && s.entra && s.exchange) allSources++;
            else partialSources++;
        }

        return {
            totalUsers: users.length,
            adOnly,
            entraOnly,
            exchangeOnly,
            allSources,
            partialSources
        };
    }

    private generateCacheKey(credentials: any): string {
        // Simple cache key based on session ID and basics
        return JSON.stringify({
            sessionId: credentials.ad?.sessionId,
            tenant: credentials.entra?.tenantId
        });
    }
}
