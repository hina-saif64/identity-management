// Enhanced AD User Collector
// Label: AD-USER-COLLECTOR

import { BaseCollector } from './BaseCollector';
import type { ADCredentials, EnhancedUser } from '../types/enhanced.types';
import type { ADUser } from '../../../types';
import { userDataCache } from './TTLCache';

export class ADUserCollector extends BaseCollector<ADCredentials, EnhancedUser> {

    getSourceName(): string {
        return 'Active Directory';
    }

    async validateCredentials(credentials: ADCredentials): Promise<boolean> {
        const requiredFields = credentials.useCurrentUser
            ? ['server', 'domain']
            : ['server', 'domain', 'username', 'password'];

        return this.validateCommonCredentials(credentials, requiredFields);
    }

    async fetchUsers(credentials: ADCredentials): Promise<EnhancedUser[]> {
        try {
            return await this.executeWithRetry(async () => {
                const startTime = performance.now();

                // Check cache first for data persistence
                const cacheKey = this.generateCacheKey(credentials, 'users');
                const cachedUsers = userDataCache.get(cacheKey);

                if (cachedUsers) {
                    console.log('User Intelligence: Using cached data for persistence');
                    return cachedUsers as EnhancedUser[];
                }

                // Fetch from existing AD gateway
                const response = await this.callADGateway(credentials);

                // Backend returns { users: [...], count: ..., duration: ... } directly
                // Check if we got users data
                if (!response.users || !Array.isArray(response.users)) {
                    throw new Error(response.error || 'No users data received from AD gateway');
                }

                console.log(`AD Gateway returned ${response.users.length} users in ${response.duration}ms`);

                // Convert user intelligence to enhanced users
                const enhancedUsers = this.convertADUsersToEnhanced(response.users);

                // Cache for persistence across tabs
                userDataCache.set(cacheKey, enhancedUsers, 30 * 60 * 1000); // 30 minutes

                const duration = performance.now() - startTime;
                this.logOperation('fetchUsers', duration, true, {
                    count: enhancedUsers.length,
                    cached: false
                });

                return enhancedUsers;
            }, 'AD user fetch');
        } catch (error) {
            console.error('AD User fetch failed:', error);
            return [];
        }
    }

    private async callADGateway(credentials: ADCredentials): Promise<any> {
        // Use the backend gateway URL, not the frontend origin
        const baseUrl = 'http://localhost:3001';

        // Use existing AD gateway endpoint
        const response = await fetch(`${baseUrl}/api/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hyperion-key': 'dev-gateway-key-change-in-production'
            },
            body: JSON.stringify({
                sessionId: credentials.sessionId,
                server: credentials.server,
                domain: credentials.domain,
                username: credentials.username,
                password: credentials.password,
                useCurrentUser: credentials.useCurrentUser || false,
                // Default filters for comprehensive fetch
                filters: {
                    status: 'All',
                    department: '',
                    searchBase: '',
                    upnSuffix: '',
                    stalledDays: 0,
                    passwordAge: 0,
                    searchString: ''
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    private convertADUsersToEnhanced(adUsers: ADUser[]): EnhancedUser[] {
        console.log(`Converting ${adUsers.length} AD users to enhanced format`);
        
        return adUsers.map((adUser, index) => {
            try {
                return this.convertSingleADUser(adUser);
            } catch (error) {
                console.error(`Error converting user at index ${index}:`, error);
                console.error('User data:', adUser);
                // Return a minimal user object to prevent complete failure
                return {
                    id: adUser?.id || `error-user-${index}`,
                    upn: adUser?.email || adUser?.samAccountName || `unknown-${index}`,
                    samAccountName: adUser?.samAccountName || '',
                    name: adUser?.name || 'Unknown User',
                    email: adUser?.email || '',
                    status: adUser?.status || 'Unknown',
                    department: adUser?.department || '',
                    distinguishedName: adUser?.distinguishedName || '',
                    lastLogin: adUser?.lastLogin || 'Never',
                    lastPasswordSet: adUser?.lastPasswordSet || 'Never',
                    createdDate: adUser?.created || '',
                    description: adUser?.description || '',
                    extAttribute7: adUser?.extAttribute7 || '',
                    extAttribute10: adUser?.extAttribute10 || '',
                    extAttribute14: adUser?.extAttribute14 || '',
                    sources: { ad: true, entra: false, exchange: false },
                    healthStatus: 'Unknown' as const,
                    riskFactors: [],
                    recommendations: [],
                    isGuest: false,
                    isTarget: false,
                    isPrivileged: false,
                    isServiceAccount: false
                } as EnhancedUser;
            }
        });
    }

    private convertSingleADUser(adUser: ADUser): EnhancedUser {
        // Safely extract fields with null/undefined protection
        const safeString = (value: any): string => {
            return (value && typeof value === 'string') ? value : '';
        };

        const enhancedUser: EnhancedUser = {
            // Identity mapping with safety
            id: safeString(adUser.id) || safeString(adUser.distinguishedName) || 'unknown',
            upn: this.extractUPN(adUser),
            samAccountName: safeString(adUser.samAccountName),

            // Direct field mapping with null safety
            name: safeString(adUser.name) || safeString(adUser.samAccountName) || 'Unknown User',
            email: safeString(adUser.email),
            status: safeString(adUser.status) || 'Unknown',
            department: safeString(adUser.department),
            distinguishedName: safeString(adUser.distinguishedName),
            lastLogin: safeString(adUser.lastLogin) || 'Never',
            lastPasswordSet: safeString(adUser.lastPasswordSet) || 'Never',
            createdDate: safeString(adUser.created) || safeString(adUser.createdDate) || '', // Handle both field names
            description: safeString(adUser.description),
            extAttribute7: safeString(adUser.extAttribute7),
            extAttribute10: safeString(adUser.extAttribute10),
            extAttribute14: safeString(adUser.extAttribute14),

            // Multi-source flags
            sources: {
                ad: true,
                entra: false,
                exchange: false
            },

            // Calculated intelligence with safe data
            healthStatus: this.calculateHealthStatus(adUser),
            riskFactors: this.calculateRiskFactors(adUser),
            recommendations: this.generateRecommendations(adUser),

            // Special categories with safe email check
            isGuest: false, // AD users are not guests
            isTarget: this.isTargetUser(safeString(adUser.email)),
            isPrivileged: this.isPrivilegedUser(adUser),
            isServiceAccount: this.isServiceAccount(adUser)
        };

        return enhancedUser;
    }

    private extractUPN(adUser: ADUser): string {
        // Safely get string values
        const email = (adUser.email && typeof adUser.email === 'string') ? adUser.email : '';
        const samAccountName = (adUser.samAccountName && typeof adUser.samAccountName === 'string') ? adUser.samAccountName : '';
        const distinguishedName = (adUser.distinguishedName && typeof adUser.distinguishedName === 'string') ? adUser.distinguishedName : '';
        const id = (adUser.id && typeof adUser.id === 'string') ? adUser.id : '';

        // Try to extract UPN from various fields
        if (email && email.includes('@')) {
            return email;
        }

        // Fallback to samAccountName@domain if available
        if (samAccountName && distinguishedName) {
            const domain = this.extractDomainFromDN(distinguishedName);
            if (domain) {
                return `${samAccountName}@${domain}`;
            }
        }

        return email || samAccountName || id || 'unknown';
    }

    private extractDomainFromDN(dn: string): string | null {
        const dcMatch = dn.match(/DC=([^,]+)/g);
        if (dcMatch) {
            return dcMatch.map(dc => dc.replace('DC=', '')).join('.');
        }
        return null;
    }

    private calculateHealthStatus(adUser: ADUser): 'Active' | 'Warning' | 'Stale' | 'Disabled' {
        if (adUser.status !== 'Active') {
            return 'Disabled';
        }

        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        // Check for stale accounts (no login in 90 days)
        if (adUser.lastLogin && adUser.lastLogin !== 'Never') {
            try {
                const lastLoginDate = new Date(adUser.lastLogin);
                if (lastLoginDate < ninetyDaysAgo) {
                    return 'Stale';
                }
            } catch (error) {
                // Invalid date format
            }
        }

        // Check for password issues
        if (adUser.lastPasswordSet === 'Never') {
            return 'Warning';
        }

        // Check for very old passwords (over 365 days)
        if (adUser.lastPasswordSet) {
            try {
                const passwordDate = new Date(adUser.lastPasswordSet);
                const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                if (passwordDate < oneYearAgo) {
                    return 'Warning';
                }
            } catch (error) {
                // Invalid date format
            }
        }

        return 'Active';
    }

    private calculateRiskFactors(adUser: ADUser): string[] {
        const risks: string[] = [];

        // Never logged in
        if (adUser.lastLogin === 'Never') {
            risks.push('Never logged in');
        }

        // Never changed password
        if (adUser.lastPasswordSet === 'Never') {
            risks.push('Never changed password');
        }

        // No email address
        if (!adUser.email) {
            risks.push('No email address');
        }

        // Privileged account without recent activity
        if (this.isPrivilegedUser(adUser) && adUser.lastLogin !== 'Never') {
            try {
                const lastLogin = new Date(adUser.lastLogin || '');
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                if (lastLogin < thirtyDaysAgo) {
                    risks.push('Privileged account with no recent activity');
                }
            } catch (error) {
                // Invalid date
            }
        }

        // Service account with interactive login
        if (this.isServiceAccount(adUser) && adUser.lastLogin !== 'Never') {
            risks.push('Service account with interactive login');
        }

        return risks;
    }

    private generateRecommendations(adUser: ADUser): string[] {
        const recommendations: string[] = [];

        // Based on health status
        const healthStatus = this.calculateHealthStatus(adUser);

        switch (healthStatus) {
            case 'Stale':
                recommendations.push('Review account activity and consider disabling if no longer needed');
                break;
            case 'Warning':
                if (adUser.lastPasswordSet === 'Never') {
                    recommendations.push('Force password change on next login');
                }
                break;
            case 'Disabled':
                recommendations.push('Review if account can be deleted or archived');
                break;
        }

        // Privileged user recommendations
        if (this.isPrivilegedUser(adUser)) {
            recommendations.push('Enable MFA for privileged account');
            recommendations.push('Review admin role assignments');
        }

        // Service account recommendations
        if (this.isServiceAccount(adUser)) {
            recommendations.push('Ensure service account follows naming convention');
            recommendations.push('Review service account permissions');
        }

        // Target user recommendations
        if (this.isTargetUser(adUser.email)) {
            recommendations.push('Verify target user access requirements');
        }

        return recommendations;
    }

    private isTargetUser(email: string): boolean {
        return email?.includes('target.ae#EXT#@') || false;
    }

    private isPrivilegedUser(adUser: ADUser): boolean {
        // Check for admin indicators in various fields
        const adminIndicators = [
            'admin', 'administrator', 'domain admin', 'enterprise admin',
            'schema admin', 'backup operator', 'account operator'
        ];

        const fieldsToCheck = [
            adUser.name?.toLowerCase() || '',
            adUser.samAccountName?.toLowerCase() || '',
            adUser.description?.toLowerCase() || '',
            adUser.distinguishedName?.toLowerCase() || ''
        ];

        return fieldsToCheck.some(field =>
            adminIndicators.some(indicator => field.includes(indicator))
        );
    }

    private isServiceAccount(adUser: ADUser): boolean {
        // Check for service account indicators
        const serviceIndicators = [
            'service', 'svc', 'app', 'system', 'sql', 'iis', 'exchange',
            'sharepoint', 'backup', 'monitoring', 'sync'
        ];

        const fieldsToCheck = [
            adUser.name?.toLowerCase() || '',
            adUser.samAccountName?.toLowerCase() || '',
            adUser.description?.toLowerCase() || ''
        ];

        // Service accounts often don't have interactive logins
        const hasNeverLoggedIn = adUser.lastLogin === 'Never';

        // Check naming patterns
        const hasServiceNaming = fieldsToCheck.some(field =>
            serviceIndicators.some(indicator => field.includes(indicator))
        );

        // Service accounts often have specific OU patterns
        const isInServiceOU = adUser.distinguishedName?.toLowerCase().includes('service') || false;

        return hasServiceNaming || (hasNeverLoggedIn && isInServiceOU);
    }

    // Method to get summary statistics for tiles
    async getUserSummary(credentials: ADCredentials): Promise<Partial<import('../types/enhanced.types').UserSummary>> {
        try {
            const users = await this.fetchUsers(credentials);

            return {
                total: users.length,
                enabled: users.filter(u => u.status === 'Active').length,
                disabled: users.filter(u => u.status === 'Disabled').length,
                withEmail: users.filter(u => u.email && u.email.trim() !== '').length,
                neverChanged: users.filter(u => u.lastPasswordSet === 'Never').length,
                stalled: users.filter(u => u.healthStatus === 'Stale').length,
                neverLogin: users.filter(u => u.lastLogin === 'Never').length,
                passwordExpired: users.filter(u => u.healthStatus === 'Warning' && u.lastPasswordSet !== 'Never').length,
                targetUsers: users.filter(u => u.isTarget).length,
                privilegedUsers: users.filter(u => u.isPrivileged).length,
                serviceAccounts: users.filter(u => u.isServiceAccount).length,
                healthyUsers: users.filter(u => u.healthStatus === 'Active').length,
                atRiskUsers: users.filter(u => u.riskFactors.length > 0).length,
                adOnlyUsers: users.length, // All users from AD collector are AD-only initially
            };
        } catch (error) {
            console.error('Failed to generate AD user summary:', error);
            return {};
        }
    }
}