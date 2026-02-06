/**
 * Unified Device Inventory - Cache
 * In-memory cache with TTL for device data
 */

import { CACHE_TTL } from './device.constants.js';

const cache = new Map();

export const deviceCache = {
    get: (key) => {
        const cached = cache.get(key);
        if (!cached) return null;

        if (Date.now() > cached.expiry) {
            cache.delete(key);
            return null;
        }

        return cached.data;
    },

    set: (key, data, ttl = CACHE_TTL.DEVICES) => {
        cache.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    },

    invalidate: (key) => {
        cache.delete(key);
    },

    invalidateAll: () => {
        cache.clear();
    },

    has: (key) => {
        const cached = cache.get(key);
        if (!cached) return false;
        if (Date.now() > cached.expiry) {
            cache.delete(key);
            return false;
        }
        return true;
    }
};

export default deviceCache;
