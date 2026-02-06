/**
 * 🔒 HYPERION SESSION MANAGEMENT - LOCKED MODULE
 * Version: 1.0.0-LOCKED
 * Last Modified: January 2, 2026
 * Status: PRODUCTION READY - DO NOT MODIFY
 */

import crypto from 'crypto';
import { AUTH_CONFIG } from './auth-config.js';

// Session storage
const sessions = new Map();
const sessionTimers = new Map();

/**
 * Generate secure session ID
 */
const generateSessionId = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Create new session
 */
export const createSession = (sessionData) => {
    const sessionId = generateSessionId();
    const expiresAt = Date.now() + AUTH_CONFIG.SESSION_TIMEOUT;
    
    const session = {
        id: sessionId,
        ...sessionData,
        createdAt: Date.now(),
        expiresAt,
        lastAccessed: Date.now()
    };
    
    sessions.set(sessionId, session);
    
    // Set cleanup timer
    const timer = setTimeout(() => {
        destroySession(sessionId);
    }, AUTH_CONFIG.SESSION_TIMEOUT);
    
    sessionTimers.set(sessionId, timer);
    
    return sessionId;
};

/**
 * Get session by ID
 */
export const getSession = (sessionId) => {
    if (!sessionId || typeof sessionId !== 'string') {
        return null;
    }
    
    const session = sessions.get(sessionId);
    if (!session) {
        return null;
    }
    
    // Check if expired
    if (Date.now() > session.expiresAt) {
        destroySession(sessionId);
        return null;
    }
    
    // Update last accessed
    session.lastAccessed = Date.now();
    sessions.set(sessionId, session);
    
    return session;
};

/**
 * Update session data
 */
export const updateSession = (sessionId, updateData) => {
    const session = getSession(sessionId);
    if (!session) {
        return false;
    }
    
    const updatedSession = {
        ...session,
        ...updateData,
        lastAccessed: Date.now()
    };
    
    sessions.set(sessionId, updatedSession);
    return true;
};

/**
 * Destroy session
 */
export const destroySession = (sessionId) => {
    if (sessions.has(sessionId)) {
        sessions.delete(sessionId);
    }
    
    if (sessionTimers.has(sessionId)) {
        clearTimeout(sessionTimers.get(sessionId));
        sessionTimers.delete(sessionId);
    }
    
    return true;
};

/**
 * Validate session exists and is active
 */
export const validateSession = (sessionId) => {
    const session = getSession(sessionId);
    return session !== null;
};

/**
 * Get all active sessions (for debugging)
 */
export const getActiveSessions = () => {
    return Array.from(sessions.keys()).length;
};

/**
 * Cleanup expired sessions
 */
export const cleanupExpiredSessions = () => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            destroySession(sessionId);
            cleanedCount++;
        }
    }
    
    return cleanedCount;
};

// Periodic cleanup
setInterval(() => {
    const cleaned = cleanupExpiredSessions();
    if (cleaned > 0) {
        console.log(`[AUTH] Cleaned up ${cleaned} expired sessions`);
    }
}, AUTH_CONFIG.SESSION_CLEANUP_INTERVAL);

// Export session management object
export const sessionManager = {
    create: createSession,
    get: getSession,
    update: updateSession,
    destroy: destroySession,
    validate: validateSession,
    getActiveCount: getActiveSessions,
    cleanup: cleanupExpiredSessions
};