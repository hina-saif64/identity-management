/**
 * PowerBI Usage Module Types
 * 
 * Type definitions for PowerBI audit log data, connection states,
 * and usage reports from Exchange Online unified audit logs.
 */

/**
 * Individual PowerBI activity record from audit logs
 */
export interface PowerBIActivity {
    /** User principal name or email */
    userIds: string;
    /** PowerBI operation performed (e.g., ViewReport, CreateDashboard) */
    operations: string;
    /** ISO timestamp when activity occurred */
    creationDate: string;
    /** Client IP address */
    clientIP: string;
    /** PowerBI item name (optional) */
    itemName?: string;
    /** PowerBI workspace name (optional) */
    workspaceName?: string;
    /** Type of activity (optional) */
    activityType?: string;
}

export interface PowerBISummary {
    uniqueUsers: number;
    totalActivities: number;
    topOperations: { operation: string; count: number }[];
}

export interface PowerBIUsageReport {
    status?: string;
    data: PowerBIActivity[];
    totalUsers?: number;
    dateRange?: {
        start: string;
        end: string;
        daysBack: number;
    };
    summary?: {
        uniqueUsers?: number;
        totalActivities?: number;
        topOperations?: { operation: string; count: number }[];
    };
}

export interface PowerBIConnectionState {
    connected: boolean;
    connectedAt: string | null;
    userPrincipalName: string | null;
    isConnecting?: boolean;
    error?: string | null;
}
