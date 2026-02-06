export interface ActivityCache {
    userId: string;
    role: string;
    lastUpdated: Date;
    regularActivity: Date | null;
    privilegedActivity: Date | null;
    privilegedCount: number;
    cacheValidUntil: Date;
}

export interface PrivilegedOperation {
    operation: string;
    timestamp: Date;
    resource: string;
    result: 'Success' | 'Failed';
}

// Define what operations count as "privileged" for each role
export const PRIVILEGED_OPERATIONS: { [key: string]: string[] } = {
    'Global Administrator': [
        'Add application',
        'Update user',
        'Assign role',
        'Create group',
        'Update organization settings',
        'Add member to role'
    ],
    'Exchange Administrator': [
        'New-Mailbox',
        'Set-Mailbox',
        'New-DistributionGroup',
        'Set-OrganizationConfig',
        'Search-UnifiedAuditLog'
    ],
    'SharePoint Administrator': [
        'New-SPOSite',
        'Set-SPOSite',
        'Set-SPOTenant',
        'Grant-SPOSiteDesignRights'
    ],
    'User Administrator': [
        'Create user',
        'Update user',
        'Delete user',
        'Reset password'
    ]
};
