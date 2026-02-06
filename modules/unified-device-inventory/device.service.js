/**
 * Unified Device Inventory - Service Layer
 * Business logic for device operations
 */

import { deviceLogger } from './device.logger.js';
import { deviceCache } from './device.cache.js';
import { fetchEntraDevices, removeEntraDevice, fetchEntraDeletedDevices } from './device.entra.js';
import { fetchIntuneDevices, removeIntuneDevice } from './device.intune.js';
import { fetchAdDevices, disableAdDevice, deleteAdDevice } from './device.ad.js';
import { fetchDefenderMachines, getDefenderStatus } from './device.defender.js';
import { mergeDevices, calculateSummary } from './device.merger.js';
import { CACHE_TTL } from './device.constants.js';

/**
 * Fetch and merge devices from all sources
 * Progressive loading: returns data as each source completes
 */
export const fetchAllDevices = async (cloudCredentials, adCredentials) => {
    const cacheKey = `devices_${cloudCredentials.tenantId}`;

    // Check cache first
    const cached = deviceCache.get(cacheKey);
    if (cached) {
        deviceLogger.info('Returning cached device data');
        return cached;
    }

    let entraDevices = [];
    let intuneDevices = [];
    let adDevices = [];
    let defenderMachineMap = new Map();
    const errors = [];

    // Fetch from all sources in parallel
    // NOTE: Defender fetch disabled - requires WindowsDefenderATP API permission configured correctly
    const results = await Promise.allSettled([
        fetchEntraDevices(cloudCredentials),
        fetchIntuneDevices(cloudCredentials),
        adCredentials ? fetchAdDevices(adCredentials) : Promise.resolve({ devices: [], count: 0 }),
        // fetchDefenderMachines(cloudCredentials) // Disabled - 400 error, need to debug permissions
        Promise.resolve({ machines: [], machineMap: new Map(), count: 0 }) // Placeholder
    ]);

    // Process results
    if (results[0].status === 'fulfilled' && !results[0].value.error) {
        entraDevices = results[0].value.devices;
        deviceLogger.info(`Entra: ${entraDevices.length} devices`);
    } else {
        const err = results[0].status === 'rejected'
            ? results[0].reason.message
            : results[0].value.error;
        errors.push({ source: 'entra', error: err });
        deviceLogger.error('Entra fetch failed', err);
    }

    if (results[1].status === 'fulfilled' && !results[1].value.error) {
        intuneDevices = results[1].value.devices;
        deviceLogger.info(`Intune: ${intuneDevices.length} devices`);
    } else {
        const err = results[1].status === 'rejected'
            ? results[1].reason.message
            : results[1].value.error;
        errors.push({ source: 'intune', error: err });
        deviceLogger.error('Intune fetch failed', err);
    }

    if (results[2].status === 'fulfilled' && !results[2].value.error) {
        adDevices = results[2].value.devices;
        deviceLogger.info(`AD: ${adDevices.length} devices`);
    } else if (adCredentials) {
        const err = results[2].status === 'rejected'
            ? results[2].reason.message
            : results[2].value.error;
        errors.push({ source: 'ad', error: err });
        deviceLogger.error('AD fetch failed', err);
    }

    // Process Defender results
    if (results[3].status === 'fulfilled' && !results[3].value.error) {
        defenderMachineMap = results[3].value.machineMap || new Map();
        deviceLogger.info(`Defender: ${results[3].value.count} machines`);
    } else {
        const err = results[3].status === 'rejected'
            ? results[3].reason?.message
            : results[3].value?.error;
        if (err) {
            errors.push({ source: 'defender', error: err });
            deviceLogger.error('Defender fetch failed', err);
        }
    }

    // Merge all devices
    const devices = mergeDevices(entraDevices, intuneDevices, adDevices);

    // Add Defender status to each device
    for (const device of devices) {
        device.defenderStatus = getDefenderStatus(device.displayName, defenderMachineMap);
    }

    const summary = calculateSummary(devices);

    const result = {
        devices,
        summary,
        errors: errors.length > 0 ? errors : null,
        fetchedAt: new Date().toISOString()
    };

    // Cache the result
    deviceCache.set(cacheKey, result, CACHE_TTL.DEVICES);

    return result;
};

/**
 * Get cached summary only (for dashboard)
 */
export const getSummary = async (cloudCredentials, adCredentials) => {
    const cacheKey = `devices_${cloudCredentials.tenantId}`;
    const cached = deviceCache.get(cacheKey);

    if (cached) {
        return cached.summary;
    }

    // Fetch if not cached
    const result = await fetchAllDevices(cloudCredentials, adCredentials);
    return result.summary;
};

/**
 * Disable a device in AD
 */
export const disableDevice = async (adCredentials, distinguishedName) => {
    const result = await disableAdDevice(adCredentials, distinguishedName);

    // Invalidate cache
    deviceCache.invalidateAll();

    return result;
};

/**
 * Disable all stale devices in AD
 */
export const disableAllStaleDevices = async (cloudCredentials, adCredentials) => {
    const cacheKey = `devices_${cloudCredentials.tenantId}`;
    const cached = deviceCache.get(cacheKey);

    if (!cached) {
        throw new Error('No cached device data. Fetch devices first.');
    }

    const staleDevices = cached.devices.filter(d =>
        d.healthStatus === 'Stale' &&
        d.ad &&
        d.adEnabled !== false
    );

    deviceLogger.audit('DISABLE_ALL_STALE_START', { count: staleDevices.length });

    const results = [];
    for (const device of staleDevices) {
        try {
            await disableAdDevice(adCredentials, device.adDistinguishedName);
            results.push({ device: device.displayName, success: true });
        } catch (err) {
            results.push({ device: device.displayName, success: false, error: err.message });
        }
    }

    // Invalidate cache
    deviceCache.invalidateAll();

    deviceLogger.audit('DISABLE_ALL_STALE_COMPLETE', {
        total: staleDevices.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
    });

    return results;
};

/**
 * Remove device from all systems (composite action)
 * Order: Intune → Entra → AD (each failure isolated)
 */
export const removeFromAllSystems = async (cloudCredentials, adCredentials, device) => {
    const results = {
        intune: null,
        entra: null,
        ad: null
    };

    deviceLogger.audit('REMOVE_ALL_START', { deviceName: device.displayName });

    // Step 1: Remove from Intune
    if (device.intuneId) {
        try {
            await removeIntuneDevice(cloudCredentials, device.intuneId);
            results.intune = { success: true };
        } catch (err) {
            results.intune = { success: false, error: err.message };
        }
    }

    // Step 2: Remove from Entra
    if (device.entraId) {
        try {
            await removeEntraDevice(cloudCredentials, device.entraId);
            results.entra = { success: true };
        } catch (err) {
            results.entra = { success: false, error: err.message };
        }
    }

    // Step 3: Delete from AD
    if (device.adDistinguishedName && adCredentials) {
        try {
            await deleteAdDevice(adCredentials, device.adDistinguishedName);
            results.ad = { success: true };
        } catch (err) {
            results.ad = { success: false, error: err.message };
        }
    }

    // Invalidate cache
    deviceCache.invalidateAll();

    deviceLogger.audit('REMOVE_ALL_COMPLETE', {
        deviceName: device.displayName,
        results
    });

    return results;
};

/**
 * Fetch deleted devices from Entra ID (last X days)
 * Separate endpoint with its own caching
 */
export const fetchDeletedDevices = async (cloudCredentials, daysBack = 7) => {
    const cacheKey = `deleted_devices_${cloudCredentials.tenantId}_${daysBack}d`;

    // Check cache first (shorter TTL for deleted devices)
    const cached = deviceCache.get(cacheKey);
    if (cached) {
        deviceLogger.info(`Returning cached deleted device data (${daysBack} days)`);
        return cached;
    }

    deviceLogger.info(`Fetching deleted devices (last ${daysBack} days)...`);

    try {
        const deletedResult = await fetchEntraDeletedDevices(cloudCredentials, daysBack);

        const result = {
            devices: deletedResult.devices,
            count: deletedResult.count,
            daysBack,
            errors: deletedResult.error ? [{ source: 'entra-deleted', error: deletedResult.error }] : null,
            fetchedAt: new Date().toISOString()
        };

        // Cache for 30 minutes (shorter than regular devices)
        deviceCache.set(cacheKey, result, CACHE_TTL.DEVICES / 2);

        return result;
    } catch (err) {
        deviceLogger.error('Fetch deleted devices error', err);
        return {
            devices: [],
            count: 0,
            daysBack,
            errors: [{ source: 'entra-deleted', error: err.message }],
            fetchedAt: new Date().toISOString()
        };
    }
};

/**
 * Invalidate cache
 */
export const invalidateCache = () => {
    deviceCache.invalidateAll();
    deviceLogger.info('Device cache invalidated');
};

/**
 * Bulk disable devices across multiple systems (OPTIMIZED: Batched AD, Parallel Cloud)
 */
export const bulkDisableDevicesService = async (cloudCredentials, adCredentials, devices, systems) => {
    deviceLogger.audit('BULK_DISABLE_START', {
        deviceCount: devices.length,
        systems: systems.join(',')
    });

    // --- STEP 1: AD Batch Processing ---
    let adResultsMap = new Map();
    if (systems.includes('ad') && adCredentials) {
        const adDevices = devices.filter(d => d.adDistinguishedName);
        if (adDevices.length > 0) {
            try {
                const { bulkDisableAdDevices } = await import('./device.ad.js');
                const adResults = await bulkDisableAdDevices(adCredentials, adDevices.map(d => d.adDistinguishedName));

                // Map results by DN for easy lookup
                adResults.forEach(r => adResultsMap.set(r.dn, r));
            } catch (err) {
                deviceLogger.error('AD Bulk Disable Failed', err);
                // Mark all as failed if batch fails
                adDevices.forEach(d => adResultsMap.set(d.adDistinguishedName, { success: false, error: err.message }));
            }
        }
    }

    // --- STEP 2: Cloud Processing (Parallel per device) ---
    const processDeviceCloud = async (device) => {
        const result = {
            deviceName: device.displayName,
            systems: {} // Populate below
        };

        // Attach AD result if available
        if (systems.includes('ad') && device.adDistinguishedName) {
            const adRes = adResultsMap.get(device.adDistinguishedName);
            result.systems.ad = adRes ? { success: adRes.success, error: adRes.error } : { success: false, error: 'Not Processed' };
        } else if (systems.includes('ad')) {
            result.systems.ad = { success: false, error: 'Device not in AD' };
        }

        // Parallel Entra/Intune calls
        const cloudPromises = [];

        // Entra
        if (systems.includes('entra') && device.entraId && cloudCredentials) {
            cloudPromises.push((async () => {
                try {
                    const { disableEntraDevice } = await import('./device.entra.js');
                    await disableEntraDevice(cloudCredentials, device.entraId);
                    result.systems.entra = { success: true };
                } catch (err) {
                    result.systems.entra = { success: false, error: err.message };
                }
            })());
        }

        // Intune
        if (systems.includes('intune') && device.intuneId && cloudCredentials) {
            cloudPromises.push((async () => {
                try {
                    const { disableIntuneDevice } = await import('./device.intune.js');
                    await disableIntuneDevice(cloudCredentials, device.intuneId);
                    result.systems.intune = { success: true };
                } catch (err) {
                    result.systems.intune = { success: false, error: err.message };
                }
            })());
        }

        await Promise.allSettled(cloudPromises);
        return result;
    };

    // Execute cloud actions in parallel chunks (concurrency: 10)
    const results = [];
    const chunkSize = 10;
    for (let i = 0; i < devices.length; i += chunkSize) {
        const chunk = devices.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk.map(d => processDeviceCloud(d)));
        results.push(...chunkResults);
    }

    // Invalidate cache
    deviceCache.invalidateAll();

    deviceLogger.audit('BULK_DISABLE_COMPLETE', {
        deviceCount: devices.length,
        systems: systems.join(','),
        successCount: results.filter(r =>
            Object.values(r.systems).every(s => s?.success !== false)
        ).length
    });

    return results;
};

/**
 * Bulk delete devices from multiple systems (OPTIMIZED: Batched AD, Parallel Cloud)
 */
export const bulkDeleteDevicesService = async (cloudCredentials, adCredentials, devices, systems) => {
    deviceLogger.audit('BULK_DELETE_START', {
        deviceCount: devices.length,
        systems: systems.join(',')
    });

    // --- STEP 1: AD Batch Processing ---
    let adResultsMap = new Map();
    if (systems.includes('ad') && adCredentials) {
        const adDevices = devices.filter(d => d.adDistinguishedName);
        if (adDevices.length > 0) {
            try {
                const { bulkDeleteAdDevices } = await import('./device.ad.js');
                const adResults = await bulkDeleteAdDevices(adCredentials, adDevices.map(d => d.adDistinguishedName));
                adResults.forEach(r => adResultsMap.set(r.dn, r));
            } catch (err) {
                deviceLogger.error('AD Bulk Delete Failed', err);
                adDevices.forEach(d => adResultsMap.set(d.adDistinguishedName, { success: false, error: err.message }));
            }
        }
    }

    // --- STEP 2: Cloud Processing (Parallel per device) ---
    const processDeviceCloud = async (device) => {
        const result = {
            deviceName: device.displayName,
            systems: {}
        };

        // Attach AD result
        if (systems.includes('ad') && device.adDistinguishedName) {
            const adRes = adResultsMap.get(device.adDistinguishedName);
            result.systems.ad = adRes ? { success: adRes.success, error: adRes.error } : { success: false, error: 'Not Processed' };
        } else if (systems.includes('ad')) {
            result.systems.ad = { success: false, error: 'Device not in AD' };
        }

        const cloudPromises = [];

        // Entra
        if (systems.includes('entra') && device.entraId && cloudCredentials) {
            cloudPromises.push((async () => {
                try {
                    await removeEntraDevice(cloudCredentials, device.entraId);
                    result.systems.entra = { success: true };
                } catch (err) {
                    result.systems.entra = { success: false, error: err.message };
                }
            })());
        }

        // Intune
        if (systems.includes('intune') && device.intuneId && cloudCredentials) {
            cloudPromises.push((async () => {
                try {
                    await removeIntuneDevice(cloudCredentials, device.intuneId);
                    result.systems.intune = { success: true };
                } catch (err) {
                    result.systems.intune = { success: false, error: err.message };
                }
            })());
        }

        await Promise.allSettled(cloudPromises);
        return result;
    };

    // Execute cloud actions in parallel chunks
    const results = [];
    const chunkSize = 10;
    for (let i = 0; i < devices.length; i += chunkSize) {
        const chunk = devices.slice(i, i + chunkSize);
        const chunkResults = await Promise.all(chunk.map(d => processDeviceCloud(d)));
        results.push(...chunkResults);
    }

    // Invalidate cache
    deviceCache.invalidateAll();

    deviceLogger.audit('BULK_DELETE_COMPLETE', {
        deviceCount: devices.length,
        systems: systems.join(','),
        successCount: results.filter(r =>
            Object.values(r.systems).every(s => s?.success !== false)
        ).length
    });

    return results;
};

/**
 * Bulk move devices to different OU in AD
 */
export const bulkMoveDevicesService = async (adCredentials, devices, targetOU) => {
    const results = [];

    deviceLogger.audit('BULK_MOVE_START', {
        deviceCount: devices.length,
        targetOU
    });

    for (const device of devices) {
        const deviceResult = {
            deviceName: device.displayName,
            systems: {}
        };

        // Move in AD (only if device exists there)
        if (device.adDistinguishedName) {
            try {
                const { moveAdDevice } = await import('./device.ad.js');
                await moveAdDevice(adCredentials, device.adDistinguishedName, targetOU);
                deviceResult.systems.ad = { success: true };
            } catch (err) {
                deviceResult.systems.ad = { success: false, error: err.message };
            }
        } else {
            deviceResult.systems.ad = { success: false, error: 'Device not found in AD' };
        }

        results.push(deviceResult);
    }

    // Invalidate cache
    deviceCache.invalidateAll();

    deviceLogger.audit('BULK_MOVE_COMPLETE', {
        deviceCount: devices.length,
        targetOU,
        successCount: results.filter(r => r.systems.ad?.success).length
    });

    return results;
};

export default {
    fetchAllDevices,
    getSummary,
    disableDevice,
    disableAllStaleDevices,
    removeFromAllSystems,
    invalidateCache,
    fetchDeletedDevices,
    bulkDisableDevicesService,
    bulkDeleteDevicesService,
    bulkMoveDevicesService
};
