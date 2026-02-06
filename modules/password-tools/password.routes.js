/**
 * HYPERION PASSWORD TOOLS ROUTES
 * Express router for password management endpoints
 * 
 * Note: validateHandshake middleware is applied at mount point in server.js
 */

import express from 'express';
import { handleVerifyPassword, handleGetPasswordInfo, handleGeneratePassword } from './password.controller.js';

const router = express.Router();

// POST /api/password/verify - Verify domain credentials
router.post('/verify', handleVerifyPassword);

// POST /api/password/info - Get password info for user
router.post('/info', handleGetPasswordInfo);

// POST /api/password/generate - Generate secure password
router.post('/generate', handleGeneratePassword);

// GET /api/password/test - Test password tools performance (development only)
router.get('/test', async (req, res) => {
    try {
        const startTime = Date.now();
        
        // Test DirectoryServices loading
        const testScript = `
            $ErrorActionPreference = 'Stop'
            try {
                $start = Get-Date
                Add-Type -AssemblyName System.DirectoryServices.AccountManagement
                $context = New-Object System.DirectoryServices.AccountManagement.PrincipalContext([System.DirectoryServices.AccountManagement.ContextType]::Domain)
                $context.Dispose()
                $end = Get-Date
                $duration = ($end - $start).TotalMilliseconds
                '{"status":"success","message":"DirectoryServices loaded successfully","duration":' + $duration + '}'
            } catch {
                '{"status":"error","error":"' + $_.Exception.Message.Replace('"', '\"') + '"}'
            }
        `;
        
        const { runPs } = await import('../../gateway-core.js');
        const result = await runPs(testScript, {});
        
        const totalTime = Date.now() - startTime;
        
        if (result.status === 'error') {
            return res.json({
                status: 'error',
                error: result.detail || result.error,
                totalTime
            });
        }
        
        const psResult = JSON.parse(result.output);
        res.json({
            ...psResult,
            totalTime,
            optimized: true
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            totalTime: Date.now() - Date.now()
        });
    }
});

export default router;
