
import { describe, test, expect, vi } from 'vitest';
import fc from 'fast-check';
import { RetryManager } from '../../../components/ADUsers/services/RetryManager';

describe('RetryManager Properties', () => {

    test('Property 19: Retries temporary failures up to limit', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 3 }), // Number of failures (less than max retries which is 5 here)
                async (failures) => {
                    const manager = new RetryManager({
                        maxRetries: 5,
                        initialDelayMs: 1, // Fast for tests
                        backoffFactor: 1,
                        shouldRetry: () => true // Always retry for this test
                    });

                    let callCount = 0;
                    const operation = vi.fn().mockImplementation(async () => {
                        callCount++;
                        if (callCount <= failures) {
                            throw new Error('Temporary failure');
                        }
                        return 'success';
                    });

                    const result = await manager.executeWithRetry(operation);

                    expect(result).toBe('success');
                    expect(callCount).toBe(failures + 1); // Failures + 1 success
                }
            )
        );
    });

    test('Property 20: Fails after exceeding max retries', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 5 }), // Max retries
                async (maxRetries) => {
                    const manager = new RetryManager({
                        maxRetries,
                        initialDelayMs: 1,
                        backoffFactor: 1,
                        shouldRetry: () => true // Always retry to test max retries
                    });

                    let callCount = 0;
                    const operation = vi.fn().mockImplementation(async () => {
                        callCount++;
                        throw new Error('Permanent failure');
                    });

                    await expect(manager.executeWithRetry(operation)).rejects.toThrow('Permanent failure');

                    // Initial call + maxRetries
                    expect(callCount).toBe(maxRetries + 1);
                }
            )
        );
    });

    test('Property 21: Respects non-retryable errors', async () => {
        const manager = new RetryManager({
            maxRetries: 3,
            initialDelayMs: 1,
            shouldRetry: (err) => err.message !== 'Fatal'
        });

        let callCount = 0;
        const operation = vi.fn().mockImplementation(async () => {
            callCount++;
            throw new Error('Fatal');
        });

        await expect(manager.executeWithRetry(operation)).rejects.toThrow('Fatal');
        expect(callCount).toBe(1); // Should not retry
    });

});
