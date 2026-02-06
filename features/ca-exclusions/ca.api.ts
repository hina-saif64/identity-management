/**
 * CA Exclusion Inspector - API Client
 * Uses existing Universal Auth credentials
 */

import { CaCredentials, CaPoliciesResponse, ExcludedUsersResponse } from './ca.types';

const GATEWAY_SECRET = import.meta.env.VITE_API_KEY || 'dev-gateway-key-change-in-production';

export interface SignInsResponse {
    status: 'success' | 'error';
    signIns: Record<string, {
        lastSignIn: {
            country: string | null;
            city: string | null;
            ipAddress: string | null;
            timestamp: string | null;
        };
        geoRisk: 'GREEN' | 'ORANGE' | 'GRAY';
    }>;
    count: number;
    error?: string;
}

class CaApiService {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
    }

    /**
     * Fetch all CA policies
     */
    async getPolicies(credentials: CaCredentials): Promise<CaPoliciesResponse> {
        const res = await fetch(`${this.baseUrl}/api/ca/policies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify(credentials)
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Fetch excluded users for a specific policy (fast - no sign-in data)
     */
    async getExcludedUsers(credentials: CaCredentials, policyId: string): Promise<ExcludedUsersResponse> {
        const res = await fetch(`${this.baseUrl}/api/ca/policies/${policyId}/excluded-users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify(credentials)
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Fetch sign-in data for user IDs (progressive loading - called after users displayed)
     */
    async getSignIns(credentials: CaCredentials, userIds: string[]): Promise<SignInsResponse> {
        const res = await fetch(`${this.baseUrl}/api/ca/sign-ins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify({ ...credentials, userIds })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Remove users from policy exclusion list (WRITE ACTION)
     */
    async removeExclusions(credentials: CaCredentials, policyId: string, userIds: string[]): Promise<{ status: string; removedCount?: number; remainingExcluded?: number; error?: string }> {
        const res = await fetch(`${this.baseUrl}/api/ca/policies/${policyId}/remove-exclusions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify({ ...credentials, userIds })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }
}

export const caApi = new CaApiService();
export default caApi;
