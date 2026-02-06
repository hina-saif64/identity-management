/**
 * ACCESS INTELLIGENCE - AZURE COLLECTOR
 * Fetches Azure Resource Manager (ARM) data.
 * READ-ONLY operations on management.azure.com
 */

import { GraphCredentials } from './graphCollector';

export interface AzureSubscription {
    id: string; // /subscriptions/guid
    subscriptionId: string; // guid
    displayName: string;
    state: string;
}

export interface ResourceGroup {
    id: string;
    name: string;
    location: string;
    tags?: Record<string, string>;
}

export interface RoleAssignment {
    id: string;
    name: string;
    properties: {
        roleDefinitionId: string;
        principalId: string;
        principalType: 'User' | 'Group' | 'ServicePrincipal' | 'Unknown';
        scope: string; // /subscriptions/s/resourceGroups/r
    };
}

export interface RoleDefinition {
    id: string;
    name: string; // guid
    properties: {
        roleName: string; // "Contributor"
        description: string;
        type: string;
        permissions: any[];
        assignableScopes: string[];
    };
}

export class AzureCollector {
    private managementUrl = 'https://management.azure.com';
    private apiVersion = '2021-04-01'; // Common version for ARM

    /**
     * Get ARM Token (scope: management.azure.com)
     */
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
                scope: 'https://management.azure.com/.default'
            })
        });

        if (!response.ok) {
            const errorDetail = await response.text();
            throw new Error(`Failed to get ARM token: ${response.statusText} - ${errorDetail}`);
        }

        const data = await response.json();
        return data.accessToken;
    }

    /**
     * 1. Fetch All Subscriptions
     */
    async fetchSubscriptions(creds: GraphCredentials): Promise<AzureSubscription[]> {
        const token = await this.getAccessToken(creds);
        const response = await fetch(`${this.managementUrl}/subscriptions?api-version=2020-01-01`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Fetch subscriptions failed: ${response.statusText}`);
        const data = await response.json();
        return data.value;
    }

    /**
     * 2. Fetch Resource Groups for a Subscription
     */
    async fetchResourceGroups(creds: GraphCredentials, subscriptionId: string): Promise<ResourceGroup[]> {
        const token = await this.getAccessToken(creds);
        // Clean ID if full path is passed
        const subId = subscriptionId.replace('/subscriptions/', '');

        const response = await fetch(`${this.managementUrl}/subscriptions/${subId}/resourceGroups?api-version=2021-04-01`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Fetch RGs failed for ${subId}: ${response.statusText}`);
        const data = await response.json();
        return data.value;
    }

    /**
     * 3. Fetch Role Assignments (Scoped to RG or Subscription)
     * To monitor blast radius, we typically want assignments at the subscription level 
     * which includes inherited permissions for RGs.
     */
    async fetchRoleAssignments(creds: GraphCredentials, subscriptionId: string): Promise<RoleAssignment[]> {
        const token = await this.getAccessToken(creds);
        const subId = subscriptionId.replace('/subscriptions/', '');

        // Fetch recursively throughout the subscription
        const response = await fetch(`${this.managementUrl}/subscriptions/${subId}/providers/Microsoft.Authorization/roleAssignments?api-version=2020-04-01-preview&$filter=atScope()`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Fetch Role Assignments failed: ${response.statusText}`);
        const data = await response.json();
        return data.value;
    }

    /**
     * 4. Fetch Role Definitions (to map IDs to Names like "Owner")
     */
    async fetchRoleDefinitions(creds: GraphCredentials, subscriptionId: string): Promise<RoleDefinition[]> {
        const token = await this.getAccessToken(creds);
        const subId = subscriptionId.replace('/subscriptions/', '');

        const response = await fetch(`${this.managementUrl}/subscriptions/${subId}/providers/Microsoft.Authorization/roleDefinitions?api-version=2018-01-01-preview`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Fetch Role Definitions failed: ${response.statusText}`);
        const data = await response.json();
        return data.value;
    }
}
