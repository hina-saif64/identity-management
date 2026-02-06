import { EnhancedUser } from '../models/enhancedUser.js';

export class UserDataMerger {
    async mergeUserData(
        adUsers: any[],
        entraUsers: any[],
        exchangeUsers: any[]
    ): Promise<EnhancedUser[]> {
        const userMap = new Map<string, EnhancedUser>();

        // Start with AD users as base
        for (const adUser of adUsers) {
            const upn = (adUser.email || adUser.userPrincipalName || '').toLowerCase();
            const sam = (adUser.samAccountName || '').toLowerCase();
            const key = upn || sam || adUser.id;

            if (!key) continue;

            const enhancedUser: EnhancedUser = {
                ...this.convertADUser(adUser),
                sources: { ad: true, entra: false, exchange: false },
                healthStatus: this.calculateHealthStatus(adUser),
                riskFactors: [],
                recommendations: [],
                isGuest: false,
                isTarget: this.isTargetUser(upn),
                isPrivileged: false,
                isServiceAccount: this.isServiceAccount(adUser)
            };

            userMap.set(key, enhancedUser);
        }

        // Enrich with Entra ID data
        for (const entraUser of entraUsers) {
            const key = this.findMatchingKey(entraUser, userMap);
            if (key) {
                const existing = userMap.get(key)!;
                existing.sources.entra = true;
                existing.entraData = this.convertEntraData(entraUser);
                existing.isGuest = entraUser.userType === 'Guest';
                // existing.isPrivileged = this.hasAdminRoles(entraUser); // To be implemented
            } else {
                // Entra-only user (cloud-only account)
                const upn = (entraUser.userPrincipalName || '').toLowerCase();
                if (upn) {
                    const enhancedUser = this.createEntraOnlyUser(entraUser);
                    userMap.set(upn, enhancedUser);
                }
            }
        }

        // Enrich with Exchange data
        for (const exchangeUser of exchangeUsers) {
            const key = this.findMatchingKey(exchangeUser, userMap);
            if (key) {
                const existing = userMap.get(key)!;
                existing.sources.exchange = true;
                existing.exchangeData = this.convertExchangeData(exchangeUser);
            }
        }

        // Calculate final health status and recommendations
        return Array.from(userMap.values()).map(user => ({
            ...user,
            healthStatus: this.calculateFinalHealthStatus(user),
            riskFactors: this.calculateRiskFactors(user),
            recommendations: this.generateRecommendations(user)
        }));
    }

    private findMatchingKey(user: any, userMap: Map<string, EnhancedUser>): string | null {
        const upn = (user.userPrincipalName || user.email || '').toLowerCase();
        if (upn && userMap.has(upn)) return upn;

        // Try other strategies if needed (e.g. email)
        const email = (user.mail || user.email || '').toLowerCase();
        if (email && userMap.has(email)) return email;

        return null;
    }

    private convertADUser(adUser: any): Omit<EnhancedUser, 'sources' | 'healthStatus' | 'riskFactors' | 'recommendations' | 'isGuest' | 'isTarget' | 'isPrivileged' | 'isServiceAccount'> {
        return {
            id: adUser.id || adUser.distinguishedName,
            upn: adUser.userPrincipalName || adUser.email || '',
            samAccountName: adUser.samAccountName,
            name: adUser.name || adUser.displayName || adUser.samAccountName,
            email: adUser.email || adUser.userPrincipalName || '',
            status: adUser.status === 'Active' || adUser.Enabled === true ? 'Active' : 'Disabled',
            department: adUser.department,
            distinguishedName: adUser.distinguishedName,
            lastLogin: adUser.lastLogin || adUser.lastLogon,
            lastPasswordSet: adUser.lastPasswordSet || adUser.pwdLastSet,
            created: adUser.created || adUser.whenCreated
        };
    }

    private convertEntraData(entraUser: any): EnhancedUser['entraData'] {
        return {
            objectId: entraUser.id,
            lastSignIn: entraUser.signInActivity ? new Date(entraUser.signInActivity.lastSignInDateTime) : undefined,
            mfaEnabled: false, // Need specific call to check MFA
            licenseAssignments: [], // Need specific call
            userType: entraUser.userType as 'Member' | 'Guest',
            accountEnabled: entraUser.accountEnabled,
            riskLevel: 'Low', // Placeholder
            complianceState: 'Unknown'
        };
    }

    private createEntraOnlyUser(entraUser: any): EnhancedUser {
        return {
            id: entraUser.id,
            upn: entraUser.userPrincipalName,
            samAccountName: '', // Cloud only
            name: entraUser.displayName,
            email: entraUser.mail || entraUser.userPrincipalName,
            status: entraUser.accountEnabled ? 'Active' : 'Disabled',
            department: entraUser.department,
            distinguishedName: '',
            lastLogin: entraUser.signInActivity?.lastSignInDateTime,
            lastPasswordSet: undefined,
            created: entraUser.createdDateTime,
            sources: { ad: false, entra: true, exchange: false },
            entraData: this.convertEntraData(entraUser),
            healthStatus: 'Active', // Default
            riskFactors: [],
            recommendations: [],
            isGuest: entraUser.userType === 'Guest',
            isTarget: this.isTargetUser(entraUser.userPrincipalName),
            isPrivileged: false,
            isServiceAccount: false
        };
    }

    private convertExchangeData(exchangeUser: any): EnhancedUser['exchangeData'] {
        return {
            mailboxType: exchangeUser.RecipientTypeDetails || 'UserMailbox',
            mailboxSize: exchangeUser.TotalItemSize ? parseInt(exchangeUser.TotalItemSize) : 0,
            lastActivity: undefined, // Requires audit logs
            forwardingEnabled: !!exchangeUser.ForwardingAddress,
            archiveEnabled: !!exchangeUser.ArchiveDatabase,
            litigationHoldEnabled: !!exchangeUser.LitigationHoldEnabled
        };
    }

    private isTargetUser(email: string): boolean {
        return email?.includes('target.ae#EXT#@') || false;
    }

    private isServiceAccount(adUser: any): boolean {
        // Simple heuristic: name start with svc_ or service_
        return adUser.samAccountName?.toLowerCase().startsWith('svc_') ||
            adUser.name?.toLowerCase().startsWith('service account');
    }

    private calculateHealthStatus(user: any): 'Active' | 'Warning' | 'Stale' | 'Disabled' {
        if (user.status !== 'Active' && user.Enabled !== true) return 'Disabled';

        const lastLogin = user.lastLogin || user.lastLogon;
        if (!lastLogin || lastLogin === 'Never') return 'Warning'; // Never logged in could be warning

        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        // Check for stale accounts
        if (lastLogin !== 'Never') {
            const lastLoginDate = new Date(lastLogin);
            if (!isNaN(lastLoginDate.getTime()) && lastLoginDate < ninetyDaysAgo) return 'Stale';
        }

        return 'Active';
    }

    private calculateFinalHealthStatus(user: EnhancedUser): 'Active' | 'Warning' | 'Stale' | 'Disabled' {
        // Combine status from multiple sources
        if (user.status === 'Disabled' && (!user.sources.entra || !user.entraData?.accountEnabled)) {
            return 'Disabled';
        }

        // If stale in AD but active in Entra/Cloud, might be Active (hybrid)
        // For now, prioritize "Stale" if stale in AD
        if (user.healthStatus === 'Stale') return 'Stale';

        return user.healthStatus;
    }

    private calculateRiskFactors(user: EnhancedUser): string[] {
        const risks: string[] = [];
        if (user.healthStatus === 'Stale') risks.push('Stale Account');
        if (user.isGuest) risks.push('Guest User');
        return risks;
    }

    private generateRecommendations(user: EnhancedUser): string[] {
        const recs: string[] = [];
        if (user.healthStatus === 'Stale') recs.push('Review and disable if not needed');
        return recs;
    }
}
