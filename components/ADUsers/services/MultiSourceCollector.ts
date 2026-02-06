// Multi-Source Collector - Orchestrates parallel data collection
// Label: MULTI-SOURCE-COLLECTOR

import type {
    MultiSourceCredentials,
    UserCollectionResult,
    EnhancedUser,
    PerformanceMetrics
} from '../types/enhanced.types';
import { ADUserCollector } from './ADUserCollector';
import { EntraUserCollector } from './EntraUserCollector';
import { ExchangeUserCollector } from './ExchangeUserCollector';
import { RetryManager } from './RetryManager';
import { UserDataMerger } from './UserDataMerger';
import { userDataCache } from './TTLCache';
import { MULTI_SOURCE_CONFIG } from '../constants/enhanced.constants';
import { apiService } from '../../../services/apiService';
import { CloudUsageEntry } from '../../../types';

export class MultiSourceCollector {
    private adCollector: ADUserCollector;
    private entraCollector: EntraUserCollector;
    private exchangeCollector: ExchangeUserCollector;
    private merger: UserDataMerger;
    private retryManager: RetryManager;

    constructor() {
        this.adCollector = new ADUserCollector();
        this.entraCollector = new EntraUserCollector();
        this.exchangeCollector = new ExchangeUserCollector();
        this.merger = new UserDataMerger();

        // Initialize retry manager with default config (3 retries, exponential backoff)
        this.retryManager = new RetryManager({
            maxRetries: 3,
            initialDelayMs: 1000,
            shouldRetry: (error) => {
                // Also retry on specific collector errors if needed
                const msg = error?.message?.toLowerCase() || '';
                if (msg.includes('throttled') || msg.includes('sign-in required')) return true;
                return false; // Let default logic handle network/5xx
            }
        });
    }

    async collectUsers(credentials: MultiSourceCredentials): Promise<UserCollectionResult> {
        const startTime = Date.now();

        // Check cache first for complete result persistence
        const cacheKey = this.generateCacheKey(credentials);
        const cachedResult = userDataCache.get(cacheKey);

        if (cachedResult) {
            console.log('Multi-Source Collector: Using cached complete result for persistence');
            return cachedResult as UserCollectionResult;
        }

        console.log('🚀 Starting multi-source user collection...');

        // Parallel collection from all available sources
        const collectionPromises = [];
        const sourceNames = [];

        if (credentials.ad) {
            collectionPromises.push(this.collectFromAD(credentials.ad));
            sourceNames.push('AD');
        }

        if (credentials.entra) {
            collectionPromises.push(this.collectFromEntra(credentials.entra));
            sourceNames.push('Entra');
        }

        if (credentials.exchange) {
            collectionPromises.push(this.collectFromExchange(credentials.exchange));
            sourceNames.push('Exchange');
        }

        console.log(`📡 Collecting from ${sourceNames.length} sources: ${sourceNames.join(', ')}`);

        // Execute all collections in parallel with graceful degradation
        const results = await Promise.allSettled(collectionPromises);

        // Process results with graceful degradation
        const adResult = credentials.ad ? results[sourceNames.indexOf('AD')] : null;
        const entraResult = credentials.entra ? results[sourceNames.indexOf('Entra')] : null;
        const exchangeResult = credentials.exchange ? results[sourceNames.indexOf('Exchange')] : null;

        const sources = {
            ad: this.processCollectionResult(adResult, 'Active Directory'),
            entra: this.processCollectionResult(entraResult, 'Entra ID'),
            exchange: this.processCollectionResult(exchangeResult, 'Exchange Online')
        };

        // Extract user data from successful collections
        const adUsers = adResult?.status === 'fulfilled' ? adResult.value : [];
        const entraUsers = entraResult?.status === 'fulfilled' ? entraResult.value : [];
        const exchangeUsers = exchangeResult?.status === 'fulfilled' ? exchangeResult.value : [];

        console.log(`📊 Collection results: AD=${adUsers.length}, Entra=${entraUsers.length}, Exchange=${exchangeUsers.length}`);

        // Merge and correlate user data
        console.log('🔄 Starting user correlation...');
        const correlationStart = Date.now();

        const mergedUsers = await this.merger.mergeUserData(adUsers, entraUsers, exchangeUsers);

        const correlationDuration = Date.now() - correlationStart;
        console.log(`✅ User correlation completed in ${Math.round(correlationDuration)}ms`);

        // Generate correlation statistics
        const correlationStats = this.merger.generateCorrelationStats(
            adUsers, entraUsers, exchangeUsers, mergedUsers
        );

        // Calculate performance metrics
        const totalDuration = Date.now() - startTime;
        const performanceMetrics = {
            totalDuration,
            cacheHits: 0,
            apiCalls: Object.values(sources).filter(s => s.success).length
        };

        const result: UserCollectionResult = {
            users: mergedUsers,
            sources,
            correlationStats,
            performance: performanceMetrics
        };

        // Cache the complete result for persistence across tabs
        userDataCache.set(cacheKey, result, MULTI_SOURCE_CONFIG.CACHE_TTL);

        console.log(`🎉 Multi-source collection completed in ${Math.round(totalDuration)}ms`);
        console.log(`📈 Final stats: ${mergedUsers.length} users, ${correlationStats.allSources} in all sources`);

        return result;
    }

    private async collectFromAD(credentials: import('../types/enhanced.types').ADCredentials): Promise<EnhancedUser[]> {
        const startTime = Date.now();

        try {
            console.log('🏢 Collecting from Active Directory...');
            const users = await this.retryManager.executeWithRetry(
                () => this.adCollector.fetchUsers(credentials),
                'AD Collection'
            );
            const duration = Date.now() - startTime;
            console.log(`✅ AD collection completed: ${users.length} users in ${Math.round(duration)}ms`);
            return users;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ AD collection failed after ${Math.round(duration)}ms:`, error);
            throw error;
        }
    }

    private async collectFromEntra(credentials: import('../types/enhanced.types').EntraCredentials): Promise<EnhancedUser[]> {
        const startTime = Date.now();

        try {
            console.log('☁️ Collecting from Entra ID...');
            const users = await this.retryManager.executeWithRetry(
                () => this.entraCollector.fetchUsers(credentials),
                'Entra Collection'
            );
            const duration = Date.now() - startTime;
            console.log(`✅ Entra ID collection completed: ${users.length} users in ${Math.round(duration)}ms`);
            return users;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ Entra ID collection failed after ${Math.round(duration)}ms:`, error);
            throw error;
        }
    }

    private async collectFromExchange(credentials: import('../types/enhanced.types').ExchangeCredentials): Promise<EnhancedUser[]> {
        const startTime = Date.now();

        try {
            console.log('📧 Collecting from Exchange Online...');
            const users = await this.retryManager.executeWithRetry(
                () => this.exchangeCollector.fetchUsers(credentials),
                'Exchange Collection'
            );
            const duration = Date.now() - startTime;
            console.log(`✅ Exchange collection completed: ${users.length} users in ${Math.round(duration)}ms`);
            return users;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ Exchange collection failed after ${Math.round(duration)}ms:`, error);
            throw error;
        }
    }

    private processCollectionResult(
        result: PromiseSettledResult<EnhancedUser[]> | null,
        sourceName: string
    ) {
        if (!result) {
            return {
                success: false,
                count: 0,
                duration: 0,
                error: 'Source not configured'
            };
        }

        if (result.status === 'fulfilled') {
            return {
                success: true,
                count: result.value.length,
                duration: 0, // Duration is logged separately
            };
        } else {
            const error = result.reason;
            console.warn(`${sourceName} collection failed:`, error);
            return {
                success: false,
                count: 0,
                duration: 0,
                error: error?.message || 'Unknown error'
            };
        }
    }

    private generateCacheKey(credentials: MultiSourceCredentials): string {
        // Create a cache key based on available credentials (without sensitive data)
        const sources = [];
        if (credentials.ad) sources.push('ad');
        if (credentials.entra) sources.push('entra');
        if (credentials.exchange) sources.push('exchange');

        const timestamp = Math.floor(Date.now() / MULTI_SOURCE_CONFIG.CACHE_TTL);
        return `multi_source_${sources.join('_')}_${timestamp}`;
    }

    // Get health status for all collectors
    async getCollectorHealthStatus() {
        const [adHealth, entraHealth, exchangeHealth] = await Promise.allSettled([
            this.adCollector.getHealthStatus(),
            this.entraCollector.getHealthStatus(),
            this.exchangeCollector.getHealthStatus()
        ]);

        return {
            ad: adHealth.status === 'fulfilled' ? adHealth.value : { isHealthy: false, lastError: 'Health check failed' },
            entra: entraHealth.status === 'fulfilled' ? entraHealth.value : { isHealthy: false, lastError: 'Health check failed' },
            exchange: exchangeHealth.status === 'fulfilled' ? exchangeHealth.value : { isHealthy: false, lastError: 'Health check failed' }
        };
    }

    // Validate all provided credentials
    async validateCredentials(credentials: MultiSourceCredentials): Promise<{
        ad: boolean;
        entra: boolean;
        exchange: boolean;
        overall: boolean;
    }> {
        const validationPromises = [];
        const sources = [];

        if (credentials.ad) {
            validationPromises.push(this.adCollector.validateCredentials(credentials.ad));
            sources.push('ad');
        }

        if (credentials.entra) {
            validationPromises.push(this.entraCollector.validateCredentials(credentials.entra));
            sources.push('entra');
        }

        if (credentials.exchange) {
            validationPromises.push(this.exchangeCollector.validateCredentials(credentials.exchange));
            sources.push('exchange');
        }

        const results = await Promise.allSettled(validationPromises);

        const validation = {
            ad: false,
            entra: false,
            exchange: false,
            overall: false
        };

        sources.forEach((source, index) => {
            const result = results[index];
            validation[source as keyof typeof validation] =
                result.status === 'fulfilled' && result.value;
        });

        // Overall validation passes if at least one source is valid
        validation.overall = Object.values(validation).some(v => v === true);

        return validation;
    }

    // Clear all caches
    clearCache(): void {
        userDataCache.clear();
        console.log('🧹 Multi-source collector cache cleared');
    }

    // Get cache statistics
    getCacheStats() {
        return userDataCache.getStats();
    }

    // Progressive loading method for UI updates
    async collectUsersProgressive(
        credentials: MultiSourceCredentials,
        onProgress?: (phase: string, progress: number, source?: string) => void
    ): Promise<UserCollectionResult> {
        const startTime = Date.now();

        onProgress?.('initializing', 0);

        // Check cache first
        const cacheKey = this.generateCacheKey(credentials);
        const cachedResult = userDataCache.get(cacheKey);

        if (cachedResult) {
            onProgress?.('complete', 100);
            return cachedResult as UserCollectionResult;
        }

        const totalSources = Object.keys(credentials).length;
        let completedSources = 0;

        const updateProgress = (source: string) => {
            completedSources++;
            const progress = Math.round((completedSources / (totalSources + 1)) * 100); // +1 for correlation
            onProgress?.(source, progress, source);
        };

        // Collect from sources with progress updates
        const collectionPromises = [];

        if (credentials.ad) {
            collectionPromises.push(
                this.collectFromAD(credentials.ad).then(result => {
                    updateProgress('loading-ad');
                    return result;
                })
            );
        }

        if (credentials.entra) {
            collectionPromises.push(
                this.collectFromEntra(credentials.entra).then(result => {
                    updateProgress('loading-entra');
                    return result;
                })
            );
        }

        if (credentials.exchange) {
            collectionPromises.push(
                this.collectFromExchange(credentials.exchange).then(result => {
                    updateProgress('loading-exchange');
                    return result;
                })
            );
        }

        const results = await Promise.allSettled(collectionPromises);

        onProgress?.('correlating', 90);

        // Process and merge results
        const result = await this.processAndMergeResults(results, credentials, startTime);

        onProgress?.('complete', 100);

        return result;
    }

    private async processAndMergeResults(
        results: PromiseSettledResult<EnhancedUser[]>[],
        credentials: MultiSourceCredentials,
        startTime: number
    ): Promise<UserCollectionResult> {
        // Extract results
        let resultIndex = 0;
        const adUsers = credentials.ad && results[resultIndex]?.status === 'fulfilled' ? (results[resultIndex++] as PromiseFulfilledResult<EnhancedUser[]>).value : [];
        const entraUsers = credentials.entra && results[resultIndex]?.status === 'fulfilled' ? (results[resultIndex++] as PromiseFulfilledResult<EnhancedUser[]>).value : [];
        const exchangeUsers = credentials.exchange && results[resultIndex]?.status === 'fulfilled' ? (results[resultIndex++] as PromiseFulfilledResult<EnhancedUser[]>).value : [];

        // Process source results
        const sources = {
            ad: this.processCollectionResult(
                credentials.ad ? results[0] : null,
                'Active Directory'
            ),
            entra: this.processCollectionResult(
                credentials.entra ? results[credentials.ad ? 1 : 0] : null,
                'Entra ID'
            ),
            exchange: this.processCollectionResult(
                credentials.exchange ? results[(credentials.ad ? 1 : 0) + (credentials.entra ? 1 : 0)] : null,
                'Exchange Online'
            )
        };

        // Merge users
        const mergedUsers = await this.merger.mergeUserData(adUsers, entraUsers, exchangeUsers);

        // Generate stats
        const correlationStats = this.merger.generateCorrelationStats(
            adUsers, entraUsers, exchangeUsers, mergedUsers
        );

        const totalDuration = Date.now() - startTime;
        const performanceMetrics = {
            totalDuration,
            cacheHits: 0,
            apiCalls: Object.values(sources).filter(s => s.success).length
        };

        const result: UserCollectionResult = {
            users: mergedUsers,
            sources,
            correlationStats,
            performance: performanceMetrics
        };

        // Cache result
        userDataCache.set(this.generateCacheKey(credentials), result, MULTI_SOURCE_CONFIG.CACHE_TTL);

        return result;
    }

    // Active fetch promise to prevent duplicate requests
    private activeFetch: Promise<UserCollectionResult> | null = null;

    // Unified Fetch for Background Persistence
    async collectUnifiedUsers(
        backendUrl: string,
        sessionId: string,
        isConnected: { cloud: boolean; exchange: boolean },
        forceRefresh: boolean = false
    ): Promise<UserCollectionResult> {
        // 1. Return existing promise if already running (Background Persistence)
        if (this.activeFetch && !forceRefresh) {
            console.log('🔄 MultiSourceCollector: Returning active fetch promise (Background Persistence)');
            return this.activeFetch;
        }

        // 2. Check cache
        const cacheKey = `unified_users_${sessionId}`;

        if (!forceRefresh) {
            const cachedResult = userDataCache.get(cacheKey);
            if (cachedResult) {
                console.log('📦 MultiSourceCollector: Returning cached result');
                return cachedResult as UserCollectionResult;
            }
        } else {
            console.log('🔄 MultiSourceCollector: Force refresh requested, bypassing cache');
        }

        console.log('🚀 MultiSourceCollector: Starting fresh unified fetch...');

        // 3. Start new fetch and track it
        this.activeFetch = (async () => {
            try {
                const [unifiedResult, cloudUsageResult] = await Promise.allSettled([
                    apiService.fetchUnifiedUsers(backendUrl, sessionId, null, null),
                    isConnected.cloud ? apiService.fetchCloudUsage(backendUrl) : Promise.resolve(null)
                ]);

                if (unifiedResult.status === 'rejected') throw new Error(unifiedResult.reason as string);
                const data = unifiedResult.value;

                if (data.error) throw new Error(data.detail || data.error);

                // Process Cloud Usage
                let cloudUsageMap = new Map<string, CloudUsageEntry>();
                const cloudResponse = cloudUsageResult.status === 'fulfilled' ? cloudUsageResult.value : null;

                if (cloudResponse && cloudResponse.users && Array.isArray(cloudResponse.users)) {
                    if (cloudResponse.logs && Array.isArray(cloudResponse.logs)) {
                        cloudResponse.logs.forEach((logMsg: string) => {
                            console.log(`[CLOUD] ${logMsg}`);
                        });
                    }
                    cloudResponse.users.forEach((u: any) => {
                        if (u.userPrincipalName) {
                            // Map flattening for the enhanced user model
                            const usageEntry: CloudUsageEntry = {
                                ...u,
                                teamsLastActivityDate: u.teamsLastActivityDate // Explicitly preserve new field
                            };
                            cloudUsageMap.set(u.userPrincipalName.toLowerCase(), usageEntry);
                        }
                    });
                }

                if (data.status === 'success' && data.users) {
                    const enhancedUsers = data.users.map((user: any) => {
                        const usage = user.upn ? cloudUsageMap.get(user.upn.toLowerCase()) : undefined;
                        const upn = (user.userPrincipalName || user.upn || user.email || '').toLowerCase();
                        const isTarget = upn.includes('target') || upn.includes('target.ae');

                        return {
                            ...user,
                            sources: user.sources || { ad: true, entra: false, exchange: false },
                            isGuest: (user.entraData?.userType === 'Guest' || upn.includes('#ext#')) && !isTarget,
                            isTarget: isTarget,
                            isPrivileged: false,
                            isServiceAccount: false,
                            healthStatus: user.status === 'Active' ? 'Active' : 'Disabled',
                            riskFactors: user.riskFactors || [],
                            recommendations: user.recommendations || [],
                            // Ensure AD License is preserved
                            license: user.license,
                            usageData: {
                                licenseType: usage?.licenseType,
                                lastInteractiveSignIn: usage?.lastInteractiveSignIn || (user.entraData?.lastSignIn ? new Date(user.entraData.lastSignIn).toISOString() : undefined),
                                // Fix: Use Exchange Data from server fetch if Cloud Report is missing it
                                exchangeLastActivity: user.exchangeData?.lastActivity ? new Date(user.exchangeData.lastActivity).toISOString() : (usage?.exchangeLastActivityDate || undefined),
                                teamsLastActivity: usage?.teamsLastActivityDate,
                                sharepointLastActivity: usage?.sharePointLastActivityDate
                            }
                        };
                    });

                    // Construct Result
                    const result: UserCollectionResult = {
                        users: enhancedUsers,
                        sources: data.sources || {},
                        correlationStats: {
                            totalUsers: enhancedUsers.length,
                            adOnly: 0, entraOnly: 0, exchangeOnly: 0, allSources: 0, partialSources: 0 // Will be recalculated by consumer or ignored
                        },
                        performance: {
                            totalDuration: data.performance?.totalDuration || 0,
                            cacheHits: 0,
                            apiCalls: 1
                        }
                    };

                    // Cache Result
                    userDataCache.set(cacheKey, result, MULTI_SOURCE_CONFIG.CACHE_TTL);
                    return result;
                } else {
                    throw new Error(data.error || 'Invalid response format');
                }
            } finally {
                // Clear active promise so next call can fetch again
                this.activeFetch = null;
            }
        })();

        return this.activeFetch;
    }
}

// Export Singleton Instance for Background Persistence
export const multiSourceCollector = new MultiSourceCollector();