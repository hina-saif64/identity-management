/**
 * Remote Mailbox Types for Exchange On-Premises Hybrid Environment
 */

export interface RemoteMailbox {
    userPrincipalName: string;
    displayName: string;
    primarySmtpAddress: string;
    recipientType: string;
    remoteRoutingAddress: string | null;
    alias: string;
    samAccountName: string;
}

export interface ExchangeOnPremState {
    mailboxes: RemoteMailbox[];
    isLoading: boolean;
    error: string | null;
    exchangeServer: string;
    lastFetched: string | null;
    serverInfo?: {
        serverName: string;
        edition: string;
        version: string;
    };
}

export interface UpnSmtpMismatch {
    userPrincipalName: string;
    primarySmtpAddress: string;
    displayName: string;
    samAccountName: string;
}

export interface MissingInExchange {
    userPrincipalName: string;
    email: string;
    displayName: string;
    samAccountName: string;
    source: 'AD';
}

export interface ExchangeOnPremSummary {
    totalRemoteMailboxes: number;
    upnSmtpMismatches: number;
    missingInExchange: number;
    recipientTypes: Record<string, number>;
}
