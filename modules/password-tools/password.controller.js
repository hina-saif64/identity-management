/**
 * HYPERION PASSWORD TOOLS CONTROLLER
 * Express request handlers for password operations
 * 
 * Uses existing Universal Connection session for AD authentication
 */

import { sessions } from '../../gateway-core.js';
import { verifyPassword, getPasswordInfo, generatePassword } from './password.service.js';

/**
 * POST /api/password/verify
 * Verify domain user credentials
 */
export const handleVerifyPassword = async (req, res) => {
    const { sessionId, targetUsername, targetPassword } = req.body;

    if (!sessionId) {
        return res.status(401).json({
            status: 'error',
            error: 'NOT_CONNECTED',
            detail: 'Please connect via Universal Authentication first'
        });
    }

    if (!targetUsername || !targetPassword) {
        return res.status(400).json({
            status: 'error',
            error: 'MISSING_PARAMS',
            detail: 'Username and password are required'
        });
    }

    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(401).json({
            status: 'error',
            error: 'SESSION_EXPIRED',
            detail: 'Session expired, please reconnect'
        });
    }

    try {
        const result = await verifyPassword(
            session.server,
            targetUsername,
            targetPassword,
            {
                server: session.server,
                username: session.username,
                password: session.password
            }
        );

        // Never return the password in response
        res.json({
            status: result.status || 'success',
            valid: result.valid,
            message: result.message || (result.valid ? 'Credentials are valid' : 'Invalid credentials'),
            error: result.error
        });
    } catch (error) {
        console.error('[PASSWORD-TOOLS] Verify error:', error.message);
        res.status(500).json({
            status: 'error',
            error: 'VERIFICATION_FAILED',
            detail: error.message
        });
    }
};

/**
 * POST /api/password/info
 * Get password information for a domain user
 */
export const handleGetPasswordInfo = async (req, res) => {
    const { sessionId, targetUsername } = req.body;

    if (!sessionId) {
        return res.status(401).json({
            status: 'error',
            error: 'NOT_CONNECTED',
            detail: 'Please connect via Universal Authentication first'
        });
    }

    if (!targetUsername) {
        return res.status(400).json({
            status: 'error',
            error: 'MISSING_PARAMS',
            detail: 'Username is required'
        });
    }

    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(401).json({
            status: 'error',
            error: 'SESSION_EXPIRED',
            detail: 'Session expired, please reconnect'
        });
    }

    try {
        const result = await getPasswordInfo(targetUsername, {
            server: session.server,
            username: session.username,
            password: session.password
        });

        res.json(result);
    } catch (error) {
        console.error('[PASSWORD-TOOLS] Info error:', error.message);
        console.error('[PASSWORD-TOOLS] Stack trace:', error.stack);
        res.status(500).json({
            status: 'error',
            error: 'INFO_FETCH_FAILED',
            detail: error.message
        });
    }
};

/**
 * POST /api/password/generate
 * Generate a secure password with options
 */
export const handleGeneratePassword = async (req, res) => {
    const { length = 16, useUppercase = true, useLowercase = true, useNumbers = true, useSpecial = true } = req.body;

    try {
        const result = await generatePassword(length, {
            useUppercase,
            useLowercase,
            useNumbers,
            useSpecial
        });

        res.json(result);
    } catch (error) {
        console.error('[PASSWORD-TOOLS] Generate error:', error.message);
        res.status(500).json({
            status: 'error',
            error: 'GENERATION_FAILED',
            detail: error.message
        });
    }
};

export default {
    handleVerifyPassword,
    handleGetPasswordInfo,
    handleGeneratePassword
};
