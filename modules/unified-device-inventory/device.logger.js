/**
 * Unified Device Inventory - Logger
 * Module-scoped logging for device operations
 */

const MODULE_PREFIX = '[DEVICE-INVENTORY]';

export const deviceLogger = {
    info: (message, data = null) => {
        console.log(`${MODULE_PREFIX} ${message}`, data || '');
    },

    error: (message, error = null) => {
        console.error(`${MODULE_PREFIX} ERROR: ${message}`, error || '');
    },

    warn: (message, data = null) => {
        console.warn(`${MODULE_PREFIX} WARN: ${message}`, data || '');
    },

    debug: (message, data = null) => {
        if (process.env.DEBUG_DEVICE_MODULE) {
            console.log(`${MODULE_PREFIX} DEBUG: ${message}`, data || '');
        }
    },

    progress: (current, total, source) => {
        const percent = Math.round((current / total) * 100);
        console.log(`${MODULE_PREFIX} [${source}] Progress: ${current}/${total} (${percent}%)`);
    },

    audit: (action, details) => {
        const entry = {
            timestamp: new Date().toISOString(),
            module: 'DEVICE-INVENTORY',
            action,
            ...details
        };
        console.log(`${MODULE_PREFIX} AUDIT:`, JSON.stringify(entry));
        return entry;
    }
};

export default deviceLogger;
