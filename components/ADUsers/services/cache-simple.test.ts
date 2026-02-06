import { describe, it, expect } from 'vitest';
import { TTLCacheImpl } from './TTLCache';

describe('TTL Cache Simple Test', () => {
    it('should create cache and store values', () => {
        const cache = new TTLCacheImpl(1000, 100);
        
        cache.set('test', 'value');
        expect(cache.get('test')).toBe('value');
        expect(cache.has('test')).toBe(true);
        expect(cache.size()).toBe(1);
        
        cache.destroy();
    });
});