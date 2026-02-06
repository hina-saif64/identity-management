/**
 * HYPERION POWERBI SERVICE - Windows PowerShell 5.1 Implementation
 */
import { spawn } from 'child_process';

// PowerShell executor for Windows PowerShell 5.1
const runWindowsPowerShell = (script, timeoutMs = 60000) => {
    return new Promise((resolve) => {
        const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]);
        let stdout = '', stderr = '';

        const timeout = setTimeout(() => {
            ps.kill();
            resolve({ status: 'error', error: 'TIMEOUT', detail: `Timeout after ${timeoutMs}ms` });
        }, timeoutMs);

        ps.stdout.on('data', (data) => stdout += data.toString());
        ps.stderr.on('data', (data) => stderr += data.toString());
        
        ps.on('close', (code) => {
            clearTimeout(timeout);
            resolve(code === 0 ? 
                { status: 'success', output: stdout.trim() } : 
                { status: 'error', error: 'POWERSHELL_ERROR', detail: stderr.trim() || stdout.trim() }
            );
        });
    });
};

/**
 * Test Exchange Online connection status
 */
const testExchangeOnlineConnection = async (req, res) => {
    const testScript = `
        try {
            $connection = Get-ConnectionInformation -ErrorAction Stop | Select-Object -First 1
            if ($connection) {
                @{ status = 'success'; connected = $true; organization = $connection.Name } | ConvertTo-Json -Compress
            } else {
                @{ status = 'success'; connected = $false } | ConvertTo-Json -Compress
            }
        } catch {
            @{ status = 'success'; connected = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runWindowsPowerShell(testScript, 30000);
        if (result.status === 'success') {
            const connectionResult = JSON.parse(result.output);
            res.json(connectionResult);
        } else {
            res.json({ status: 'success', connected: false, error: result.detail });
        }
    } catch (error) {
        res.json({ status: 'success', connected: false, error: error.message });
    }
};

/**
 * Connect to Exchange Online using app-only authentication
 */
const connectExchangeOnlineAppOnly = async (req, res) => {
    const { appId, tenantId, certificateThumbprint } = req.body;

    if (!appId || !tenantId || !certificateThumbprint) {
        return res.status(400).json({
            status: 'error',
            error: 'MISSING_PARAMETERS',
            detail: 'App ID, Tenant ID, and Certificate Thumbprint are required'
        });
    }

    const authScript = `
        try {
            Import-Module ExchangeOnlineManagement -Force -ErrorAction Stop
            Connect-ExchangeOnline -AppId '${appId}' -CertificateThumbprint '${certificateThumbprint}' -Organization '${tenantId}' -ShowBanner:$false -ErrorAction Stop
            
            $connectionInfo = Get-ConnectionInformation -ErrorAction Stop | Select-Object -First 1
            if ($connectionInfo) {
                @{
                    status = 'success'
                    organization = $connectionInfo.Name
                    connectionId = $connectionInfo.ConnectionId
                    connectedAt = (Get-Date).ToString('o')
                } | ConvertTo-Json -Compress
            } else {
                throw "Connection verification failed"
            }
        } catch {
            @{ status = 'error'; error = 'EXO_AUTH_FAILED'; detail = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runWindowsPowerShell(authScript, 60000);
        if (result.status === 'success') {
            const authResult = JSON.parse(result.output);
            res.json(authResult);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'CONNECTION_FAILED', detail: error.message });
    }
};

/**
 * Fetch PowerBI usage data from Exchange Online audit logs
 */
const fetchPowerBIUsageAppOnly = async (req, res) => {
    const { daysBack = 90 } = req.body;

    const auditScript = `
        try {
            $connection = Get-ConnectionInformation -ErrorAction Stop | Select-Object -First 1
            if (-not $connection) { throw "Not connected to Exchange Online" }
            
            $StartDate = (Get-Date).AddDays(-${daysBack})
            $EndDate = Get-Date
            $AuditLogs = Search-UnifiedAuditLog -StartDate $StartDate -EndDate $EndDate -RecordType PowerBIAudit -ResultSize 5000 -ErrorAction Stop
            
            if (-not $AuditLogs) {
                @{
                    status = 'success'; data = @(); summary = @{ totalRecords = 0; uniqueUsers = 0 }
                    message = 'No PowerBI audit data found'
                } | ConvertTo-Json -Compress -Depth 3
            } else {
                $ProcessedLogs = $AuditLogs | ForEach-Object {
                    @{ userIds = $_.UserIds; operations = $_.Operations; creationDate = $_.CreationDate.ToString('o'); clientIP = $_.ClientIP }
                }
                @{
                    status = 'success'; data = @($ProcessedLogs)
                    summary = @{ totalRecords = $AuditLogs.Count; uniqueUsers = ($AuditLogs | Select-Object -ExpandProperty UserIds -Unique).Count }
                } | ConvertTo-Json -Compress -Depth 3
            }
        } catch {
            @{ status = 'error'; error = 'AUDIT_FETCH_FAILED'; detail = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const result = await runWindowsPowerShell(auditScript, 120000);
        if (result.status === 'success') {
            const auditResult = JSON.parse(result.output);
            res.json(auditResult);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        res.status(500).json({ status: 'error', error: 'FETCH_FAILED', detail: error.message });
    }
};

export { testExchangeOnlineConnection, connectExchangeOnlineAppOnly, fetchPowerBIUsageAppOnly };