// TTL Cache Implementation for Multi-Source Data
// Label: TTL-CACHE

import type { TTLCache } from '../types/enhanced.types';

interface CacheEntry<T> {
    value: T;
    expiry: number;
    created: number;
}

export class TTLCacheImpl<T> implements TTLCache<T> {
    private cache = new Map<string, CacheEntry<T>>();
    private defaultTTL: number;
    private maxSize: number;
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(defaultTTL: number = 15 * 60 * 1000, maxSize: number = 1000) {
        this.defaultTTL = defaultTTL;
        this.maxSize = maxSize;
        this.startCleanupTimer();
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }

        const now = Date.now();
        if (now > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    set(key: string, value: T, ttl?: number): void {
        const now = Date.now();
        const actualTTL = ttl ?? this.defaultTTL;
        
        // Enforce max size by removing oldest entries
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }

        this.cache.set(key, {
            value,
            expiry: now + actualTTL,
            created: now
        });
    }

    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    size(): number {
        return this.cache.size;
    }

    // Get cache statistics
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        let totalSize = 0;

        this.cache.forEach((entry, key) => {
            totalSize++;
            if (now > entry.expiry) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        });

        return {
            totalEntries: totalSize,
            validEntries,
            expiredEntries,
            hitRate: this.calculateHitRate(),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    // Calculate hit rate (simplified)
    private hitRate = 0;
    private hits = 0;
    private misses = 0;

    private calculateHitRate(): number {
        const total = this.hits + this.misses;
        return total > 0 ? this.hits / total : 0;
    }

    private estimateMemoryUsage(): number {
        // Rough estimation of memory usage in bytes
        return this.cache.size * 1024; // Assume 1KB per entry on average
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Date.now();

        this.cache.forEach((entry, key) => {
            if (entry.created < oldestTime) {
                oldestTime = entry.created;
                oldestKey = key;
            }
        });

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    private startCleanupTimer(): void {
        // Clean up expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    private cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        this.cache.forEach((entry, key) => {
            if (now > entry.expiry) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    // Destroy cache and cleanup resources
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.clear();
    }

    // Get all valid keys
    getValidKeys(): string[] {
        const now = Date.now();
        const validKeys: string[] = [];

        this.cache.forEach((entry, key) => {
            if (now <= entry.expiry) {
                validKeys.push(key);
            }
        });

        return validKeys;
    }

    // Check if key exists and is valid
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        const now = Date.now();
        if (now > entry.expiry) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    // Get remaining TTL for a key
    getRemainingTTL(key: string): number {
        const entry = this.cache.get(key);
        if (!entry) return -1;
        
        const now = Date.now();
        if (now > entry.expiry) {
            this.cache.delete(key);
            return -1;
        }
        
        return entry.expiry - now;
    }
}

// Global cache instance for user data persistence
export const userDataCache = new TTLCacheImpl(30 * 60 * 1000); // 30 minutes TTL for persistence across tabs