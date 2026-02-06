// Entra ID User Collector
// Label: ENTRA-USER-COLLECTOR

import { BaseCollector } from './BaseCollector';
import type { EntraCredentials, EnhancedUser } from '../types/enhanced.types';
import { userDataCache } from './TTLCache';

interface EntraUser {
    id: string;
    userPrincipalName: string;
    displayName: string;
    mail: string;
    userType: 'Member' | 'Guest';
    accountEnabled: boolean;
    signInActivity?: {
        lastSignInDateTime?: string;
        lastNonInteractiveSignInDateTime?: string;
    };
    assignedLicenses: Array<{
        skuId: string;
        servicePlans: Array<{
            servicePlanId: string;
            servicePlanName: string;
        }>;
    }>;
    memberOf?: Array<{
        id: string;
        displayName: string;
        '@odata.type': string;
    }>;
    appRoleAssignments?: Array<{
        id: string;
        appRoleId: string;
        principalDisplayName: string;
        resourceDisplayName: string;
    }>;
    createdDateTime: string;
    department?: string;
    jobTitle?: string;
    companyName?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    riskState?: 'atRisk' | 'confirmedSafe' | 'remediated' | 'dismissed';
}

export class EntraUserCollector extends BaseCollector<EntraCredentials, EnhancedUser> {

    getSourceName(): string {
        return 'Entra ID';
    }

    async validateCredentials(credentials: EntraCredentials): Promise<boolean> {
        if (credentials.accessToken) {
            return this.validateCommonCredentials(credentials, ['tenantId', 'accessToken']);
        }

        if (credentials.certificateThumbprint) {
            return this.validateCommonCredentials(credentials, ['tenantId', 'clientId', 'certificateThumbprint']);
        }

        return this.validateCommonCredentials(credentials, ['tenantId', 'clientId', 'clientSecret']);
    }

    async fetchUsers(credentials: EntraCredentials): Promise<EnhancedUser[]> {
        try {
            return await this.executeWithRetry(async () => {
                const startTime = performance.now();

                // Check cache first for data persistence
                const cacheKey = this.generateCacheKey(credentials, 'entra_users');
                const cachedUsers = userDataCache.get(cacheKey);

                if (cachedUsers) {
                    console.log('Entra ID Users: Using cached data for persistence');
                    return cachedUsers as EnhancedUser[];
                }

                // Get access token if not provided
                // Skip token request - use backend cloud session directly
                console.log('🔍 DEBUG: EntraUserCollector skipping token request, using backend session');

                // Fetch users from Microsoft Graph API via backend
                const entraUsers = await this.fetchFromGraphAPI('backend-session');

                // Convert to enhanced users
                const enhancedUsers = this.convertEntraUsersToEnhanced(entraUsers);

                // Cache for persistence across tabs
                userDataCache.set(cacheKey, enhancedUsers, 30 * 60 * 1000); // 30 minutes

                const duration = performance.now() - startTime;
                this.logOperation('fetchUsers', duration, true, {
                    count: enhancedUsers.length,
                    cached: false
                });

                return enhancedUsers;
            }, 'Entra ID user fetch');
        } catch (error) {
            console.error('Entra ID User fetch failed:', error);
            return [];
        }
    }

    private async getAccessToken(credentials: EntraCredentials): Promise<string> {
        // Use the backend gateway URL, not the frontend origin
        const baseUrl = 'http://localhost:3001';

        const response = await fetch(`${baseUrl}/api/cloud/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hyperion-key': 'dev-gateway-key-change-in-production'
            },
            body: JSON.stringify({
                tenantId: credentials.tenantId,
                clientId: credentials.clientId,
                clientSecret: credentials.clientSecret,
                certificateThumbprint: credentials.certificateThumbprint,
                scope: 'https://graph.microsoft.com/.default'
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to get access token: ${response.statusText}`);
        }

        const tokenData = await response.json();
        return tokenData.access_token;
    }

    private async fetchFromGraphAPI(accessToken: string): Promise<EntraUser[]> {
        // Use the backend cloud usage report instead of direct Graph API calls
        // This leverages the same successful pattern as Cloud Reporting
        const baseUrl = 'http://localhost:3001';
        
        console.log('🔍 DEBUG: EntraUserCollector using backend cloud session...');
        
        const response = await fetch(`${baseUrl}/api/cloud/usage-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': 'dev-gateway-key-change-in-production'
            }
        });

        if (!response.ok) {
            throw new Error(`Graph API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`Graph API error: ${data.error}`);
        }

        console.log('🔍 DEBUG: EntraUserCollector got cloud data:', data.users?.length || 0, 'users');

        // Convert the cloud usage report format to EntraUser format
        return (data.users || []).map((user: any) => ({
            id: user.id,
            userPrincipalName: user.userPrincipalName,
            displayName: user.displayName,
            mail: user.mail || user.userPrincipalName,
            userType: user.userType || 'Member',
            accountEnabled: user.accountEnabled !== false,
            assignedLicenses: user.assignedLicenses || [],
            createdDateTime: user.createdDateTime || new Date().toISOString(),
            department: user.department,
            jobTitle: user.jobTitle,
            companyName: user.companyName,
            signInActivity: user.signInActivity
        }));
    }

    private convertEntraUsersToEnhanced(entraUsers: EntraUser[]): EnhancedUser[] {
        return entraUsers.map(entraUser => this.convertSingleEntraUser(entraUser));
    }

    private convertSingleEntraUser(entraUser: EntraUser): EnhancedUser {
        const enhancedUser: EnhancedUser = {
            // Identity mapping
            id: entraUser.id,
            upn: entraUser.userPrincipalName,
            samAccountName: this.extractSamAccountName(entraUser.userPrincipalName),

            // Basic attributes
            name: entraUser.displayName,
            email: entraUser.mail || entraUser.userPrincipalName,
            status: entraUser.accountEnabled ? 'Active' : 'Disabled',
            department: entraUser.department,
            distinguishedName: `CN=${entraUser.displayName},OU=Cloud Users,DC=entra,DC=microsoft,DC=com`,
            lastLogin: this.formatLastSignIn(entraUser.signInActivity?.lastSignInDateTime),
            createdDate: entraUser.createdDateTime,

            // Multi-source flags
            sources: {
                ad: false,
                entra: true,
                exchange: false
            },

            // Entra ID specific data
            entraData: {
                objectId: entraUser.id,
                lastSignIn: entraUser.signInActivity?.lastSignInDateTime ?
                    new Date(entraUser.signInActivity.lastSignInDateTime) : undefined,
                mfaEnabled: this.checkMFAStatus(entraUser),
                licenseAssignments: this.extractLicenseNames(entraUser.assignedLicenses),
                userType: entraUser.userType,
                accountEnabled: entraUser.accountEnabled,
                riskLevel: this.mapRiskLevel(entraUser.riskLevel),
                complianceState: 'Unknown', // Would need additional API call
                adminRoles: this.extractAdminRoles(entraUser)
            },

            // Calculated intelligence
            healthStatus: this.calculateEntraHealthStatus(entraUser),
            riskFactors: this.calculateEntraRiskFactors(entraUser),
            recommendations: this.generateEntraRecommendations(entraUser),

            // Special categories
            isGuest: entraUser.userType === 'Guest',
            isTarget: this.isTargetUser(entraUser.userPrincipalName),
            isPrivileged: this.isPrivilegedEntraUser(entraUser),
            isServiceAccount: this.isEntraServiceAccount(entraUser)
        };

        return enhancedUser;
    }

    private extractSamAccountName(upn: string): string {
        return upn.split('@')[0] || upn;
    }

    private formatLastSignIn(lastSignIn?: string): string {
        if (!lastSignIn) return 'Never';

        try {
            return new Date(lastSignIn).toISOString();
        } catch (error) {
            return 'Never';
        }
    }

    private checkMFAStatus(entraUser: EntraUser): boolean {
        // This would require additional Graph API calls to get MFA status
        // For now, assume MFA is enabled for privileged users
        return this.isPrivilegedEntraUser(entraUser);
    }

    private extractLicenseNames(licenses: EntraUser['assignedLicenses']): string[] {
        if (!licenses) return [];

        // Map common SKU IDs to friendly names
        const licenseMap: Record<string, string> = {
            'c7df2760-2c81-4ef7-b578-5b5392b571df': 'Office 365 E5',
            '6fd2c87f-b296-42f0-b197-1e91e994b900': 'Office 365 E3',
            '3b555118-da6a-4418-894f-7df1e2096870': 'Office 365 E1',
            '66b55226-6b4f-492c-910c-a3b7a3c9d993': 'Microsoft 365 F3',
            'f245ecc8-75af-4f8e-b61f-27d8114de5f3': 'Microsoft 365 Business Standard'
        };

        return licenses.map(license =>
            licenseMap[license.skuId] || `License-${license.skuId.substring(0, 8)}`
        );
    }

    private mapRiskLevel(riskLevel?: string): 'Low' | 'Medium' | 'High' | undefined {
        switch (riskLevel?.toLowerCase()) {
            case 'low': return 'Low';
            case 'medium': return 'Medium';
            case 'high': return 'High';
            default: return undefined;
        }
    }

    private extractAdminRoles(entraUser: EntraUser): string[] {
        // This would require additional Graph API calls to get directory roles
        // For now, check if user has admin-like properties
        const adminIndicators = ['admin', 'administrator', 'global', 'security'];
        const roles: string[] = [];

        if (entraUser.jobTitle) {
            const title = entraUser.jobTitle.toLowerCase();
            if (adminIndicators.some(indicator => title.includes(indicator))) {
                roles.push(entraUser.jobTitle);
            }
        }

        return roles;
    }

    private calculateEntraHealthStatus(entraUser: EntraUser): 'Active' | 'Warning' | 'Stale' | 'Disabled' {
        if (!entraUser.accountEnabled) {
            return 'Disabled';
        }

        // Check for stale accounts (no sign-in in 90 days)
        if (entraUser.signInActivity?.lastSignInDateTime) {
            try {
                const lastSignIn = new Date(entraUser.signInActivity.lastSignInDateTime);
                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

                if (lastSignIn < ninetyDaysAgo) {
                    return 'Stale';
                }
            } catch (error) {
                // Invalid date
            }
        } else {
            // Never signed in
            return 'Warning';
        }

        // Check for guest users without recent activity
        if (entraUser.userType === 'Guest') {
            try {
                const lastSignIn = new Date(entraUser.signInActivity?.lastSignInDateTime || '');
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                if (lastSignIn < thirtyDaysAgo) {
                    return 'Warning';
                }
            } catch (error) {
                return 'Warning';
            }
        }

        return 'Active';
    }

    private calculateEntraRiskFactors(entraUser: EntraUser): string[] {
        const risks: string[] = [];

        // Guest user risks
        if (entraUser.userType === 'Guest') {
            risks.push('External guest user');

            if (!entraUser.signInActivity?.lastSignInDateTime) {
                risks.push('Guest user never signed in');
            }
        }

        // No recent sign-in
        if (!entraUser.signInActivity?.lastSignInDateTime) {
            risks.push('Never signed in to cloud services');
        }

        // High risk level
        if (entraUser.riskLevel === 'high') {
            risks.push('High risk level detected');
        }

        // Privileged user without MFA
        if (this.isPrivilegedEntraUser(entraUser) && !this.checkMFAStatus(entraUser)) {
            risks.push('Privileged user without MFA');
        }

        // Target user pattern
        if (this.isTargetUser(entraUser.userPrincipalName)) {
            risks.push('Target user pattern detected');
        }

        return risks;
    }

    private generateEntraRecommendations(entraUser: EntraUser): string[] {
        const recommendations: string[] = [];

        // Guest user recommendations
        if (entraUser.userType === 'Guest') {
            recommendations.push('Review guest user access and permissions');
            recommendations.push('Ensure guest user follows access review process');
        }

        // Stale account recommendations
        const healthStatus = this.calculateEntraHealthStatus(entraUser);
        if (healthStatus === 'Stale') {
            recommendations.push('Review account activity and consider access review');
        }

        // Privileged user recommendations
        if (this.isPrivilegedEntraUser(entraUser)) {
            recommendations.push('Enable Privileged Identity Management (PIM)');
            recommendations.push('Require MFA for administrative access');
        }

        // License optimization
        if (entraUser.assignedLicenses && entraUser.assignedLicenses.length === 0) {
            recommendations.push('Assign appropriate license based on user role');
        }

        return recommendations;
    }

    private isTargetUser(upn: string): boolean {
        return upn?.includes('target.ae#EXT#@') || false;
    }

    private isPrivilegedEntraUser(entraUser: EntraUser): boolean {
        // Check job title for admin indicators
        const adminIndicators = [
            'admin', 'administrator', 'manager', 'director', 'ceo', 'cto', 'ciso'
        ];

        const fieldsToCheck = [
            entraUser.displayName?.toLowerCase() || '',
            entraUser.jobTitle?.toLowerCase() || '',
            entraUser.userPrincipalName?.toLowerCase() || ''
        ];

        return fieldsToCheck.some(field =>
            adminIndicators.some(indicator => field.includes(indicator))
        );
    }

    private isEntraServiceAccount(entraUser: EntraUser): boolean {
        // Service accounts in Entra ID often have specific patterns
        const serviceIndicators = [
            'service', 'svc', 'app', 'system', 'sync', 'connector', 'api'
        ];

        const fieldsToCheck = [
            entraUser.displayName?.toLowerCase() || '',
            entraUser.userPrincipalName?.toLowerCase() || ''
        ];

        // Service accounts often don't have interactive sign-ins
        const hasNeverSignedIn = !entraUser.signInActivity?.lastSignInDateTime;

        // Check naming patterns
        const hasServiceNaming = fieldsToCheck.some(field =>
            serviceIndicators.some(indicator => field.includes(indicator))
        );

        return hasServiceNaming || (hasNeverSignedIn && entraUser.userType === 'Member');
    }

    // Method to get summary statistics for tiles
    async getUserSummary(credentials: EntraCredentials): Promise<Partial<import('../types/enhanced.types').UserSummary>> {
        try {
            const users = await this.fetchUsers(credentials);

            return {
                guestUsers: users.filter(u => u.isGuest).length,
                targetUsers: users.filter(u => u.isTarget).length,
                privilegedUsers: users.filter(u => u.isPrivileged).length,
                serviceAccounts: users.filter(u => u.isServiceAccount).length,
                healthyUsers: users.filter(u => u.healthStatus === 'Active').length,
                atRiskUsers: users.filter(u => u.riskFactors.length > 0).length,
                entraOnlyUsers: users.length, // All users from Entra collector are Entra-only initially
                // License counts
                licenseE5: users.filter(u =>
                    u.entraData?.licenseAssignments.some(l => l.includes('E5'))
                ).length,
                licenseE3: users.filter(u =>
                    u.entraData?.licenseAssignments.some(l => l.includes('E3'))
                ).length,
                licenseE1: users.filter(u =>
                    u.entraData?.licenseAssignments.some(l => l.includes('E1'))
                ).length,
                licenseF3: users.filter(u =>
                    u.entraData?.licenseAssignments.some(l => l.includes('F3'))
                ).length,
                noMfa: users.filter(u =>
                    u.entraData && !u.entraData.mfaEnabled
                ).length,
            };
        } catch (error) {
            console.error('Failed to generate Entra ID user summary:', error);
            return {};
        }
    }
}