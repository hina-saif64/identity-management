
/**
 * RetryManager - Handles retry logic with exponential backoff for API calls
 * Label: RETRY-MANAGER
 */

interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffFactor: number;
    shouldRetry?: (error: any) => boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffFactor: 2,
    shouldRetry: (error: any) => {
        // Retry on network errors or 5xx server errors
        // Don't retry on 4xx client errors (except 429 Too Many Requests)
        const msg = error?.message?.toLowerCase() || '';
        const status = error?.response?.status || error?.status;

        if (status === 429) return true;
        if (status >= 500) return true;
        if (msg.includes('network') || msg.includes('timeout') || msg.includes('connection')) return true;

        return false;
    }
};

export class RetryManager {
    private config: RetryConfig;

    constructor(config: Partial<RetryConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Executes an async operation with retry logic
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        context: string = 'Operation'
    ): Promise<T> {
        let lastError: any;
        let attempt = 0;
        let delay = this.config.initialDelayMs;

        while (attempt <= this.config.maxRetries) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                attempt++;

                if (attempt > this.config.maxRetries) {
                    break;
                }

                if (this.config.shouldRetry && !this.config.shouldRetry(error)) {
                    console.warn(`[RetryManager] ${context}: Error not retryable: ${error.message}`);
                    throw error;
                }

                console.warn(`[RetryManager] ${context}: Attempt ${attempt} failed. Retrying in ${delay}ms... Error: ${error.message}`);

                await this.delay(delay);
                delay = Math.min(delay * this.config.backoffFactor, this.config.maxDelayMs);
            }
        }

        console.error(`[RetryManager] ${context}: Failed after ${this.config.maxRetries} attempts.`);
        throw lastError;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
