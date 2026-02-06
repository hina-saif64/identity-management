/**
 * 🔒 HYPERION AUTHENTICATION CORE - LOCKED MODULE
 * Version: 1.0.0-LOCKED
 * Last Modified: January 2, 2026
 * Status: PRODUCTION READY - DO NOT MODIFY
 */

import { AUTH_CONFIG, AUTH_ERRORS } from './auth-config.js';
import { sessionManager } from './auth-sessions.js';

/**
 * Security handshake middleware
 */
export const authMiddleware = (req, res, next) => {
    const clientKey = req.headers['x-hyperion-key'];
    
    if (clientKey !== AUTH_CONFIG.GATEWAY_SECRET) {
        console.warn(`[AUTH-SECURITY] Handshake rejection from ${req.ip}`);
        return res.status(401).json({ 
            error: 'Security Handshake Failed', 
            detail: AUTH_ERRORS.HANDSHAKE_FAILED,
            module: 'Auth-Core'
        });
    }
    
    next();
};

/**
 * Session validation middleware
 */
export const requireSession = (sessionType = null) => {
    return (req, res, next) => {
        const { sessionId } = req.body;
        
        if (!sessionId) {
            return res.status(401).json({
                error: 'Session Required',
                detail: AUTH_ERRORS.SESSION_EXPIRED,
                module: 'Auth-Core'
            });
        }
        
        const session = sessionManager.get(sessionId);
        if (!session) {
            return res.status(401).json({
                error: 'Invalid Session',
                detail: AUTH_ERRORS.SESSION_EXPIRED,
                module: 'Auth-Core'
            });
        }
        
        // Check session type if specified
        if (sessionType && session.type !== sessionType) {
            return res.status(403).json({
                error: 'Invalid Session Type',
                detail: `Expected ${sessionType} session, got ${session.type}`,
                module: 'Auth-Core'
            });
        }
        
        // Attach session to request
        req.session = session;
        next();
    };
};

/**
 * Rate limiting middleware (basic implementation)
 */
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute

export const rateLimit = (req, res, next) => {
    const clientIP = req.ip;
    const now = Date.now();
    
    if (!rateLimitMap.has(clientIP)) {
        rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return next();
    }
    
    const clientData = rateLimitMap.get(clientIP);
    
    if (now > clientData.resetTime) {
        // Reset window
        clientData.count = 1;
        clientData.resetTime = now + RATE_LIMIT_WINDOW;
        return next();
    }
    
    if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
            error: 'Rate Limit Exceeded',
            detail: 'Too many requests. Please try again later.',
            module: 'Auth-Core'
        });
    }
    
    clientData.count++;
    next();
};

/**
 * Error handler for authentication errors
 */
export const authErrorHandler = (error, req, res, next) => {
    console.error('[AUTH-ERROR]', error);
    
    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    res.status(500).json({
        error: 'Authentication Error',
        detail: isDevelopment ? error.message : 'Internal authentication error',
        module: 'Auth-Core'
    });
};

/**
 * Health check for authentication system
 */
export const authHealthCheck = () => {
    return {
        status: 'healthy',
        activeSessions: sessionManager.getActiveCount(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    };
};

// Export authentication core
export const authCore = {
    middleware: authMiddleware,
    requireSession,
    rateLimit,
    errorHandler: authErrorHandler,
    healthCheck: authHealthCheck
};