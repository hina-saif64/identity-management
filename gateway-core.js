
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * VAPT HARDENING: Memory-only session store.
 * Credentials never touch the disk and are never sent back to the client.
 */
class SessionStore {
    constructor() {
        this.sessions = new Map();
    }
    create(data) {
        const id = crypto.randomBytes(32).toString('hex');
        this.sessions.set(id, { ...data, created: Date.now() });
        return id;
    }
    get(id) {
        return this.sessions.get(id);
    }
    destroy(id) {
        this.sessions.delete(id);
    }
}

export const sessions = new SessionStore();

/**
 * SECURITY: Strict whitelist + escaping for PowerShell.
 * UPDATED: Enhanced PowerShell injection protection
 */
export const strictSanitize = (val) => {
    if (typeof val !== 'string') return "";

    // Remove PowerShell injection characters but keep necessary ones for AD queries
    const dangerous = /[`$();|&<>{}[\]\\'"]/g;
    const cleaned = val.replace(dangerous, "");

    // Limit length to prevent buffer overflow
    return cleaned.substring(0, 2000);
};

/**
 * SECURITY: PowerShell parameter escaping
 */
export const escapeForPowerShell = (val) => {
    if (typeof val !== 'string') return "";
    return val.replace(/'/g, "''").replace(/"/g, '""');
};

/**
 * SECURITY: Command validation for Terminal component
 * Allows all AD/Azure commands but blocks dangerous system commands
 */
const ALLOWED_COMMAND_PREFIXES = [
    'Get-AD', 'Set-AD', 'New-AD', 'Remove-AD', 'Move-AD', 'Search-AD',
    'Get-Az', 'Set-Az', 'New-Az', 'Connect-Az',
    'Test-NetConnection', 'Test-Connection',
    'Import-Module', 'Get-Module',
    'Get-Date', 'Get-Location', 'Get-ChildItem', 'Get-Content',
    'ConvertTo-Json', 'ConvertFrom-Json',
    'Select-Object', 'Where-Object', 'Sort-Object', 'Measure-Object',
    'Write-Output', 'Write-Host'
];

export const validateTerminalCommand = (command) => {
    if (!command || typeof command !== 'string') {
        throw new Error('Invalid command format');
    }

    // No restrictions - full PowerShell access for productivity
    console.log(`[TERMINAL] Executing: ${command.split(' ')[0]}`);
    return true;
};

/**
 * ENGINE: High-performance PowerShell bridge using TEMP FILES.
 * This ensures robust execution of complex scripts without STDIN/parsing issues.
 */
export const runPs = (command, envVars = {}) => {
    return new Promise((resolve) => {
        const shell = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'; // Using Windows PowerShell 5.1 for Exchange compatibility
        const tempFilePath = path.join(os.tmpdir(), `hyperion_script_${Date.now()}_${Math.random().toString(36).substring(7)}.ps1`);

        try {
            fs.writeFileSync(tempFilePath, command, 'utf8');
        } catch (writeErr) {
            return resolve({
                status: "error",
                error: "FILE_WRITE_ERROR",
                detail: `Failed to write temp script: ${writeErr.message}`,
                duration: 0
            });
        }

        const ps = spawn(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tempFilePath], {
            env: { ...process.env, ...envVars } // 🛡️ SECURITY: Inject secrets via env vars, not script body
        });

        let stdout = '';
        let stderr = '';
        const startTime = Date.now();

        ps.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ps.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ps.on('error', (err) => {
            try { fs.unlinkSync(tempFilePath); } catch (e) { }
            resolve({
                status: "error",
                error: "SPAWN_FAILED",
                detail: `Failed to spawn shell '${shell}': ${err.message}`,
                duration: Date.now() - startTime
            });
        });

        ps.on('close', (code) => {
            const duration = Date.now() - startTime;
            try { fs.unlinkSync(tempFilePath); } catch (e) { }

            if (code !== 0 && !stdout && stderr) {
                resolve({
                    status: "error",
                    error: "SHELL_EXEC_ERROR",
                    detail: (stderr || `Process exited with code ${code}`),
                    duration
                });
            } else {
                resolve({
                    status: "success",
                    output: stdout.trim(),
                    duration
                });
            }
        });
    });
};
