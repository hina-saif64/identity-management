/**
 * CA Exclusion Inspector - Module Logger
 * Isolated logging for this module only
 */

const MODULE_PREFIX = '[CA-EXCLUSION]';

export const caLogger = {
    info: (message, data = null) => {
        console.log(`${MODULE_PREFIX} ${message}`, data ? data : '');
    },

    error: (message, error = null) => {
        console.error(`${MODULE_PREFIX} ERROR: ${message}`, error ? error : '');
    },

    warn: (message, data = null) => {
        console.warn(`${MODULE_PREFIX} WARN: ${message}`, data ? data : '');
    },

    debug: (message, data = null) => {
        if (process.env.DEBUG_CA_MODULE) {
            console.log(`${MODULE_PREFIX} DEBUG: ${message}`, data ? data : '');
        }
    },

    audit: (action, details) => {
        // Audit log entry for write actions
        const entry = {
            timestamp: new Date().toISOString(),
            module: 'CA-EXCLUSION',
            action,
            ...details
        };
        console.log(`${MODULE_PREFIX} AUDIT:`, JSON.stringify(entry));
        return entry;
    }
};

export default caLogger;
