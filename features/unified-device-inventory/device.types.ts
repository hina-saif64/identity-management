/**
 * Unified Device Inventory - TypeScript Types
 */

export type HealthStatus = 'Active' | 'Warning' | 'Stale' | 'Disabled' | 'Unknown';

export type SystemPresence =
    | 'Entra Only'
    | 'Intune Only'
    | 'AD Only'
    | 'Entra + AD'
    | 'Entra + Intune'
    | 'Intune + AD'
    | 'All Systems'
    | 'Unknown';

export type OsCategory = 'Windows 10' | 'Windows 11' | 'Windows Server' | 'Other Windows' | 'Unknown';

export type DefenderStatus = 'Onboarded' | 'Not Onboarded' | 'Unknown' | 'Unsupported';

export interface Device {
    displayName: string;
    deviceId: string | null;

    // Source presence
    entra: boolean;
    intune: boolean;
    ad: boolean;

    // Entra fields
    entraId?: string;
    entraTrustType?: string;
    entraLastSignIn?: string;
    entraRegistered?: string;
    entraEnabled?: boolean;

    // Intune fields
    intuneId?: string;
    intuneComplianceState?: string;
    intuneLastSync?: string;
    intuneEnrolled?: string;
    intuneUser?: string;

    // AD fields
    adDistinguishedName?: string;
    adLastLogon?: string;
    adCreated?: string;
    adEnabled?: boolean;
    adDescription?: string;
    adDnsHostName?: string;

    // OS
    os: string;
    osVersion: string;
    osCategory: OsCategory;

    // Calculated fields
    systemPresence: SystemPresence;
    healthStatus: HealthStatus;
    defenderStatus: DefenderStatus;
    recommendation: string;
    deviceAge: number | null;
    lastSeen: string | null;
    lastUser: string;
}

export interface DeviceSummary {
    total: number;
    entra: number;
    intune: number;
    ad: number;
    active: number;
    warning: number;
    stale: number;
    disabled: number;
    unknown: number;
    windows10: number;
    windows11: number;
    windowsServer: number;
    otherOs: number;
    compliance: number;
    allSystems: number;
    defenderOnboarded: number;
    defenderNotOnboarded: number;
}

export interface DeletedDevice {
    id: string;
    deviceId: string | null;
    displayName: string;
    os: string;
    osVersion: string;
    deletedDate: string;
    lastSignIn: string | null;
    deletedBy: string;
    correlationId: string;
    source: 'entra-deleted';
    daysAgo: number;
}

export interface DeletedDevicesResponse {
    status: 'success' | 'error';
    devices: DeletedDevice[];
    count: number;
    daysBack: number;
    errors: Array<{ source: string; error: string }> | null;
    fetchedAt: string;
    error?: string;
}

export interface DeviceFetchResponse {
    status: 'success' | 'error';
    devices: Device[];
    summary: DeviceSummary;
    errors: Array<{ source: string; error: string }> | null;
    fetchedAt: string;
    error?: string;
}

export interface DeviceCredentials {
    tenantId: string;
    appId: string;
    vaultName: string;
    secretName: string;
    adServer?: string;
    adSessionId?: string;
}

export type DeviceFilter = {
    healthStatus?: HealthStatus[];
    systemPresence?: SystemPresence[];
    osCategory?: OsCategory[];
    searchTerm?: string;
};

// Bulk Action Types
export interface OUNode {
    dn: string;
    name: string;
    children: OUNode[];
    isExpanded: boolean;
    isLoading: boolean;
}

export interface ActionResult {
    deviceName: string;
    systems: {
        entra?: { success: boolean; error?: string };
        intune?: { success: boolean; error?: string };
        ad?: { success: boolean; error?: string };
    };
}

export interface BulkActionResponse {
    status: 'success' | 'error';
    results: ActionResult[];
    totalDevices: number;
    totalSystems?: number;
    targetOU?: string;
    error?: string;
}

export interface OUResponse {
    status: 'success' | 'error';
    ous: OUNode[];
    error?: string;
}
