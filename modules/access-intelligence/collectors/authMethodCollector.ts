/**
 * ACCESS INTELLIGENCE - AUTH METHOD COLLECTOR
 * Fetches Registered Authentication Methods for users.
 * Used to determine MFA Readiness (Layer 2 of Logic).
 */

import { GraphCredentials } from './graphCollector';

export class AuthMethodCollector {
    private baseUrl = 'https://graph.microsoft.com/v1.0';

    private async getAccessToken(creds: GraphCredentials): Promise<string> {
        // Reusing the token logic (in a real app, this would be a shared service)
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
     * Fetches all registered auth methods for a specific user.
     * Includes: Authenticator App, Phone, FIDO2, Windows Hello, etc.
     */
    async fetchUserMethods(creds: GraphCredentials, userId: string): Promise<string[]> {
        const token = await this.getAccessToken(creds);
        try {
            const response = await fetch(`${this.baseUrl}/users/${userId}/authentication/methods`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    console.warn(`[Permission Denied] Cannot read MFA methods for ${userId}. Ensure 'UserAuthenticationMethod.Read.All' is granted.`);
                } else {
                    console.error(`Failed to fetch methods for ${userId}: ${response.statusText}`);
                }
                return [];
            }

            const data = await response.json();

            // Map the complex objects to simple readable strings
            // e.g. "microsoftAuthenticator", "mobilePhone", "fido2"
            return data.value.map((m: any) => m['@odata.type'].replace('#microsoft.graph.', ''));
        } catch (error) {
            console.error(`Error fetching methods for ${userId}`, error);
            return [];
        }
    }
}
