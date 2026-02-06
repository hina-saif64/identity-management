/**
 * Unified Device Inventory - Express Routes
 * Route definitions only - no business logic here
 */

import express from 'express';
import {
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
} from './device.controller.js';

const router = express.Router();

/**
 * POST /api/devices/fetch
 * Fetch all devices from Entra, Intune, and AD
 */
router.post('/fetch', fetchDevices);

/**
 * POST /api/devices/summary
 * Get device summary statistics
 */
router.post('/summary', getDeviceSummary);

/**
 * POST /api/devices/disable
 * Disable a device in AD
 */
router.post('/disable', disableDeviceInAd);

/**
 * POST /api/devices/disable-stale
 * Disable all stale devices in AD
 */
router.post('/disable-stale', disableStaleDevices);

/**
 * POST /api/devices/remove-all
 * Remove device from all systems
 */
router.post('/remove-all', removeDeviceFromAll);

/**
 * POST /api/devices/refresh
 * Invalidate cache
 */
router.post('/refresh', refreshDevices);

/**
 * POST /api/devices/deleted
 * Fetch deleted devices from Entra ID (last X days)
 */
router.post('/deleted', fetchDeletedDevices);

/**
 * POST /api/devices/ous
 * Fetch AD Organizational Units
 */
router.post('/ous', fetchOUs);

/**
 * POST /api/devices/bulk-disable
 * Disable multiple devices across selected systems
 */
router.post('/bulk-disable', bulkDisableDevices);

/**
 * POST /api/devices/bulk-delete
 * Delete multiple devices from selected systems
 */
router.post('/bulk-delete', bulkDeleteDevices);

/**
 * POST /api/devices/bulk-move
 * Move multiple devices to different OU in AD
 */
router.post('/bulk-move', bulkMoveDevices);

export default router;
