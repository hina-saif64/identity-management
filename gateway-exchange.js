import { runPs } from './gateway-core.js';

/**
 * Fetch Exchange Online Mailboxes
 * Uses Get-EXOMailbox via PowerShell
 */
export const fetchMailboxes = async (req, res) => {
    const { tenantId, appId, organization, certificateThumbprint, accessToken, clientSecret } = req.body;

    // We prioritize Certificate based auth or AccessToken if provided.
    // However, Get-EXOMailbox requires a PS Session.
    // If we have an AccessToken for Graph, we can't use it for EXO PowerShell easily without 'Connect-ExchangeOnline -AccessToken'.
    // EXO V2 module supports -AccessToken.

    // Logic: 
    // 1. If certificate provided -> Connect-ExchangeOnline -CertificateThumbprint
    // 2. If accessToken provided -> Connect-ExchangeOnline -AccessToken (Requires specific scopes)
    // 3. If clientSecret provided -> Connect-ExchangeOnline -CommandName (Not directly supported without SecureString, cumbersome in Node)

    // Simplest: Certificate or AccessToken.

    try {
        let authCommand = '';
        if (certificateThumbprint) {
            authCommand = `Connect-ExchangeOnline -AppId '${appId}' -Organization '${organization}' -CertificateThumbprint '${certificateThumbprint}' -ShowBanner:$false -ErrorAction Stop`;
        } else if (accessToken) {
            // Note: AccessToken auth for EXO requires specific setup. 
            // Often easiest to just failover to Graph API if we only have token.
            // But this function is for "ExchangeUserCollector".
            // If the collector sends a token (it does), we try to use it.
            // Connect-ExchangeOnline -AccessToken ...
            authCommand = `Connect-ExchangeOnline -Organization '${organization}' -AccessToken '${accessToken}' -ShowBanner:$false -ErrorAction Stop`;
        } else {
            // Fallback or error
            throw new Error("Missing valid credentials (Certificate or AccessToken) for Exchange PowerShell");
        }

        const psScript = `
            $ProgressPreference = 'SilentlyContinue'
            try {
                Import-Module ExchangeOnlineManagement -Force -ErrorAction SilentlyContinue
                ${authCommand}
                
                $mailboxes = Get-EXOMailbox -ResultSize 1000 -Properties DisplayName,UserPrincipalName,PrimarySmtpAddress,RecipientTypeDetails,WhenCreated,ForwardingSmtpAddress,DeliverToMailboxAndForward,ArchiveStatus,LitigationHoldEnabled
                
                $results = foreach ($mbx in $mailboxes) {
                    @{
                        userPrincipalName = $mbx.UserPrincipalName
                        displayName = $mbx.DisplayName
                        primarySmtpAddress = $mbx.PrimarySmtpAddress
                        recipientType = $mbx.RecipientTypeDetails.ToString()
                        totalItemSize = $null
                        whenCreated = $mbx.WhenCreated.ToString('o')
                        forwardingSmtpAddress = $mbx.ForwardingSmtpAddress
                        deliverToMailboxAndForward = $mbx.DeliverToMailboxAndForward
                        archiveStatus = $mbx.ArchiveStatus.ToString()
                        litigationHoldEnabled = $mbx.LitigationHoldEnabled
                        lastLogonTime = $null
                    }
                }
                
                # Debug output (Removed in production)
                # Write-Host "Collected $($results.Count) mailboxes"
                
                @{ mailboxes = $results; count = $results.Count } | ConvertTo-Json -Compress -Depth 2
            } catch {
                @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
            }
        `;

        const result = await runPs(psScript);

        if (result.status === 'success') {
            try {
                const parsed = JSON.parse(result.output);
                if (parsed.error) throw new Error(parsed.error);

                console.log(`📧 Exchange fetched ${parsed.mailboxes?.length} mailboxes`);
                if (parsed.mailboxes?.length > 0) {
                    const withLogon = parsed.mailboxes.filter(m => m.lastLogonTime).length;
                    console.log(`📧 Mailboxes with LastLogonTime: ${withLogon}`);
                    // Log first one for debug
                    console.log('Sample Mailbox:', JSON.stringify(parsed.mailboxes[0]));
                }

                res.json(parsed);
            } catch (e) {
                // Fallback: Return empty list if parsing fails (graceful degradation)
                console.warn("Exchange Mailbox Parse Error:", e);
                res.json({ mailboxes: [] });
            }
        } else {
            throw new Error(result.error || "PowerShell Failed");
        }
    } catch (e) {
        console.error("Fetch Mailboxes Failed:", e.message);
        res.status(500).json({ error: e.message });
    }
};

/**
 * Fetch Exchange Activity (Stub/Proxy)
 * Real activity fetching is slow via Search-UnifiedAuditLog.
 * We will implement a lightweight version or reuse PowerBI logic if applicable.
 */
export const fetchActivities = async (req, res) => {
    // User "ExchangeUserCollector" expects /api/exchange/activities
    // We return empty for now to speed up standard loading, as Audit Logs are heavy.
    // Implementing fully would require reusing the logic in gateway-powerbi.js

    // Required stub for frontend to work:
    res.json({ activities: [] });
};
