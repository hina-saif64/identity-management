/**
 * HYPERION TERMINAL SERVICE - Embedded PowerShell Terminal
 * Provides in-browser PowerShell execution for Exchange Online authentication
 */
import { runPs } from './gateway-core.js';
import { spawn } from 'child_process';

/**
 * Run PowerShell command with correct version for Exchange Online
 */
const runPsWithCorrectVersion = (command, useWindowsPowerShell = false) => {
    const psCommand = useWindowsPowerShell ? 'powershell' : 'pwsh';
    
    return new Promise((resolve) => {
        const ps = spawn(psCommand, ['-NoProfile', '-NonInteractive', '-Command', command]);

        let stdout = '';
        let stderr = '';
        const startTime = Date.now();

        ps.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ps.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ps.on('close', (code) => {
            const duration = Date.now() - startTime;

            if (code === 0) {
                resolve({
                    status: "success",
                    output: stdout.trim(),
                    duration
                });
            } else {
                resolve({
                    status: "error",
                    output: stdout.trim(),
                    detail: stderr.trim() || `Process exited with code ${code}`,
                    duration
                });
            }
        });
    });
};
const runPsInteractive = (command, timeoutMs = 120000, useWindowsPowerShell = false) => {
    return new Promise((resolve) => {
        const psCommand = useWindowsPowerShell ? 'powershell' : 'pwsh';
        const ps = spawn(psCommand, ['-NoProfile', '-Command', '-']);

        let stdout = '';
        let stderr = '';
        const startTime = Date.now();
        let isResolved = false;

        const timeout = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                ps.kill();
                resolve({
                    status: "success", // Don't treat timeout as error for interactive commands
                    output: "Interactive authentication in progress. Please complete authentication in the browser window.",
                    duration: Date.now() - startTime
                });
            }
        }, timeoutMs);

        ps.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        ps.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ps.on('close', (code) => {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                const duration = Date.now() - startTime;

                resolve({
                    status: "success", // Interactive commands are considered successful if they start
                    output: stdout.trim() || "Interactive command executed. Authentication may be in progress.",
                    error: stderr.trim(),
                    duration
                });
            }
        });

        ps.stdin.write(command);
        ps.stdin.end();
    });
};

/**
 * Execute PowerShell command from embedded terminal
 */
export const executeTerminalCommand = async (req, res) => {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
        return res.status(400).json({
            status: 'error',
            error: 'Invalid command',
            detail: 'Command must be a non-empty string'
        });
    }

    console.log(`[TERMINAL] Executing: ${command}`);

    try {
        // Security: Allow PowerShell commands for Exchange Online and general administration
        const allowedCommands = [
            'Connect-ExchangeOnline',
            'Get-ConnectionInformation',
            'Get-OrganizationConfig',
            'Disconnect-ExchangeOnline',
            'Search-UnifiedAuditLog',
            'Get-Mailbox',
            'Get-User',
            'Get-MsolUser',
            'Get-AzureADUser',
            'help',
            'Get-Help',
            'Get-Module',
            'Import-Module',
            'Get-Command',
            'hostname',
            'whoami',
            'Get-Date',
            'Get-Location',
            'pwd',
            'ls',
            'dir',
            'Get-ChildItem'
        ];

        const isAllowed = allowedCommands.some(allowed => 
            command.toLowerCase().includes(allowed.toLowerCase())
        );

        if (!isAllowed) {
            console.log(`[TERMINAL] Command blocked: ${command}`);
            return res.status(403).json({
                status: 'error',
                error: 'Command not allowed',
                detail: 'Only Exchange Online related commands are permitted'
            });
        }

        console.log(`[TERMINAL] Command allowed: ${command}`);

        // Auto-import ExchangeOnlineManagement module if needed
        let finalCommand = command;
        let useWindowsPowerShell = false;
        
        if (command.toLowerCase().includes('connect-exchangeonline') || 
            command.toLowerCase().includes('get-connectioninformation') ||
            command.toLowerCase().includes('get-organizationconfig') ||
            command.toLowerCase().includes('search-unifiedauditlog')) {
            
            // For Exchange Online commands, use Windows PowerShell and import the module
            useWindowsPowerShell = true;
            finalCommand = `
                try {
                    Import-Module ExchangeOnlineManagement -Force -ErrorAction Stop
                    Write-Host "ExchangeOnlineManagement module loaded successfully"
                } catch {
                    Write-Host "Warning: Could not load ExchangeOnlineManagement module: $($_.Exception.Message)"
                }
                ${command}
            `;
        }

        // Special handling for Import-Module ExchangeOnlineManagement
        if (command.toLowerCase().includes('import-module exchangeonlinemanagement')) {
            console.log(`[TERMINAL] Module import command detected: ${command}`);
            
            // Use Windows PowerShell for Exchange Online module
            const result = await runPsWithCorrectVersion(command, true);
            
            console.log(`[TERMINAL] Module import result: ${result.status}`);
            
            if (result.status === 'success') {
                res.json({
                    status: 'success',
                    output: result.output || 'ExchangeOnlineManagement module imported successfully (Windows PowerShell)',
                    command: command
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    error: 'Module import failed',
                    detail: result.detail || result.output || 'Failed to import ExchangeOnlineManagement module'
                });
            }
            return;
        }
        if (command.toLowerCase().includes('connect-exchangeonline')) {
            console.log(`[TERMINAL] Interactive command detected: ${command}`);
            
            // Use Windows PowerShell for Exchange Online commands
            const fullCommand = `Import-Module ExchangeOnlineManagement -Force; ${command}`;
            const result = await runPsInteractive(fullCommand, 120000, true); // Use Windows PowerShell
            
            console.log(`[TERMINAL] Interactive result status: ${result.status}`);
            
            if (result.status === 'success') {
                res.json({
                    status: 'success',
                    output: result.output || 'Connect-ExchangeOnline executed. Check connection status.',
                    command: command,
                    interactive: true
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    error: 'Interactive command failed',
                    detail: result.detail || result.output || 'Command timed out or failed'
                });
            }
            return;
        }

        // Execute regular commands
        const result = useWindowsPowerShell ? 
            await runPsWithCorrectVersion(finalCommand, true) : 
            await runPs(finalCommand);

        console.log(`[TERMINAL] Result status: ${result.status}`);
        if (result.status !== 'success') {
            console.log(`[TERMINAL] Error detail: ${result.detail}`);
        }

        if (result.status === 'success') {
            res.json({
                status: 'success',
                output: result.output || '',
                command: command
            });
        } else {
            res.status(500).json({
                status: 'error',
                error: 'Command execution failed',
                detail: result.detail || result.output || 'Unknown error'
            });
        }

    } catch (error) {
        console.error('[TERMINAL] Execution error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Terminal execution failed',
            detail: error.message
        });
    }
};

/**
 * Get available PowerShell commands for terminal
 */
export const getTerminalCommands = async (req, res) => {
    const commands = [
        {
            command: 'Connect-ExchangeOnline',
            description: 'Connect to Exchange Online with interactive authentication',
            example: 'Connect-ExchangeOnline -ShowBanner:$false'
        },
        {
            command: 'Get-ConnectionInformation',
            description: 'Display current Exchange Online connection information',
            example: 'Get-ConnectionInformation'
        },
        {
            command: 'Get-OrganizationConfig',
            description: 'Get Exchange Online organization configuration',
            example: 'Get-OrganizationConfig | Select-Object DisplayName'
        },
        {
            command: 'Import-Module ExchangeOnlineManagement',
            description: 'Import Exchange Online PowerShell module',
            example: 'Import-Module ExchangeOnlineManagement -Force'
        },
        {
            command: 'Disconnect-ExchangeOnline',
            description: 'Disconnect from Exchange Online',
            example: 'Disconnect-ExchangeOnline -Confirm:$false'
        }
    ];

    res.json({
        status: 'success',
        commands: commands
    });
};

/**
 * Interactive PowerShell session for complex authentication flows
 */
export const startInteractiveSession = async (req, res) => {
    console.log('[TERMINAL] Starting interactive PowerShell session...');

    try {
        // Start PowerShell process for interactive session
        const ps = spawn('pwsh', ['-NoProfile', '-Interactive'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });

        let output = '';
        let isConnected = false;

        // Handle stdout
        ps.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('[TERMINAL-OUT]', text);
            
            // Check for connection success indicators
            if (text.includes('Connected to Exchange Online') || 
                text.includes('Successfully connected')) {
                isConnected = true;
            }
        });

        // Handle stderr
        ps.stderr.on('data', (data) => {
            const text = data.toString();
            output += `ERROR: ${text}`;
            console.log('[TERMINAL-ERR]', text);
        });

        // Send Connect-ExchangeOnline command
        ps.stdin.write('Import-Module ExchangeOnlineManagement -Force\n');
        ps.stdin.write('Connect-ExchangeOnline -ShowBanner:$false\n');

        // Wait for authentication to complete (timeout after 2 minutes)
        setTimeout(() => {
            if (isConnected) {
                // Test the connection
                ps.stdin.write('Get-ConnectionInformation | Select-Object -First 1 | ConvertTo-Json\n');
                ps.stdin.write('exit\n');
            } else {
                ps.kill();
                res.status(408).json({
                    status: 'error',
                    error: 'Authentication timeout',
                    detail: 'Interactive authentication timed out after 2 minutes'
                });
            }
        }, 120000); // 2 minutes

        // Handle process completion
        ps.on('close', (code) => {
            if (isConnected) {
                res.json({
                    status: 'success',
                    output: output,
                    connected: true,
                    message: 'Exchange Online session established'
                });
            } else {
                res.status(500).json({
                    status: 'error',
                    error: 'Authentication failed',
                    detail: output
                });
            }
        });

    } catch (error) {
        console.error('[TERMINAL] Interactive session error:', error);
        res.status(500).json({
            status: 'error',
            error: 'Failed to start interactive session',
            detail: error.message
        });
    }
};