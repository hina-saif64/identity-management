/**
 * CA Exclusion Inspector - Business Logic Service
 * Core logic for fetching and processing CA policy exclusions
 */

import { fetchCaPolicies, fetchUser, fetchUsersBatch, fetchGroupMembers, fetchUserSignIns, fetchSignInsBatch, removeExclusions } from './ca.graph.js';
import { mapPolicy, mapPolicies, mapExcludedUser } from './ca.mapper.js';
import { caCache } from './ca.cache.js';
import caLogger from './ca.logger.js';
import { CACHE_DURATION } from './ca.constants.js';

/**
 * Get all CA policies with exclusion summary
 */
export const getPolicies = async (credentials) => {
    const cacheKey = `policies_${credentials.tenantId}`;

    // Check cache
    const cached = caCache.get(cacheKey);
    if (cached) {
        caLogger.info('Returning cached policies');
        return { policies: cached, fromCache: true };
    }

    // Fetch from Graph
    const rawPolicies = await fetchCaPolicies(credentials);
    const policies = mapPolicies(rawPolicies);

    // Cache results
    caCache.set(cacheKey, policies, CACHE_DURATION.POLICIES);

    return { policies, fromCache: false };
};

/**
 * Get excluded users for a specific policy with geo risk data
 */
export const getExcludedUsers = async (credentials, policyId) => {
    const cacheKey = `excluded_${policyId}`;

    // Check cache
    const cached = caCache.get(cacheKey);
    if (cached) {
        caLogger.info(`Returning cached excluded users for policy ${policyId}`);
        return { users: cached, fromCache: true };
    }

    // Get full policy details
    const rawPolicies = await fetchCaPolicies(credentials);
    const policy = rawPolicies.find(p => p.id === policyId);

    if (!policy) {
        throw new Error(`Policy ${policyId} not found`);
    }

    const conditions = policy.conditions || {};
    const users = conditions.users || {};
    const excludedUserIds = users.excludeUsers || [];
    const excludedGroupIds = users.excludeGroups || [];

    caLogger.info(`Policy ${policy.displayName}: ${excludedUserIds.length} direct users, ${excludedGroupIds.length} groups`);

    // Resolve all excluded users using BATCH operation (much faster)
    const resolvedUsers = [];

    // Batch fetch direct user exclusions
    if (excludedUserIds.length > 0) {
        const users = await fetchUsersBatch(credentials, excludedUserIds);
        for (const user of users) {
            resolvedUsers.push(mapExcludedUser({
                ...user,
                exclusionType: 'Direct'
            }, null)); // Skip sign-in logs for now (too slow)
        }
    }

    // Group-based exclusions (expand to individual users)
    for (const groupId of excludedGroupIds) {
        const members = await fetchGroupMembers(credentials, groupId);

        for (const member of members) {
            // Skip if already in direct exclusions
            if (resolvedUsers.find(u => u.id === member.id)) continue;

            resolvedUsers.push(mapExcludedUser({
                ...member,
                exclusionType: 'Group-based',
                sourceGroup: groupId
            }, null)); // Skip sign-in logs for now
        }
    }

    // NOTE: Sign-in data is fetched separately via getSignInsForUsers() for progressive loading
    // This makes the initial user display much faster

    // Cache results
    caCache.set(cacheKey, resolvedUsers, CACHE_DURATION.EXCLUDED_USERS);

    return {
        users: resolvedUsers,
        policy: mapPolicy(policy),
        fromCache: false
    };
};

/**
 * Get sign-in data for a list of user IDs (called separately for progressive loading)
 */
export const getSignInsForUsers = async (credentials, userIds) => {
    if (!userIds || userIds.length === 0) return {};

    const signInsMap = await fetchSignInsBatch(credentials, userIds);

    // Process geo risk for each user
    const result = {};
    for (const userId of Object.keys(signInsMap)) {
        const signInData = signInsMap[userId];
        if (signInData) {
            const countryLower = (signInData.country || '').toLowerCase();
            let geoRisk = 'ORANGE';

            if (countryLower.includes('emirates') || countryLower.includes('uae') || countryLower === 'ae') {
                geoRisk = 'GREEN';
            } else if (countryLower.includes('saudi') || countryLower === 'sa') {
                geoRisk = 'GREEN';
            }

            result[userId] = {
                lastSignIn: {
                    country: signInData.country,
                    countryCode: signInData.country,
                    city: signInData.city,
                    ipAddress: signInData.ipAddress,
                    timestamp: signInData.timestamp
                },
                geoRisk
            };
        }
    }

    return result;
};

/**
 * Remove users from policy exclusion list
 * WRITE ACTION with cache invalidation
 */
export const removeUserExclusions = async (credentials, policyId, userIds) => {
    if (!policyId) throw new Error('Policy ID is required');
    if (!userIds || userIds.length === 0) throw new Error('User IDs are required');

    caLogger.info(`Removing ${userIds.length} users from policy ${policyId}`);

    // Call Graph API to remove exclusions
    const result = await removeExclusions(credentials, policyId, userIds);

    // Invalidate cache so next fetch shows updated data
    invalidatePolicyCache(policyId);
    caCache.invalidate(`policies_${credentials.tenantId}`);

    return result;
};

/**
 * Invalidate cache for a policy (after write action)
 */
export const invalidatePolicyCache = (policyId) => {
    caCache.invalidate(`excluded_${policyId}`);
    caLogger.info(`Cache invalidated for policy ${policyId}`);
};

export default {
    getPolicies,
    getExcludedUsers,
    getSignInsForUsers,
    removeUserExclusions,
    invalidatePolicyCache
};

