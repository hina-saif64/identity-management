// Custom Hook: Debounce
// Label: AD-HOOK-DEBOUNCE

import { useState, useEffect } from 'react';

/**
 * Debounces a value by specified delay
 * 
 * @param {T} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {T} Debounced value
 * 
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 300);
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
