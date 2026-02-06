/**
 * ACCESS INTELLIGENCE - CA COLLECTOR
 * Fetches Conditional Access Policies.
 * Used to determine MFA Enforcement (Layer 1 of Logic).
 */

import { GraphCredentials } from './graphCollector';

export interface CaPolicySummary {
    id: string;
    displayName: string;
    state: 'enabled' | 'disabled' | 'enabledForReportingButNotEnforced';
    grantControls: string[]; // e.g. ["mfa", "block"]
    conditions: any; // Simplified conditions object
}

export class CaCollector {
    private baseUrl = 'https://graph.microsoft.com/v1.0';

    private async getAccessToken(creds: GraphCredentials): Promise<string> {
        const response = await fetch('http://localhost:3001/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hyperion-key': 'dev-gateway-key-change-in-production'
            },
            body: JSON.stringify({
                tenantId: creds.tenantId,
                clientId: creds.appId,
                vaultName: creds.vaultName,
                secretName: creds.secretName,
                scope: 'https://graph.microsoft.com/.default'
            })
        });
        const data = await response.json();
        return data.accessToken;
    }

    /**
     * Fetches all CA policies.
     */
    async fetchPolicies(creds: GraphCredentials): Promise<CaPolicySummary[]> {
        const token = await this.getAccessToken(creds);
        const response = await fetch(`${this.baseUrl}/identity/conditionalAccess/policies`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Fetch policies failed: ${response.statusText}`);

        const data = await response.json();

        return data.value.map((p: any) => ({
            id: p.id,
            displayName: p.displayName,
            state: p.state,
            grantControls: p.grantControls ? p.grantControls.builtInControls : [],
            conditions: p.conditions
        }));
    }
}
