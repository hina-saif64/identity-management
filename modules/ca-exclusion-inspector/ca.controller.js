/**
 * CA Exclusion Inspector - Controller
 * Request/response handling for CA exclusion endpoints
 */

import { getPolicies, getExcludedUsers, getSignInsForUsers, removeUserExclusions } from './ca.service.js';
import caLogger from './ca.logger.js';

/**
 * GET /api/ca/policies
 * List all CA policies with exclusion counts
 */
export const listPolicies = async (req, res) => {
    try {
        const credentials = req.body;

        // Validate required credentials
        if (!credentials.tenantId || !credentials.appId || !credentials.vaultName || !credentials.secretName) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing credentials',
                detail: 'tenantId, appId, vaultName, and secretName are required'
            });
        }

        caLogger.info('Fetching CA policies for tenant:', credentials.tenantId);

        const result = await getPolicies(credentials);

        res.json({
            status: 'success',
            ...result,
            count: result.policies.length
        });

    } catch (err) {
        caLogger.error('Failed to list CA policies', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to fetch CA policies',
            detail: err.message
        });
    }
};

/**
 * POST /api/ca/policies/:policyId/excluded-users
 * Get excluded users for a specific policy with geo risk data
 */
export const getExcludedUsersForPolicy = async (req, res) => {
    try {
        const { policyId } = req.params;
        const credentials = req.body;

        // Validate required credentials
        if (!credentials.tenantId || !credentials.appId || !credentials.vaultName || !credentials.secretName) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing credentials',
                detail: 'tenantId, appId, vaultName, and secretName are required'
            });
        }

        if (!policyId) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing policy ID',
                detail: 'Policy ID is required'
            });
        }

        caLogger.info(`Fetching excluded users for policy ${policyId}`);

        const result = await getExcludedUsers(credentials, policyId);

        res.json({
            status: 'success',
            ...result,
            count: result.users.length
        });

    } catch (err) {
        caLogger.error('Failed to get excluded users', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to fetch excluded users',
            detail: err.message
        });
    }
};

/**
 * POST /api/ca/sign-ins
 * Get sign-in data for a list of user IDs (progressive loading)
 */
export const getSignInsData = async (req, res) => {
    try {
        const { userIds, ...credentials } = req.body;

        if (!credentials.tenantId || !credentials.appId || !credentials.vaultName || !credentials.secretName) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing credentials'
            });
        }

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                error: 'userIds array is required'
            });
        }

        caLogger.info(`Fetching sign-ins for ${userIds.length} users`);

        const signIns = await getSignInsForUsers(credentials, userIds);

        res.json({
            status: 'success',
            signIns,
            count: Object.keys(signIns).length
        });

    } catch (err) {
        caLogger.error('Failed to get sign-ins', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to fetch sign-ins',
            detail: err.message
        });
    }
};

/**
 * POST /api/ca/policies/:policyId/remove-exclusions
 * Remove users from policy exclusion list
 * WRITE ACTION - Modifies CA policy
 */
export const removeExclusionsFromPolicy = async (req, res) => {
    try {
        const { policyId } = req.params;
        const { userIds, ...credentials } = req.body;

        // Validate credentials
        if (!credentials.tenantId || !credentials.appId || !credentials.vaultName || !credentials.secretName) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing credentials'
            });
        }

        // Validate inputs
        if (!policyId) {
            return res.status(400).json({
                status: 'error',
                error: 'Policy ID is required'
            });
        }

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                error: 'userIds array is required'
            });
        }

        caLogger.info(`WRITE ACTION: Removing ${userIds.length} exclusions from policy ${policyId}`);

        const result = await removeUserExclusions(credentials, policyId, userIds);

        res.json({
            status: 'success',
            ...result
        });

    } catch (err) {
        caLogger.error('Failed to remove exclusions', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to remove exclusions',
            detail: err.message
        });
    }
};

export default {
    listPolicies,
    getExcludedUsersForPolicy,
    getSignInsData,
    removeExclusionsFromPolicy
};

