import { IUserCollector } from './baseCollector.js';
import { runPs, strictSanitize, sessions } from '../../../gateway-core.js';

const PS_PREAMBLE = `
    $ProgressPreference = 'SilentlyContinue'
    try { 
        Import-Module ActiveDirectory -Force -DisableNameChecking -ErrorAction Stop 
    } catch { 
        return "FAIL_ENV: ActiveDirectory PowerShell module (RSAT) missing or could not be loaded on host." 
    }
`;

export class ADUserCollector implements IUserCollector {
    async fetchUsers(credentials: { sessionId: string; filters?: any }): Promise<any[]> {
        const { sessionId, filters } = credentials;

        // We reuse the session logic from gateway-ad style
        // Note: In a real module, we might want to dependency inject the session details
        // but here we will read from global sessions if available or expect full creds.
        // Assuming sessionId is valid and active in the simplified gateway

        const session = sessions.get(sessionId);
        if (!session) {
            throw new Error("Session Expired or Invalid");
        }

        const s = strictSanitize(session.server);
        const u = (session.username || "").replace(/'/g, "''");
        const p = (session.password || "").replace(/'/g, "''");

        const psLogic = `
            $ProgressPreference = 'SilentlyContinue'
            $params = @{}
            if ('${s}') { $params['Server'] = '${s}' }
            if ('${u}') {
                $netCred = New-Object System.Net.NetworkCredential('${u}', '${p}')
                $params['Credential'] = New-Object System.Management.Automation.PSCredential('${u}', $netCred.SecurePassword)
            }
        `;

        // Simplified fetch logic for AD users (1000 limit for safety in demo)
        const cmd = `
            ${PS_PREAMBLE}
            ${psLogic}
            
            $searcher = [ADSISearcher]"(&(objectClass=user)(objectCategory=person))"
            $searcher.PageSize = 1000
            $searcher.SizeLimit = 1000
            $searcher.PropertiesToLoad.AddRange(@('displayname','samaccountname','useraccountcontrol','department','distinguishedname','lastlogon','pwdlastset','userprincipalname','mail','whencreated'))
            
            try {
                $results = $searcher.FindAll()
                
                $users = foreach ($result in $results) {
                    $props = $result.Properties
                    $uac = if ($props['useraccountcontrol']) { $props['useraccountcontrol'][0] } else { 0 }
                    $enabled = -not ($uac -band 2)
                    
                    $lastLogon = 'Never'
                    if ($props['lastlogon'] -and $props['lastlogon'][0]) {
                        try { $lastLogon = [DateTime]::FromFileTime([long]$props['lastlogon'][0]).ToString('yyyy-MM-dd') } catch {}
                    }
                    
                    $pwdSet = 'Never'
                    if ($props['pwdlastset'] -and $props['pwdlastset'][0]) {
                        try { $pwdSet = [DateTime]::FromFileTime([long]$props['pwdlastset'][0]).ToString('yyyy-MM-dd') } catch {}
                    }
                    
                     $created = ''
                    if ($props['whencreated'] -and $props['whencreated'][0]) {
                         try { $created = ([DateTime]$props['whencreated'][0]).ToString('yyyy-MM-dd') } catch {}
                    }

                    @{
                        id = if ($props['distinguishedname']) { $props['distinguishedname'][0] } else { '' }
                        name = if ($props['displayname']) { $props['displayname'][0] } elseif ($props['samaccountname']) { $props['samaccountname'][0] } else { '' }
                        samAccountName = if ($props['samaccountname']) { $props['samaccountname'][0] } else { '' }
                        userPrincipalName = if ($props['userprincipalname']) { $props['userprincipalname'][0] } else { '' }
                        email = if ($props['mail']) { $props['mail'][0] } elseif ($props['userprincipalname']) { $props['userprincipalname'][0] } else { '' }
                        status = if ($enabled) { 'Active' } else { 'Disabled' }
                        department = if ($props['department']) { $props['department'][0] } else { '' }
                        distinguishedName = if ($props['distinguishedname']) { $props['distinguishedname'][0] } else { '' }
                        lastLogin = $lastLogon
                        lastPasswordSet = $pwdSet
                        created = $created
                    }
                }
                
                $users | ConvertTo-Json -Compress -Depth 3
            } catch {
                @{ error = $_.Exception.Message } | ConvertTo-Json -Compress
            }
        `;

        const result = await runPs(cmd);
        if (result.status === 'success') {
            try {
                const parsed = JSON.parse(result.output);
                if (parsed.error) throw new Error(parsed.error);
                return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
            } catch (e) {
                if (result.output.trim() === '') return []; // No users found
                throw new Error("Failed to parse AD output: " + e.message);
            }
        } else {
            throw new Error(result.error || result.detail || "AD Fetch Failed");
        }
    }
}
