// Exchange Online User Collector
// Label: EXCHANGE-USER-COLLECTOR

import { BaseCollector } from './BaseCollector';
import type { ExchangeCredentials, EnhancedUser } from '../types/enhanced.types';
import { userDataCache } from './TTLCache';

interface ExchangeMailbox {
    userPrincipalName: string;
    displayName: string;
    primarySmtpAddress: string;
    recipientType: 'UserMailbox' | 'SharedMailbox' | 'RoomMailbox' | 'EquipmentMailbox';
    totalItemSize?: string;
    itemCount?: number;
    lastLogonTime?: string;
    whenCreated: string;
    forwardingAddress?: string;
    forwardingSmtpAddress?: string;
    deliverToMailboxAndForward?: boolean;
    archiveStatus?: 'Active' | 'None';
    litigationHoldEnabled?: boolean;
    retentionHoldEnabled?: boolean;
    inPlaceHolds?: string[];
    mailboxPlan?: string;
    office?: string;
    department?: string;
}

interface ExchangeActivity {
    userPrincipalName: string;
    lastActivityDate?: string;
    sendCount?: number;
    receiveCount?: number;
    readCount?: number;
    meetingCreatedCount?: number;
    meetingInteractedCount?: number;
}

export class ExchangeUserCollector extends BaseCollector<ExchangeCredentials, EnhancedUser> {

    getSourceName(): string {
        return 'Exchange Online';
    }

    async validateCredentials(credentials: ExchangeCredentials): Promise<boolean> {
        if (credentials.accessToken) {
            return this.validateCommonCredentials(credentials, ['tenantId', 'accessToken']);
        }

        return this.validateCommonCredentials(credentials, ['tenantId', 'appId', 'organization']);
    }

    async fetchUsers(credentials: ExchangeCredentials): Promise<EnhancedUser[]> {
        try {
            return await this.executeWithRetry(async () => {
                const startTime = performance.now();

                // Check cache first for data persistence
                const cacheKey = this.generateCacheKey(credentials, 'exchange_users');
                const cachedUsers = userDataCache.get(cacheKey);

                if (cachedUsers) {
                    console.log('Exchange Online Users: Using cached data for persistence');
                    return cachedUsers as EnhancedUser[];
                }

                // Fetch mailboxes and activity data
                const [mailboxes, activities] = await Promise.allSettled([
                    this.fetchMailboxes(credentials),
                    this.fetchMailboxActivities(credentials)
                ]);

                const mailboxData = mailboxes.status === 'fulfilled' ? mailboxes.value : [];
                const activityData = activities.status === 'fulfilled' ? activities.value : [];

                // Convert to enhanced users
                const enhancedUsers = this.convertExchangeUsersToEnhanced(mailboxData, activityData);

                // Cache for persistence across tabs
                userDataCache.set(cacheKey, enhancedUsers, 30 * 60 * 1000); // 30 minutes

                const duration = performance.now() - startTime;
                this.logOperation('fetchUsers', duration, true, {
                    count: enhancedUsers.length,
                    cached: false
                });

                return enhancedUsers;
            }, 'Exchange Online user fetch');
        } catch (error) {
            console.error('Exchange Online User fetch failed:', error);
            return [];
        }
    }

    private async fetchMailboxes(credentials: ExchangeCredentials): Promise<ExchangeMailbox[]> {
        // Use the backend gateway URL, not the frontend origin
        const baseUrl = 'http://localhost:3001';

        const response = await fetch(`${baseUrl}/api/exchange/mailboxes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': 'dev-gateway-key-change-in-production'
            },
            body: JSON.stringify({
                tenantId: credentials.tenantId,
                appId: credentials.appId,
                organization: credentials.organization,
                certificateThumbprint: credentials.certificateThumbprint,
                accessToken: credentials.accessToken
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Exchange mailboxes: ${response.statusText}`);
        }

        const data = await response.json();
        return data.mailboxes || [];
    }

    private async fetchMailboxActivities(credentials: ExchangeCredentials): Promise<ExchangeActivity[]> {
        try {
            // Use the backend gateway URL, not the frontend origin
            const baseUrl = 'http://localhost:3001';

            const response = await fetch(`${baseUrl}/api/exchange/activities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Hyperion-Key': 'dev-gateway-key-change-in-production'
                },
                body: JSON.stringify({
                    tenantId: credentials.tenantId,
                    appId: credentials.appId,
                    organization: credentials.organization,
                    certificateThumbprint: credentials.certificateThumbprint,
                    accessToken: credentials.accessToken,
                    period: 'D90' // Last 90 days
                })
            });

            if (!response.ok) {
                console.warn('Failed to fetch Exchange activities, continuing without activity data');
                return [];
            }

            const data = await response.json();
            return data.activities || [];
        } catch (error) {
            console.warn('Exchange activity fetch failed:', error);
            return [];
        }
    }

    private convertExchangeUsersToEnhanced(
        mailboxes: ExchangeMailbox[],
        activities: ExchangeActivity[]
    ): EnhancedUser[] {
        return mailboxes.map(mailbox => this.convertSingleExchangeUser(mailbox, activities));
    }

    private convertSingleExchangeUser(
        mailbox: ExchangeMailbox,
        activities: ExchangeActivity[]
    ): EnhancedUser {
        const activity = activities.find(a =>
            a.userPrincipalName.toLowerCase() === mailbox.userPrincipalName.toLowerCase()
        );

        const enhancedUser: EnhancedUser = {
            // Identity mapping
            id: mailbox.userPrincipalName,
            upn: mailbox.userPrincipalName,
            samAccountName: this.extractSamAccountName(mailbox.userPrincipalName),

            // Basic attributes
            name: mailbox.displayName,
            email: mailbox.primarySmtpAddress,
            status: 'Active', // Assume active if mailbox exists
            department: mailbox.department,
            distinguishedName: `CN=${mailbox.displayName},OU=Exchange Users,DC=exchange,DC=microsoft,DC=com`,
            lastLogin: this.formatLastActivity(activity?.lastActivityDate || mailbox.lastLogonTime),
            createdDate: mailbox.whenCreated,

            // Multi-source flags
            sources: {
                ad: false,
                entra: false,
                exchange: true
            },

            // Exchange Online specific data
            exchangeData: {
                mailboxType: this.mapMailboxType(mailbox.recipientType),
                mailboxSize: this.parseMailboxSize(mailbox.totalItemSize),
                lastActivity: (activity?.lastActivityDate || mailbox.lastLogonTime) ? new Date(activity?.lastActivityDate || mailbox.lastLogonTime!) : undefined,
                forwardingEnabled: !!(mailbox.forwardingAddress || mailbox.forwardingSmtpAddress),
                archiveEnabled: mailbox.archiveStatus === 'Active',
                litigationHoldEnabled: mailbox.litigationHoldEnabled || false
            },

            // Calculated intelligence
            healthStatus: this.calculateExchangeHealthStatus(mailbox, activity),
            riskFactors: this.calculateExchangeRiskFactors(mailbox, activity),
            recommendations: this.generateExchangeRecommendations(mailbox, activity),

            // Special categories
            isGuest: false, // Exchange users are typically not guests
            isTarget: this.isTargetUser(mailbox.userPrincipalName),
            isPrivileged: this.isPrivilegedExchangeUser(mailbox),
            isServiceAccount: this.isExchangeServiceAccount(mailbox)
        };

        return enhancedUser;
    }

    private extractSamAccountName(upn: string): string {
        return upn.split('@')[0] || upn;
    }

    private formatLastActivity(lastActivity?: string): string {
        if (!lastActivity) return 'Never';

        try {
            return new Date(lastActivity).toISOString();
        } catch (error) {
            return 'Never';
        }
    }

    private mapMailboxType(recipientType: string): 'UserMailbox' | 'SharedMailbox' | 'RoomMailbox' {
        switch (recipientType) {
            case 'SharedMailbox': return 'SharedMailbox';
            case 'RoomMailbox': return 'RoomMailbox';
            case 'EquipmentMailbox': return 'RoomMailbox'; // Treat equipment as room
            default: return 'UserMailbox';
        }
    }

    private parseMailboxSize(sizeString?: string): number | undefined {
        if (!sizeString) return undefined;

        // Parse size strings like "1.5 GB (1,610,612,736 bytes)"
        const bytesMatch = sizeString.match(/\(([0-9,]+)\s*bytes\)/i);
        if (bytesMatch) {
            const bytes = parseInt(bytesMatch[1].replace(/,/g, ''), 10);
            return Math.round(bytes / (1024 * 1024)); // Convert to MB
        }

        // Parse size strings like "1.5 GB"
        const sizeMatch = sizeString.match(/([0-9.]+)\s*(GB|MB|KB)/i);
        if (sizeMatch) {
            const size = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toUpperCase();

            switch (unit) {
                case 'GB': return Math.round(size * 1024);
                case 'MB': return Math.round(size);
                case 'KB': return Math.round(size / 1024);
            }
        }

        return undefined;
    }

    private calculateExchangeHealthStatus(
        mailbox: ExchangeMailbox,
        activity?: ExchangeActivity
    ): 'Active' | 'Warning' | 'Stale' | 'Disabled' {
        // Check for recent activity
        if (activity?.lastActivityDate) {
            try {
                const lastActivity = new Date(activity.lastActivityDate);
                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

                if (lastActivity < ninetyDaysAgo) {
                    return 'Stale';
                }
            } catch (error) {
                // Invalid date
            }
        } else {
            // No activity data available
            return 'Warning';
        }

        // Check for forwarding without delivery (potential security risk)
        if (mailbox.forwardingSmtpAddress && !mailbox.deliverToMailboxAndForward) {
            return 'Warning';
        }

        return 'Active';
    }

    private calculateExchangeRiskFactors(
        mailbox: ExchangeMailbox,
        activity?: ExchangeActivity
    ): string[] {
        const risks: string[] = [];

        // No recent activity
        if (!activity?.lastActivityDate) {
            risks.push('No mailbox activity data available');
        } else {
            try {
                const lastActivity = new Date(activity.lastActivityDate);
                const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

                if (lastActivity < ninetyDaysAgo) {
                    risks.push('No mailbox activity in 90+ days');
                }
            } catch (error) {
                risks.push('Invalid activity date format');
            }
        }

        // Forwarding risks
        if (mailbox.forwardingSmtpAddress) {
            if (!mailbox.deliverToMailboxAndForward) {
                risks.push('Mail forwarding without local delivery');
            } else {
                risks.push('Mail forwarding enabled');
            }
        }

        // Large mailbox without archive
        const mailboxSizeMB = this.parseMailboxSize(mailbox.totalItemSize);
        if (mailboxSizeMB && mailboxSizeMB > 10000 && mailbox.archiveStatus !== 'Active') {
            risks.push('Large mailbox without archive enabled');
        }

        // Shared mailbox with individual access
        if (mailbox.recipientType === 'SharedMailbox' && activity?.lastActivityDate) {
            risks.push('Shared mailbox with individual user activity');
        }

        return risks;
    }

    private generateExchangeRecommendations(
        mailbox: ExchangeMailbox,
        activity?: ExchangeActivity
    ): string[] {
        const recommendations: string[] = [];

        // Archive recommendations
        const mailboxSizeMB = this.parseMailboxSize(mailbox.totalItemSize);
        if (mailboxSizeMB && mailboxSizeMB > 5000 && mailbox.archiveStatus !== 'Active') {
            recommendations.push('Enable archive mailbox for large mailbox');
        }

        // Retention recommendations
        if (!mailbox.litigationHoldEnabled && this.isPrivilegedExchangeUser(mailbox)) {
            recommendations.push('Consider enabling litigation hold for privileged user');
        }

        // Forwarding recommendations
        if (mailbox.forwardingSmtpAddress) {
            recommendations.push('Review mail forwarding configuration for security');
        }

        // Activity recommendations
        if (!activity?.lastActivityDate) {
            recommendations.push('Review mailbox usage and consider deactivation if unused');
        }

        // Shared mailbox recommendations
        if (mailbox.recipientType === 'SharedMailbox') {
            recommendations.push('Ensure shared mailbox has proper delegate access');
            recommendations.push('Review shared mailbox permissions regularly');
        }

        return recommendations;
    }

    private isTargetUser(upn: string): boolean {
        return upn?.includes('target.ae#EXT#@') || false;
    }

    private isPrivilegedExchangeUser(mailbox: ExchangeMailbox): boolean {
        // Check for admin indicators
        const adminIndicators = [
            'admin', 'administrator', 'manager', 'director', 'executive'
        ];

        const fieldsToCheck = [
            mailbox.displayName?.toLowerCase() || '',
            mailbox.userPrincipalName?.toLowerCase() || '',
            mailbox.department?.toLowerCase() || ''
        ];

        return fieldsToCheck.some(field =>
            adminIndicators.some(indicator => field.includes(indicator))
        );
    }

    private isExchangeServiceAccount(mailbox: ExchangeMailbox): boolean {
        // Service accounts in Exchange often have specific patterns
        const serviceIndicators = [
            'service', 'svc', 'noreply', 'no-reply', 'system', 'automated',
            'notification', 'alert', 'monitoring', 'backup'
        ];

        const fieldsToCheck = [
            mailbox.displayName?.toLowerCase() || '',
            mailbox.userPrincipalName?.toLowerCase() || ''
        ];

        // Check naming patterns
        const hasServiceNaming = fieldsToCheck.some(field =>
            serviceIndicators.some(indicator => field.includes(indicator))
        );

        // Shared mailboxes are often service-related
        const isSharedMailbox = mailbox.recipientType === 'SharedMailbox';

        return hasServiceNaming || isSharedMailbox;
    }

    // Method to get summary statistics for tiles
    async getUserSummary(credentials: ExchangeCredentials): Promise<Partial<import('../types/enhanced.types').UserSummary>> {
        try {
            const users = await this.fetchUsers(credentials);

            return {
                withEmail: users.length, // All Exchange users have email
                serviceAccounts: users.filter(u => u.isServiceAccount).length,
                healthyUsers: users.filter(u => u.healthStatus === 'Active').length,
                atRiskUsers: users.filter(u => u.riskFactors.length > 0).length,
                exchangeOnlyUsers: users.length, // All users from Exchange collector are Exchange-only initially
            };
        } catch (error) {
            console.error('Failed to generate Exchange user summary:', error);
            return {};
        }
    }
}