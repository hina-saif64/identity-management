/**
 * Orphaned User Evaluator
 * Detects AD users with email addresses that don't have corresponding Exchange remote mailboxes
 */

import { RemoteMailbox, MissingInExchange } from '../models/remoteMailbox';

interface ADUser {
    name: string;
    email: string;
    upn?: string;
    samAccountName: string;
}

export const evaluateOrphanedUsers = (
    adUsers: ADUser[],
    remoteMailboxes: RemoteMailbox[]
): MissingInExchange[] => {
    // Create lookup sets for faster matching
    const exchangeUpns = new Set(
        remoteMailboxes.map(mbx => mbx.userPrincipalName?.toLowerCase().trim()).filter(Boolean)
    );
    const exchangeSmtps = new Set(
        remoteMailboxes.map(mbx => mbx.primarySmtpAddress?.toLowerCase().trim()).filter(Boolean)
    );
    const exchangeSams = new Set(
        remoteMailboxes.map(mbx => mbx.samAccountName?.toLowerCase().trim()).filter(Boolean)
    );

    return adUsers
        .filter(user => {
            // User must have an email address
            if (!user.email || user.email.trim() === '') return false;

            const upn = (user.upn || user.email)?.toLowerCase().trim();
            const email = user.email?.toLowerCase().trim();
            const sam = user.samAccountName?.toLowerCase().trim();

            // Check if user exists in Exchange by any identifier
            const existsInExchange =
                exchangeUpns.has(upn) ||
                exchangeUpns.has(email) ||
                exchangeSmtps.has(email) ||
                exchangeSmtps.has(upn) ||
                exchangeSams.has(sam);

            return !existsInExchange;
        })
        .map(user => ({
            userPrincipalName: user.upn || user.email,
            email: user.email,
            displayName: user.name,
            samAccountName: user.samAccountName,
            source: 'AD' as const
        }));
};

export default evaluateOrphanedUsers;
