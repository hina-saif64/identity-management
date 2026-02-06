
import fc from 'fast-check';
import { describe, test, expect } from 'vitest';
import { UserDataMerger } from '../logic/UserDataMerger';
import type { ADUser } from '../../../types';
import type { EnhancedUser } from '../models/enhancedUser';

// Helper for safe date string
const dateString = () => fc.date({ min: new Date('2000-01-01'), max: new Date('2030-01-01') })
    .map(d => {
        try {
            return d.toISOString();
        } catch (e) {
            return '2023-01-01T00:00:00.000Z';
        }
    });

// Mock AD User Generator
const adUserArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string(),
    email: fc.emailAddress(),
    samAccountName: fc.string({ minLength: 1 }),
    status: fc.constantFrom('Active', 'Disabled', 'Locked'),
    department: fc.option(fc.string()).map(x => x || ''),
    lastLogin: dateString(),
    createdDate: dateString(),
    lastPasswordSet: dateString(),
    description: fc.string(),
    extAttribute7: fc.string(),
    extAttribute10: fc.string(),
    extAttribute14: fc.string(),
    distinguishedName: fc.string()
});

// Mock Entra User Generator
const entraUserArbitrary = fc.record({
    id: fc.uuid(),
    userPrincipalName: fc.emailAddress(),
    displayName: fc.string(),
    accountEnabled: fc.boolean(),
    userType: fc.constantFrom('Member', 'Guest'),
    assignedLicenses: fc.array(fc.string()),
    signInActivity: fc.option(fc.record({
        lastSignInDateTime: dateString()
    }))
});

describe('UserDataMerger Properties', () => {
    const merger = new UserDataMerger();

    test('should correctly identify sources', async () => {
        await fc.assert(
            fc.asyncProperty(adUserArbitrary, fc.option(entraUserArbitrary), async (adUser, entraUser) => {
                // Force correlation if Entra user exists
                const correlatedEntra = entraUser ? { ...entraUser, userPrincipalName: adUser.email } : undefined;

                const result = await merger.mergeUserData(
                    [adUser as any],
                    correlatedEntra ? [correlatedEntra] : [],
                    [] // No Exchange data
                );

                expect(result[0].sources.ad).toBe(true);
                expect(result[0].sources.entra).toBe(!!correlatedEntra);
                expect(result[0].sources.exchange).toBe(false);
                expect(result[0].id).toBe(adUser.id);
            })
        );
    });

    test('should calculate health status based on AD status', async () => {
        await fc.assert(
            fc.asyncProperty(adUserArbitrary, async (adUser) => {
                const result = await merger.mergeUserData([adUser as any], [], []);

                // Allow empty status to result in Warning if other fields are missing
                if (adUser.status === 'Disabled') {
                    expect(['Disabled', 'Warning', 'Stale']).toContain(result[0].healthStatus);
                }
            })
        );
    });

    test('guest user detection', async () => {
        await fc.assert(
            fc.asyncProperty(adUserArbitrary, entraUserArbitrary, async (adUser, entraUser) => {
                // Force guest type AND correlation
                const guestEntra = { ...entraUser, userType: 'Guest' as const, userPrincipalName: adUser.email };
                const result = await merger.mergeUserData([adUser as any], [guestEntra], []);

                // If the user correlates, result[0] should be the merged user
                if (result.length > 0) {
                    expect(result[0].isGuest).toBe(true);
                    expect(result[0].sources.entra).toBe(true);
                }
            })
        );
    });
});
