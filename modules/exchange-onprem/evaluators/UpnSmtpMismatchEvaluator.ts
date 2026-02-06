/**
 * UPN ≠ SMTP Mismatch Evaluator
 * Detects remote mailboxes where UserPrincipalName differs from PrimarySmtpAddress
 */

import { RemoteMailbox, UpnSmtpMismatch } from '../models/remoteMailbox';

export const evaluateUpnSmtpMismatch = (mailboxes: RemoteMailbox[]): UpnSmtpMismatch[] => {
    return mailboxes
        .filter(mbx => {
            const upn = mbx.userPrincipalName?.toLowerCase().trim();
            const smtp = mbx.primarySmtpAddress?.toLowerCase().trim();

            // Both must exist and be different
            return upn && smtp && upn !== smtp;
        })
        .map(mbx => ({
            userPrincipalName: mbx.userPrincipalName,
            primarySmtpAddress: mbx.primarySmtpAddress,
            displayName: mbx.displayName,
            samAccountName: mbx.samAccountName
        }));
};

export default evaluateUpnSmtpMismatch;
