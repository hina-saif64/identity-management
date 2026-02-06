import { IUserCollector } from './baseCollector.js';

export class EntraUserCollector implements IUserCollector {
    async fetchUsers(credentials: { accessToken: string }): Promise<any[]> {
        if (!credentials.accessToken) {
            console.warn("EntraUserCollector: No access token provided, skipping.");
            return [];
        }

        try {
            // Fetch users from Graph API
            const response = await fetch("https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,userType,accountEnabled,createdDateTime,department&$top=999", {
                headers: { 'Authorization': 'Bearer ' + credentials.accessToken }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Graph API fetch failed: ${response.status} ${text}`);
            }

            const data = await response.json();

            // Should handle pagination in production, but simplified for now
            let users = data.value || [];

            // Add sign-in activity if possible (requires AuditLog.Read.All and beta endpoint usually, or specific config)
            // For now, we return basic user data which works with UserDataMerger
            return users;

        } catch (e) {
            console.error("EntraUserCollector Error:", e);
            throw e;
        }
    }
}
