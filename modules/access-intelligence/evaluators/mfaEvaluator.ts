/**
 * ACCESS INTELLIGENCE - MFA EVALUATOR
 * The "Brain" that derives MFA status from raw signals.
 * Logic Layers:
 * 1. CA Policy (Enforcement)
 * 2. Auth Methods (Readiness)
 * 3. Scope/Risk (Bypass)
 */

import { MfaStatus, MfaState, Principal } from '../models/domain.types';
import { CaPolicySummary } from '../collectors/caCollector';

export class MfaEvaluator {

    /**
     * Evaluates MFA status for a single user given the context.
     */
    evaluate(
        user: Principal,
        policies: CaPolicySummary[],
        userMethods: string[]
    ): MfaStatus {
        const enforcingPolicies: string[] = [];
        let explicitlyExcluded = false;

        // LAYER 1: CA POLICY ENFORCEMENT
        // We look for ENABLED policies that require MFA and include this user
        for (const policy of policies) {
            if (policy.state !== 'enabled') continue;

            const requiresMfa = policy.grantControls.includes('mfa');
            if (!requiresMfa) continue;

            // Simplified inclusion check (Real logic would parse 'conditions' deeply)
            // For now, we assume if policy is enabled and requires MFA, it's a potential enforcer.
            // In a full implementation, we would check policy.conditions.users.includeUsers vs excludeUsers
            // Here we assume "All Users" or specific assignment logic would happen in the collector query or here.
            // For this phase, if a policy exists and is enabled, we count it.

            // TODO: Implement deep logic for include/exclude arrays
            enforcingPolicies.push(policy.displayName);
        }

        const isEnforced = enforcingPolicies.length > 0;
        const isReady = userMethods.length > 0;

        // LAYER 2: DETERMINE STATE
        let state: MfaState = 'NOT_REQUIRED';

        if (isEnforced) {
            if (isReady) {
                state = 'ENFORCED_READY';
            } else {
                state = 'ENFORCED_NOT_READY'; // 🚨 HIGH RISK
            }
        }

        // LAYER 3: BYPASS / EXCLUSIONS
        // Logic to detect if user is in an exclusion group effectively bypassing the requirement
        if (explicitlyExcluded) {
            state = 'BYPASSED';
        }

        return {
            state,
            methods: userMethods,
            policiesApplied: enforcingPolicies,
            bypassReason: explicitlyExcluded ? 'Excluded from policy' : undefined
        };
    }
}
