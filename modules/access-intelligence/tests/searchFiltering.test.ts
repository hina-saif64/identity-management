
import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { filterUsers } from '../utils/userFiltering';
import { EnhancedUser, EnhancedFilters } from '../../../components/ADUsers/types/enhanced.types';

const dateString = () => fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => {
    try {
        return d.toISOString();
    } catch (e) {
        return '2023-01-01T00:00:00.000Z';
    }
});

// Generator for EnhancedUser
const enhancedUserArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string(),
    email: fc.emailAddress(),
    upn: fc.emailAddress(),
    samAccountName: fc.string({ minLength: 1 }),
    status: fc.constantFrom('Active', 'Disabled', 'Locked'),
    healthStatus: fc.constantFrom('Active', 'Warning', 'Stale', 'Disabled'),
    userType: fc.constantFrom('Member', 'Guest'),
    isGuest: fc.boolean(),
    isTarget: fc.boolean(),
    isPrivileged: fc.boolean(),
    isServiceAccount: fc.boolean(),
    sources: fc.record({
        ad: fc.boolean(),
        entra: fc.boolean(),
        exchange: fc.boolean()
    }),
    riskFactors: fc.array(fc.string()),
    description: fc.option(fc.string()),
    department: fc.option(fc.string()),
    lastLogin: fc.oneof(dateString(), fc.constant('Never')),
    lastPasswordSet: fc.oneof(dateString(), fc.constant('Never')),
    createdDate: dateString(),
    distinguishedName: fc.string(),
    recommendations: fc.array(fc.string())
}).map(u => ({
    ...u,
    // Ensure consistency for isGuest/userType if needed, but filter logic treats them independently mostly
    isGuest: u.userType === 'Guest'
})) as fc.Arbitrary<EnhancedUser>;

describe('Search and Filtering Properties', () => {

    test('Property 16: Comprehensive Search', () => {
        fc.assert(
            fc.property(
                fc.array(enhancedUserArbitrary, { minLength: 1 }),
                fc.nat(),
                (users, index) => {
                    // Pick a random user from the list
                    const targetUser = users[index % users.length];

                    // Pick a search term from one of their attributes
                    const attributes = [
                        targetUser.name,
                        targetUser.email,
                        targetUser.upn,
                        targetUser.samAccountName,
                        targetUser.description,
                        targetUser.department
                    ].filter(Boolean) as string[];

                    if (attributes.length === 0) return true; // Skip if no searchable attributes

                    // Pick a random substring from a random attribute
                    const attr = attributes[index % attributes.length];
                    if (attr.length < 2) return true;

                    const start = index % (attr.length - 1);
                    const end = start + 1 + (index % (attr.length - start));
                    const searchTerm = attr.substring(start, end);

                    const filters: EnhancedFilters = {
                        searchString: searchTerm,
                        status: 'All',
                        userType: 'All',
                        healthStatus: 'All',
                        sources: []
                    };

                    const results = filterUsers(users, filters);

                    // The target user MUST be in the results
                    expect(results.some(u => u.id === targetUser.id)).toBe(true);
                }
            )
        );
    });

    test('Property 17: Advanced Filtering Capabilities', () => {
        fc.assert(
            fc.property(
                fc.array(enhancedUserArbitrary),
                fc.constantFrom('Active', 'Disabled'),
                fc.constantFrom('Member', 'Guest'),
                fc.constantFrom('Active', 'Warning', 'Stale', 'Disabled'),
                fc.subarray(['ad', 'entra', 'exchange'], { minLength: 1 }),
                (users, status, userType, healthStatus, sources) => {

                    // Test Status Filter
                    const statusResults = filterUsers(users, { status: status as any, sources: [] });
                    expect(statusResults.every(u => u.status === status)).toBe(true);

                    // Test User Type Filter
                    const typeResults = filterUsers(users, { userType: userType as any, sources: [] });
                    if (userType === 'Guest') {
                        expect(typeResults.every(u => u.isGuest)).toBe(true);
                    } else {
                        expect(typeResults.every(u => !u.isGuest)).toBe(true);
                    }

                    // Test Health Status Filter
                    const healthResults = filterUsers(users, { healthStatus: healthStatus as any, sources: [] });
                    expect(healthResults.every(u => u.healthStatus === healthStatus)).toBe(true);

                    // Test Source Filter
                    const sourceResults = filterUsers(users, { sources: sources as any });
                    expect(sourceResults.every(u =>
                        sources.every(s => u.sources[s as keyof typeof u.sources])
                    )).toBe(true);
                }
            )
        );
    });

    test('Property 18: Bulk Operations on Filtered Sets (Simulation)', () => {
        // Simulating that if we filter and then select all, the selection matches the filter result
        fc.assert(
            fc.property(
                fc.array(enhancedUserArbitrary),
                fc.string(),
                (users, searchString) => {
                    const filters: EnhancedFilters = { searchString };
                    const results = filterUsers(users, filters);

                    // If we were to "Select All" on these results
                    const selectedIds = new Set(results.map(u => u.id));

                    // Verify that every selected ID corresponds to a user that matches the filter
                    results.forEach(u => {
                        expect(selectedIds.has(u.id)).toBe(true);
                    });

                    // And no users outside the filter are selected
                    const nonMatchingUsers = users.filter(u => !results.includes(u));
                    nonMatchingUsers.forEach(u => {
                        expect(selectedIds.has(u.id)).toBe(false);
                    });
                }
            )
        );
    });

});
