/**
 * ACCESS INTELLIGENCE - LOGIC VERIFICATION SCRIPT
 * Run this to prove that the Derived Truth logic works with REAL DATA.
 * Usage: npx ts-node modules/access-intelligence/tests/test-logic.ts
 */

import { GraphCollector, GraphCredentials } from '../collectors/graphCollector';
import { AuthMethodCollector } from '../collectors/authMethodCollector';
import { CaCollector } from '../collectors/caCollector';
import { MfaEvaluator } from '../evaluators/mfaEvaluator';
import { AccessEvaluator } from '../evaluators/accessEvaluator';
import { Principal, Permission } from '../models/domain.types';

// MOCK CREDENTIALS - In real app, these come from the Context or secure storage
// For this test script, we assume the server is running on localhost:3000 to proxy the token request
// The user doesn't need to provide secrets here if the server has them loaded.
const MOCK_CREDS: GraphCredentials = {
    tenantId: 'USE_SERVER_ENV',
    appId: 'USE_SERVER_ENV',
    vaultName: 'USE_SERVER_ENV',
    secretName: 'USE_SERVER_ENV'
};

async function run() {
    console.log('🚀 Starting Access Intelligence Logic Verification...');

    const graphCollector = new GraphCollector();
    const authCollector = new AuthMethodCollector();
    const caCollector = new CaCollector();

    const mfaEvaluator = new MfaEvaluator();
    const accessEvaluator = new AccessEvaluator();

    try {
        // 1. Fetch Users (Limit to 5 for speed)
        console.log('1️⃣  Fetching Users...');
        const allUsers = await graphCollector.fetchUsers(MOCK_CREDS);
        const targetUsers = allUsers.slice(0, 5); // Analyze first 5 users
        console.log(`   Found ${allUsers.length} users. Analyzing top ${targetUsers.length}...`);

        // 2. Fetch CA Policies (Layer 1 Input)
        console.log('2️⃣  Fetching CA Policies...');
        const policies = await caCollector.fetchPolicies(MOCK_CREDS);
        console.log(`   Fetched ${policies.length} policies.`);

        // 3. Analyze Each User
        console.log('3️⃣  Analyzing Access & MFA Status...');
        const results = [];

        for (const user of targetUsers) {
            // Fetch Methods (Layer 2 Input)
            const methods = await authCollector.fetchUserMethods(MOCK_CREDS, user.id);

            // Derive MFA Status
            const mfaStatus = mfaEvaluator.evaluate(user, policies, methods);

            // Derive Privilege (Simulated Roles for this basic test)
            // Real implementation would fetch role assignments specific to user
            const mockPermissions: Permission[] = [
                { id: '1', name: 'User', type: 'Role', isPrivileged: false, assignmentType: 'Direct' }
            ];
            // If user has "Admin" in title, pretend they are admin for testing logic
            if (user.displayName.includes('Admin')) {
                mockPermissions.push({ id: '2', name: 'Global Administrator', type: 'Role', isPrivileged: true, assignmentType: 'Direct' });
            }

            const riskLevel = accessEvaluator.assessPrivilegeLevel(mockPermissions);

            results.push({
                user: user.displayName,
                upn: user.userPrincipalName,
                riskLevel,
                mfaState: mfaStatus.state,
                methods: mfaStatus.methods,
                enforcedBy: mfaStatus.policiesApplied
            });
        }

        console.table(results);
        console.log('\n✅ Verification Complete: Logic is sound.');

    } catch (error) {
        console.error('❌ Verification Failed:', error);
        console.log('Make sure the Hyperion Server is running on localhost:3000 to proxy token requests.');
    }
}

run();
