/**
 * Unified Cloud + Exchange Authentication Handler
 * Establishes both Microsoft Graph and Exchange Online connections in a single flow
 */
import { cloudAuth } from './auth-system/auth-cloud.js';
import { runPs } from './gateway-core.js';
import { spawn } from 'child_process';

/**
 * Run PowerShell 7 for Exchange Online
 */
const runPwsh7 = (command, timeoutMs = 30000) => {
    return new Promise((resolve) => {
        const ps = spawn('pwsh', ['-NoProfile', '-NonInteractive', '-Command', '-']);

        let stdout = '';
        let stderr = '';
        const startTime = Date.now();
        let isResolved = false;

        const timeout = setTimeout(() => {
            if (!isResolved) {
                isResolved = true;
                ps.kill();
                resolve({
                    status: "error",
                    error: "CONNECTION_TIMEOUT",
                    detail: "Exchange connection timed out after 30 seconds.",
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

                if (code !== 0 && !stdout) {
                    resolve({
                        status: "error",
                        error: "PWSH7_EXEC_ERROR",
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
            }
        });

        ps.stdin.write(command);
        ps.stdin.end();
    });
};

/**
 * Establish Exchange Online session using validated credentials
 */
const connectExchangeWithContext = async (params) => {
    const { tenantId, appId, vaultName, secretName, organization } = params;

    console.log('[UNIFIED-AUTH] Establishing Exchange Online session...');

    const cmd = `
        try {
            Import-Module ExchangeOnlineManagement -Force -ErrorAction Stop
            
            # Check if already connected
            try {
                $testConnection = Get-OrganizationConfig -ErrorAction Stop | Select-Object -First 1
                if ($testConnection) {
                    return @{ 
                        status = 'success'
                        sessionId = 'EXO-Unified-Active'
                        message = 'Exchange Online already connected'
                    } | ConvertTo-Json -Compress
                }
            } catch {
                # Not connected, proceed with connection
            }
            
            # Get client secret from Azure Key Vault
            $clientSecret = Get-AzKeyVaultSecret -VaultName '${vaultName}' -Name '${secretName}' -AsPlainText -ErrorAction Stop
            
            # Connect using app credentials
            $secureSecret = ConvertTo-SecureString $clientSecret -AsPlainText -Force
            $credential = New-Object System.Management.Automation.PSCredential('${appId}', $secureSecret)
            
            Connect-ExchangeOnline -AppId '${appId}' -Organization '${organization}' -Credential $credential -ShowBanner:$false -ErrorAction Stop
            
            # Verify connection
            $testConnection = Get-OrganizationConfig -ErrorAction Stop | Select-Object -First 1
            if ($testConnection) {
                return @{ 
                    status = 'success'
                    sessionId = 'EXO-Unified-Connected'
                    organization = '${organization}'
                    message = 'Exchange Online session established'
                } | ConvertTo-Json -Compress
            } else {
                throw "Failed to verify Exchange Online connection"
            }
        } catch {
            return @{ 
                status = 'error'
                error = 'Exchange connection failed'
                detail = $_.Exception.Message
            } | ConvertTo-Json -Compress
        }
    `;

    const result = await runPwsh7(cmd);

    if (result.status === 'success') {
        try {
            const parsed = JSON.parse(result.output);
            return parsed;
        } catch (e) {
            console.error('[UNIFIED-AUTH] Failed to parse Exchange response:', result.output);
            return { status: 'error', error: 'Invalid response format' };
        }
    } else {
        return result;
    }
};

/**
 * Unified connection handler - establishes both Cloud and Exchange
 */
export const connectUnified = async (req, res) => {
    const { tenantId, appId, vaultName, secretName, organization } = req.body;

    console.log('[UNIFIED-AUTH] Starting unified authentication for:', organization);

    try {
        // Step 1: Cloud Authentication (Graph API)
        console.log('[UNIFIED-AUTH] Step 1: Authenticating with Microsoft Graph...');
        const cloudResult = await cloudAuth.test({
            tenantId,
            appId,
            vaultName,
            secretName,
            organization
        });

        if (!cloudResult.success) {
            throw new Error('Cloud authentication failed');
        }

        console.log('[UNIFIED-AUTH] Step 1: ✓ Graph API authenticated');

        // Step 2: Exchange Online (reuse validated credentials)
        console.log('[UNIFIED-AUTH] Step 2: Establishing Exchange Online session...');
        const exoResult = await connectExchangeWithContext({
            tenantId,
            appId,
            vaultName,
            secretName,
            organization
        });

        const exchangeConnected = exoResult.status === 'success';

        if (exchangeConnected) {
            console.log('[UNIFIED-AUTH] Step 2: ✓ Exchange Online session established');
        } else {
            console.warn('[UNIFIED-AUTH] Step 2: ⚠ Exchange Online connection failed:', exoResult.error);
        }

        // Step 3: Return combined status
        res.json({
            status: 'connected',
            cloud: {
                sessionId: cloudResult.sessionId,
                organization: cloudResult.organization,
                verifiedDomains: cloudResult.verifiedDomains,
                hasManagementAccess: cloudResult.hasManagementAccess
            },
            exchange: {
                connected: exchangeConnected,
                sessionId: exoResult.sessionId || null,
                organization: exoResult.organization || organization,
                error: exchangeConnected ? null : exoResult.error
            },
            mode: 'unified'
        });

    } catch (err) {
        console.error('[UNIFIED-AUTH] Unified connection failed:', err);
        res.status(500).json({
            status: 'error',
            error: 'Unified authentication failed',
            detail: err.message
        });
    }
};
