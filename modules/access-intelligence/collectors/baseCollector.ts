import { EnhancedUser } from '../models/enhancedUser.js';

export interface IUserCollector {
    fetchUsers(credentials: any): Promise<any[]>;
}

export class TTLCache<T> {
    private cache = new Map<string, { data: T; expires: number }>();

    constructor(private ttlMs: number) { }

    set(key: string, data: T): void {
        this.cache.set(key, {
            data,
            expires: Date.now() + this.ttlMs
        });
    }

    get(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    clear(): void {
        this.cache.clear();
    }
}
