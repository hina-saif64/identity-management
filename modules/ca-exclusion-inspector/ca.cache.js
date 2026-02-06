/**
 * CA Exclusion Inspector - Server-side Cache
 * Simple in-memory cache with TTL
 */

import { CACHE_DURATION } from './ca.constants.js';

class CaCache {
    constructor() {
        this.store = new Map();
    }

    /**
     * Get cached value if not expired
     */
    get(key) {
        const item = this.store.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.store.delete(key);
            return null;
        }

        return item.value;
    }

    /**
     * Set value with TTL
     */
    set(key, value, ttlMs = CACHE_DURATION.POLICIES) {
        this.store.set(key, {
            value,
            expiry: Date.now() + ttlMs,
            cached: new Date().toISOString()
        });
    }

    /**
     * Invalidate specific key
     */
    invalidate(key) {
        this.store.delete(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.store.clear();
    }

    /**
     * Get cache stats
     */
    stats() {
        return {
            size: this.store.size,
            keys: Array.from(this.store.keys())
        };
    }
}

// Singleton instance
export const caCache = new CaCache();
export default caCache;
