/**
 * CA Exclusion Inspector - Express Routes
 * Route definitions only - no business logic here
 */

import express from 'express';
import { listPolicies, getExcludedUsersForPolicy, getSignInsData, removeExclusionsFromPolicy } from './ca.controller.js';

const router = express.Router();

/**
 * POST /api/ca/policies
 * List all CA policies with exclusion summary
 */
router.post('/policies', listPolicies);

/**
 * POST /api/ca/policies/:policyId/excluded-users
 * Get excluded users for a specific policy
 */
router.post('/policies/:policyId/excluded-users', getExcludedUsersForPolicy);

/**
 * POST /api/ca/sign-ins
 * Get sign-in data for user IDs (progressive loading)
 */
router.post('/sign-ins', getSignInsData);

/**
 * POST /api/ca/policies/:policyId/remove-exclusions
 * Remove users from policy exclusion list (WRITE ACTION)
 */
router.post('/policies/:policyId/remove-exclusions', removeExclusionsFromPolicy);

export default router;

