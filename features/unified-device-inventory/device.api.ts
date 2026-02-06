/**
 * Unified Device Inventory - API Client
 */

import { DeviceFetchResponse, DeviceCredentials, DeviceSummary, Device, DeletedDevicesResponse } from './device.types';

const GATEWAY_SECRET = import.meta.env.VITE_API_KEY || 'dev-gateway-key-change-in-production';

class DeviceApiService {
    private baseUrl: string;

    constructor(baseUrl = 'http://localhost:3001') {
        this.baseUrl = baseUrl;
    }

    /**
     * Fetch all devices from all sources
     */
    async fetchDevices(credentials: DeviceCredentials): Promise<DeviceFetchResponse> {
        const res = await fetch(`${this.baseUrl}/api/devices/fetch`, {
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
     * Get device summary only (for dashboard)
     */
    async getSummary(credentials: DeviceCredentials): Promise<{ status: string; summary: DeviceSummary }> {
        const res = await fetch(`${this.baseUrl}/api/devices/summary`, {
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
     * Disable a device in AD
     */
    async disableDevice(credentials: Omit<DeviceCredentials, 'tenantId' | 'appId' | 'vaultName' | 'secretName'> & { adServer: string; adUsername: string; adPassword: string }, distinguishedName: string): Promise<{ status: string }> {
        const res = await fetch(`${this.baseUrl}/api/devices/disable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify({
                ...credentials,
                distinguishedName
            })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Disable all stale devices in AD
     */
    async disableAllStale(credentials: DeviceCredentials): Promise<{
        status: string;
        results: Array<{ device: string; success: boolean; error?: string }>;
        total: number;
        success: number;
        failed: number;
    }> {
        const res = await fetch(`${this.baseUrl}/api/devices/disable-stale`, {
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
     * Remove device from all systems
     */
    async removeFromAll(credentials: DeviceCredentials, device: Device): Promise<{
        status: string;
        results: {
            intune: { success: boolean; error?: string } | null;
            entra: { success: boolean; error?: string } | null;
            ad: { success: boolean; error?: string } | null;
        };
    }> {
        const res = await fetch(`${this.baseUrl}/api/devices/remove-all`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify({ ...credentials, device })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Invalidate cache
     */
    async refresh(): Promise<{ status: string }> {
        const res = await fetch(`${this.baseUrl}/api/devices/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Fetch deleted devices from Entra ID (last X days)
     */
    async fetchDeletedDevices(credentials: Pick<DeviceCredentials, 'tenantId' | 'appId' | 'vaultName' | 'secretName'>, daysBack = 7): Promise<DeletedDevicesResponse> {
        const res = await fetch(`${this.baseUrl}/api/devices/deleted`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify({ ...credentials, daysBack })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Fetch AD Organizational Units
     */
    async fetchOUs(credentials: DeviceCredentials, parentDN?: string): Promise<{
        status: string;
        ous: Array<{
            name: string;
            dn: string;
            children: any[];
            isExpanded: boolean;
            isLoading: boolean;
        }>;
    }> {
        const res = await fetch(`${this.baseUrl}/api/devices/ous`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify({ ...credentials, parentDN })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Bulk disable devices across selected systems
     */
    async bulkDisableDevices(
        credentials: DeviceCredentials,
        devices: Device[],
        systems: string[]
    ): Promise<{
        status: string;
        results: Array<{
            deviceName: string;
            systems: {
                entra?: { success: boolean; error?: string };
                intune?: { success: boolean; error?: string };
                ad?: { success: boolean; error?: string };
            };
        }>;
        totalDevices: number;
        totalSystems: number;
    }> {
        const res = await fetch(`${this.baseUrl}/api/devices/bulk-disable`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify({ ...credentials, devices, systems })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Bulk delete devices from selected systems
     */
    async bulkDeleteDevices(
        credentials: DeviceCredentials,
        devices: Device[],
        systems: string[]
    ): Promise<{
        status: string;
        results: Array<{
            deviceName: string;
            systems: {
                entra?: { success: boolean; error?: string };
                intune?: { success: boolean; error?: string };
                ad?: { success: boolean; error?: string };
            };
        }>;
        totalDevices: number;
        totalSystems: number;
    }> {
        const res = await fetch(`${this.baseUrl}/api/devices/bulk-delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify({ ...credentials, devices, systems })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }

    /**
     * Bulk move devices to different OU in AD
     */
    async bulkMoveDevices(
        credentials: DeviceCredentials,
        devices: Device[],
        targetOU: string
    ): Promise<{
        status: string;
        results: Array<{
            deviceName: string;
            systems: {
                ad?: { success: boolean; error?: string };
            };
        }>;
        totalDevices: number;
        targetOU: string;
    }> {
        const res = await fetch(`${this.baseUrl}/api/devices/bulk-move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hyperion-Key': GATEWAY_SECRET
            },
            body: JSON.stringify({ ...credentials, devices, targetOU })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        return res.json();
    }
}

export const deviceApi = new DeviceApiService();
export default deviceApi;
