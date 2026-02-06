// Base Collector Implementation
// Label: BASE-COLLECTOR

import type { 
    IUserCollector, 
    CollectorHealthStatus, 
    RetryConfig, 
    CircuitBreakerState 
} from '../types/enhanced.types';
import { RETRY_CONFIG, CIRCUIT_BREAKER_CONFIG } from '../constants/enhanced.constants';

export abstract class BaseCollector<TCredentials, TUser> implements IUserCollector<TCredentials, TUser> {
    protected circuitBreaker: CircuitBreakerState = {
        isOpen: false,
        failureCount: 0
    };
    
    protected retryConfig: RetryConfig = RETRY_CONFIG;
    protected lastHealthCheck?: Date;
    protected lastError?: string;
    protected lastResponseTime?: number;

    abstract fetchUsers(credentials: TCredentials): Promise<TUser[]>;
    abstract validateCredentials(credentials: TCredentials): Promise<boolean>;
    abstract getSourceName(): string;

    async getHealthStatus(): Promise<CollectorHealthStatus> {
        return {
            isHealthy: !this.circuitBreaker.isOpen,
            lastSuccessfulFetch: this.lastHealthCheck,
            lastError: this.lastError,
            responseTime: this.lastResponseTime
        };
    }

    protected async executeWithRetry<T>(
        operation: () => Promise<T>,
        context: string = 'operation'
    ): Promise<T> {
        if (this.circuitBreaker.isOpen) {
            if (this.shouldAttemptRecovery()) {
                this.circuitBreaker.isOpen = false;
                this.circuitBreaker.failureCount = 0;
            } else {
                throw new Error(`Circuit breaker is open for ${this.getSourceName()}`);
            }
        }

        let lastError: Error | null = null;
        const startTime = performance.now();

        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const result = await operation();
                
                // Success - reset circuit breaker
                this.circuitBreaker.failureCount = 0;
                this.circuitBreaker.isOpen = false;
                this.lastHealthCheck = new Date();
                this.lastError = undefined;
                this.lastResponseTime = performance.now() - startTime;
                
                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                this.lastError = lastError.message;
                
                console.warn(`${this.getSourceName()} ${context} attempt ${attempt} failed:`, lastError.message);
                
                if (this.isRetryableError(lastError) && attempt < this.retryConfig.maxRetries) {
                    const delay = this.calculateBackoffDelay(attempt);
                    await this.delay(delay);
                    continue;
                }
                
                // Final failure - update circuit breaker
                this.circuitBreaker.failureCount++;
                if (this.circuitBreaker.failureCount >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
                    this.circuitBreaker.isOpen = true;
                    this.circuitBreaker.lastFailureTime = new Date();
                    this.circuitBreaker.nextAttemptTime = new Date(
                        Date.now() + CIRCUIT_BREAKER_CONFIG.RECOVERY_TIMEOUT
                    );
                }
                
                break;
            }
        }

        throw lastError || new Error(`${context} failed after ${this.retryConfig.maxRetries} attempts`);
    }

    protected isRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        const retryablePatterns = [
            'network',
            'timeout',
            'connection',
            'temporary',
            'rate limit',
            'throttle',
            'service unavailable',
            'internal server error'
        ];
        
        return retryablePatterns.some(pattern => message.includes(pattern));
    }

    protected calculateBackoffDelay(attempt: number): number {
        const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        return delay + jitter;
    }

    protected delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    protected shouldAttemptRecovery(): boolean {
        if (!this.circuitBreaker.nextAttemptTime) return false;
        return Date.now() >= this.circuitBreaker.nextAttemptTime.getTime();
    }

    protected generateCacheKey(credentials: TCredentials, suffix: string = ''): string {
        // Create a cache key based on credentials (without sensitive data)
        const source = this.getSourceName();
        const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)); // 5-minute buckets
        return `${source}_${timestamp}${suffix ? '_' + suffix : ''}`;
    }

    protected logOperation(operation: string, duration: number, success: boolean, details?: any): void {
        const logLevel = success ? 'info' : 'error';
        const message = `${this.getSourceName()} ${operation} ${success ? 'completed' : 'failed'} in ${duration}ms`;
        
        if (success) {
            console.log(message, details);
        } else {
            console.error(message, details);
        }
    }

    // Helper method to validate common credential fields
    protected validateCommonCredentials(credentials: any, requiredFields: string[]): boolean {
        if (!credentials || typeof credentials !== 'object') {
            return false;
        }

        return requiredFields.every(field => {
            const value = credentials[field];
            return value !== undefined && value !== null && value !== '';
        });
    }

    // Helper method to sanitize credentials for logging
    protected sanitizeCredentials(credentials: any): any {
        if (!credentials) return {};
        
        const sanitized = { ...credentials };
        const sensitiveFields = ['password', 'secret', 'token', 'key', 'thumbprint'];
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '***';
            }
        });
        
        return sanitized;
    }
}