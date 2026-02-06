/**
 * Unified Device Inventory - Controller
 * HTTP request handlers for device endpoints
 */

import { deviceLogger } from './device.logger.js';
import {
    fetchAllDevices,
    getSummary,
    disableDevice,
    disableAllStaleDevices,
    removeFromAllSystems,
    invalidateCache,
    fetchDeletedDevices as fetchDeletedDevicesService
} from './device.service.js';

/**
 * POST /api/devices/fetch
 * Fetch all devices from all sources
 */
export const fetchDevices = async (req, res) => {
    try {
        const { tenantId, appId, vaultName, secretName, adServer, adSessionId } = req.body;

        // Validate cloud credentials
        if (!tenantId || !appId || !vaultName || !secretName) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing cloud credentials'
            });
        }

        const cloudCredentials = { tenantId, appId, vaultName, secretName };

        // AD credentials - use session if available
        const adCredentials = adServer && adSessionId
            ? { server: adServer, sessionId: adSessionId }
            : null;

        deviceLogger.info('Fetching devices from all sources');

        const result = await fetchAllDevices(cloudCredentials, adCredentials);

        res.json({
            status: 'success',
            devices: result.devices,
            summary: result.summary,
            errors: result.errors,
            fetchedAt: result.fetchedAt
        });

    } catch (err) {
        deviceLogger.error('Fetch devices failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to fetch devices',
            detail: err.message
        });
    }
};

/**
 * POST /api/devices/summary
 * Get device summary statistics only (for dashboard)
 */
export const getDeviceSummary = async (req, res) => {
    try {
        const { tenantId, appId, vaultName, secretName, adServer, adUsername, adPassword } = req.body;

        if (!tenantId || !appId || !vaultName || !secretName) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing cloud credentials'
            });
        }

        const cloudCredentials = { tenantId, appId, vaultName, secretName };
        const adCredentials = adServer && adUsername && adPassword
            ? { server: adServer, username: adUsername, password: adPassword }
            : null;

        const summary = await getSummary(cloudCredentials, adCredentials);

        res.json({
            status: 'success',
            summary
        });

    } catch (err) {
        deviceLogger.error('Get summary failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to get summary',
            detail: err.message
        });
    }
};

/**
 * POST /api/devices/disable
 * Disable a device in AD
 */
export const disableDeviceInAd = async (req, res) => {
    try {
        const { adServer, adUsername, adPassword, distinguishedName } = req.body;

        if (!adServer || !adUsername || !adPassword || !distinguishedName) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing AD credentials or device DN'
            });
        }

        const adCredentials = { server: adServer, username: adUsername, password: adPassword };

        deviceLogger.info(`Disabling device: ${distinguishedName}`);
        await disableDevice(adCredentials, distinguishedName);

        res.json({
            status: 'success',
            message: 'Device disabled in AD'
        });

    } catch (err) {
        deviceLogger.error('Disable device failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to disable device',
            detail: err.message
        });
    }
};

/**
 * POST /api/devices/disable-stale
 * Disable all stale devices in AD
 */
export const disableStaleDevices = async (req, res) => {
    try {
        const { tenantId, appId, vaultName, secretName, adServer, adUsername, adPassword } = req.body;

        if (!tenantId || !adServer || !adUsername || !adPassword) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing credentials'
            });
        }

        const cloudCredentials = { tenantId, appId, vaultName, secretName };
        const adCredentials = { server: adServer, username: adUsername, password: adPassword };

        deviceLogger.info('Disabling all stale devices');
        const results = await disableAllStaleDevices(cloudCredentials, adCredentials);

        res.json({
            status: 'success',
            results,
            total: results.length,
            success: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        });

    } catch (err) {
        deviceLogger.error('Disable stale devices failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to disable stale devices',
            detail: err.message
        });
    }
};

/**
 * POST /api/devices/remove-all
 * Remove device from all systems (composite action)
 */
export const removeDeviceFromAll = async (req, res) => {
    try {
        const { tenantId, appId, vaultName, secretName, adServer, adUsername, adPassword, device } = req.body;

        if (!tenantId || !device) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing credentials or device'
            });
        }

        const cloudCredentials = { tenantId, appId, vaultName, secretName };
        const adCredentials = adServer && adUsername && adPassword
            ? { server: adServer, username: adUsername, password: adPassword }
            : null;

        deviceLogger.info(`Removing device from all systems: ${device.displayName}`);
        const results = await removeFromAllSystems(cloudCredentials, adCredentials, device);

        res.json({
            status: 'success',
            results
        });

    } catch (err) {
        deviceLogger.error('Remove from all failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to remove device',
            detail: err.message
        });
    }
};

/**
 * POST /api/devices/refresh
 * Invalidate cache and force refetch
 */
export const refreshDevices = async (req, res) => {
    try {
        invalidateCache();
        res.json({
            status: 'success',
            message: 'Cache invalidated'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            error: err.message
        });
    }
};

/**
 * POST /api/devices/deleted
 * Fetch deleted devices from Entra ID (last X days)
 */
export const fetchDeletedDevices = async (req, res) => {
    try {
        const { tenantId, appId, vaultName, secretName, daysBack = 7 } = req.body;

        // Validate cloud credentials
        if (!tenantId || !appId || !vaultName || !secretName) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing cloud credentials'
            });
        }

        const cloudCredentials = { tenantId, appId, vaultName, secretName };

        deviceLogger.info(`Fetching deleted devices (last ${daysBack} days)`);

        const result = await fetchDeletedDevicesService(cloudCredentials, daysBack);

        res.json({
            status: 'success',
            devices: result.devices,
            count: result.count,
            daysBack: result.daysBack,
            errors: result.errors,
            fetchedAt: result.fetchedAt
        });

    } catch (err) {
        deviceLogger.error('Fetch deleted devices failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to fetch deleted devices',
            detail: err.message
        });
    }
};

/**
 * POST /api/devices/ous
 * Fetch AD Organizational Units for device move operations
 */
export const fetchOUs = async (req, res) => {
    try {
        const { adServer, adUsername, adPassword, adSessionId, parentDN } = req.body;

        if (!adServer || (!adSessionId && (!adUsername || !adPassword))) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing AD credentials'
            });
        }

        // Use session if available, otherwise username/password
        const adCredentials = adSessionId 
            ? { server: adServer, sessionId: adSessionId }
            : { server: adServer, username: adUsername, password: adPassword };

        deviceLogger.info(`Fetching OUs${parentDN ? ` under ${parentDN}` : ' (root level)'}`);
        
        const { fetchAdOUs } = await import('./device.ad.js');
        const ous = await fetchAdOUs(adCredentials, parentDN);

        res.json({
            status: 'success',
            ous
        });

    } catch (err) {
        deviceLogger.error('Fetch OUs failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to fetch OUs',
            detail: err.message
        });
    }
};

/**
 * POST /api/devices/bulk-disable
 * Disable multiple devices across selected systems
 */
export const bulkDisableDevices = async (req, res) => {
    try {
        const { tenantId, appId, vaultName, secretName, adServer, adUsername, adPassword, adSessionId, devices, systems } = req.body;

        if (!devices || !Array.isArray(devices) || devices.length === 0) {
            return res.status(400).json({
                status: 'error',
                error: 'No devices provided'
            });
        }

        if (!systems || !Array.isArray(systems) || systems.length === 0) {
            return res.status(400).json({
                status: 'error',
                error: 'No systems selected'
            });
        }

        const cloudCredentials = tenantId ? { tenantId, appId, vaultName, secretName } : null;
        
        // Use session if available, otherwise username/password
        const adCredentials = adServer && (adSessionId || (adUsername && adPassword))
            ? adSessionId 
                ? { server: adServer, sessionId: adSessionId }
                : { server: adServer, username: adUsername, password: adPassword }
            : null;

        deviceLogger.info(`Bulk disabling ${devices.length} devices across systems: ${systems.join(', ')}`);

        const { bulkDisableDevicesService } = await import('./device.service.js');
        const results = await bulkDisableDevicesService(cloudCredentials, adCredentials, devices, systems);

        res.json({
            status: 'success',
            results,
            totalDevices: devices.length,
            totalSystems: systems.length
        });

    } catch (err) {
        deviceLogger.error('Bulk disable failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to disable devices',
            detail: err.message
        });
    }
};

/**
 * POST /api/devices/bulk-delete
 * Delete multiple devices from selected systems
 */
export const bulkDeleteDevices = async (req, res) => {
    try {
        const { tenantId, appId, vaultName, secretName, adServer, adUsername, adPassword, adSessionId, devices, systems } = req.body;

        if (!devices || !Array.isArray(devices) || devices.length === 0) {
            return res.status(400).json({
                status: 'error',
                error: 'No devices provided'
            });
        }

        if (!systems || !Array.isArray(systems) || systems.length === 0) {
            return res.status(400).json({
                status: 'error',
                error: 'No systems selected'
            });
        }

        const cloudCredentials = tenantId ? { tenantId, appId, vaultName, secretName } : null;
        
        // Use session if available, otherwise username/password
        const adCredentials = adServer && (adSessionId || (adUsername && adPassword))
            ? adSessionId 
                ? { server: adServer, sessionId: adSessionId }
                : { server: adServer, username: adUsername, password: adPassword }
            : null;

        deviceLogger.info(`Bulk deleting ${devices.length} devices from systems: ${systems.join(', ')}`);

        const { bulkDeleteDevicesService } = await import('./device.service.js');
        const results = await bulkDeleteDevicesService(cloudCredentials, adCredentials, devices, systems);

        res.json({
            status: 'success',
            results,
            totalDevices: devices.length,
            totalSystems: systems.length
        });

    } catch (err) {
        deviceLogger.error('Bulk delete failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to delete devices',
            detail: err.message
        });
    }
};

/**
 * POST /api/devices/bulk-move
 * Move multiple devices to a different OU in AD
 */
export const bulkMoveDevices = async (req, res) => {
    try {
        const { adServer, adUsername, adPassword, adSessionId, devices, targetOU } = req.body;

        if (!adServer || (!adSessionId && (!adUsername || !adPassword))) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing AD credentials'
            });
        }

        if (!devices || !Array.isArray(devices) || devices.length === 0) {
            return res.status(400).json({
                status: 'error',
                error: 'No devices provided'
            });
        }

        if (!targetOU) {
            return res.status(400).json({
                status: 'error',
                error: 'Target OU not specified'
            });
        }

        // Use session if available, otherwise username/password
        const adCredentials = adSessionId 
            ? { server: adServer, sessionId: adSessionId }
            : { server: adServer, username: adUsername, password: adPassword };

        deviceLogger.info(`Bulk moving ${devices.length} devices to OU: ${targetOU}`);

        const { bulkMoveDevicesService } = await import('./device.service.js');
        const results = await bulkMoveDevicesService(adCredentials, devices, targetOU);

        res.json({
            status: 'success',
            results,
            totalDevices: devices.length,
            targetOU
        });

    } catch (err) {
        deviceLogger.error('Bulk move failed', err);
        res.status(500).json({
            status: 'error',
            error: 'Failed to move devices',
            detail: err.message
        });
    }
};

export default {
    fetchDevices,
    getDeviceSummary,
    disableDeviceInAd,
    disableStaleDevices,
    removeDeviceFromAll,
    refreshDevices,
    fetchDeletedDevices,
    fetchOUs,
    bulkDisableDevices,
    bulkDeleteDevices,
    bulkMoveDevices
};
