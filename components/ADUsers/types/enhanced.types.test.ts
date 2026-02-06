// Enhanced User Intelligence Module - Property-Based Tests for Data Model Interfaces
// Feature: user-intelligence-enhancement, Property 5: Backward Compatibility Preservation
// Validates: Requirements 2.1, 7.1, 8.5

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ADUser } from '../../../types';
import type { 
    EnhancedUser, 
    UserCollectionResult, 
    UserSummary,
    MultiSourceCredentials,
    TileConfig,
    DashboardState,
    EnhancedFilters
} from './enhanced.types';

// Generators for property-based testing
const adUserGenerator = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    email: fc.emailAddress(),
    samAccountName: fc.string({ minLength: 1, maxLength: 20 }),
    status: fc.constantFrom('Active', 'Disabled', 'Locked'),
    department: fc.string({ minLength: 0, maxLength: 50 }),
    lastLogin: fc.string({ minLength: 0, maxLength: 50 }),
    createdDate: fc.string({ minLength: 0, maxLength: 50 }),
    lastPasswordSet: fc.string({ minLength: 0, maxLength: 50 }),
    description: fc.string({ minLength: 0, maxLength: 200 }),
    extAttribute7: fc.string({ minLength: 0, maxLength: 50 }),
    extAttribute10: fc.string({ minLength: 0, maxLength: 50 }),
    extAttribute14: fc.string({ minLength: 0, maxLength: 50 }),
    distinguishedName: fc.string({ minLength: 1, maxLength: 200 }),
}) as fc.Arbitrary<ADUser>;

const enhancedUserGenerator = fc.record({
    // Identity fields (required)
    id: fc.string({ minLength: 1, maxLength: 50 }),
    upn: fc.emailAddress(),
    samAccountName: fc.string({ minLength: 1, maxLength: 20 }),
    
    // Basic attributes (preserved from ADUser)
    name: fc.string({ minLength: 1, maxLength: 100 }),
    email: fc.emailAddress(),
    status: fc.constantFrom('Active', 'Disabled', 'Locked'),
    department: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
    distinguishedName: fc.string({ minLength: 1, maxLength: 200 }),
    lastLogin: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
    lastPasswordSet: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
    createdDate: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
    description: fc.option(fc.string({ minLength: 0, maxLength: 200 })),
    extAttribute7: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
    extAttribute10: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
    extAttribute14: fc.option(fc.string({ minLength: 0, maxLength: 50 })),
    
    // Multi-source presence flags
    sources: fc.record({
        ad: fc.boolean(),
        entra: fc.boolean(),
        exchange: fc.boolean(),
    }),
    
    // Optional enrichment data
    entraData: fc.option(fc.record({
        objectId: fc.string({ minLength: 1, maxLength: 50 }),
        lastSignIn: fc.option(fc.date()),
        mfaEnabled: fc.boolean(),
        licenseAssignments: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
        userType: fc.constantFrom('Member', 'Guest'),
        accountEnabled: fc.boolean(),
        riskLevel: fc.option(fc.constantFrom('Low', 'Medium', 'High')),
        complianceState: fc.option(fc.constantFrom('Compliant', 'NonCompliant', 'Unknown')),
        adminRoles: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 })),
    })),
    
    exchangeData: fc.option(fc.record({
        mailboxType: fc.constantFrom('UserMailbox', 'SharedMailbox', 'RoomMailbox'),
        mailboxSize: fc.option(fc.integer({ min: 0, max: 1000000 })),
        lastActivity: fc.option(fc.date()),
        forwardingEnabled: fc.boolean(),
        archiveEnabled: fc.boolean(),
        litigationHoldEnabled: fc.boolean(),
    })),
    
    // Calculated intelligence
    healthStatus: fc.constantFrom('Active', 'Warning', 'Stale', 'Disabled'),
    riskFactors: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 10 }),
    recommendations: fc.array(fc.string({ minLength: 1, maxLength: 200 }), { maxLength: 10 }),
    
    // Special categories
    isGuest: fc.boolean(),
    isTarget: fc.boolean(),
    isPrivileged: fc.boolean(),
    isServiceAccount: fc.boolean(),
}) as fc.Arbitrary<EnhancedUser>;

const userSummaryGenerator = fc.record({
    // Existing tiles (preserved)
    total: fc.integer({ min: 0, max: 10000 }),
    enabled: fc.integer({ min: 0, max: 10000 }),
    disabled: fc.integer({ min: 0, max: 10000 }),
    withEmail: fc.integer({ min: 0, max: 10000 }),
    neverChanged: fc.integer({ min: 0, max: 10000 }),
    stalled: fc.integer({ min: 0, max: 10000 }),
    neverLogin: fc.integer({ min: 0, max: 10000 }),
    passwordExpired: fc.integer({ min: 0, max: 10000 }),
    licenseE5: fc.integer({ min: 0, max: 10000 }),
    licenseE3: fc.integer({ min: 0, max: 10000 }),
    licenseE1: fc.integer({ min: 0, max: 10000 }),
    licenseF3: fc.integer({ min: 0, max: 10000 }),
    noMfa: fc.integer({ min: 0, max: 10000 }),
    
    // New enhanced tiles
    guestUsers: fc.integer({ min: 0, max: 10000 }),
    targetUsers: fc.integer({ min: 0, max: 10000 }),
    privilegedUsers: fc.integer({ min: 0, max: 10000 }),
    serviceAccounts: fc.integer({ min: 0, max: 10000 }),
    multiSourceUsers: fc.integer({ min: 0, max: 10000 }),
    healthyUsers: fc.integer({ min: 0, max: 10000 }),
    atRiskUsers: fc.integer({ min: 0, max: 10000 }),
    
    // Source distribution
    adOnlyUsers: fc.integer({ min: 0, max: 10000 }),
    entraOnlyUsers: fc.integer({ min: 0, max: 10000 }),
    exchangeOnlyUsers: fc.integer({ min: 0, max: 10000 }),
    allSourcesUsers: fc.integer({ min: 0, max: 10000 }),
}) as fc.Arbitrary<UserSummary>;

describe('Enhanced Data Model Interfaces - Backward Compatibility', () => {
    describe('Property 5: Backward Compatibility Preservation', () => {
        it('should preserve all existing ADUser fields in EnhancedUser', () => {
            fc.assert(
                fc.property(adUserGenerator, (adUser: ADUser) => {
                    // Create an EnhancedUser from ADUser data
                    const enhancedUser: EnhancedUser = {
                        // Identity mapping
                        id: adUser.id,
                        upn: adUser.email, // UPN can be derived from email
                        samAccountName: adUser.samAccountName,
                        
                        // Direct field mapping (all existing fields preserved)
                        name: adUser.name,
                        email: adUser.email,
                        status: adUser.status,
                        department: adUser.department,
                        distinguishedName: adUser.distinguishedName,
                        lastLogin: adUser.lastLogin,
                        lastPasswordSet: adUser.lastPasswordSet,
                        createdDate: adUser.createdDate,
                        description: adUser.description,
                        extAttribute7: adUser.extAttribute7,
                        extAttribute10: adUser.extAttribute10,
                        extAttribute14: adUser.extAttribute14,
                        
                        // New required fields with defaults
                        sources: { ad: true, entra: false, exchange: false },
                        healthStatus: 'Active',
                        riskFactors: [],
                        recommendations: [],
                        isGuest: false,
                        isTarget: false,
                        isPrivileged: false,
                        isServiceAccount: false,
                    };
                    
                    // Verify all original ADUser fields are accessible and unchanged
                    expect(enhancedUser.id).toBe(adUser.id);
                    expect(enhancedUser.name).toBe(adUser.name);
                    expect(enhancedUser.email).toBe(adUser.email);
                    expect(enhancedUser.samAccountName).toBe(adUser.samAccountName);
                    expect(enhancedUser.status).toBe(adUser.status);
                    expect(enhancedUser.department).toBe(adUser.department);
                    expect(enhancedUser.lastLogin).toBe(adUser.lastLogin);
                    expect(enhancedUser.createdDate).toBe(adUser.createdDate);
                    expect(enhancedUser.lastPasswordSet).toBe(adUser.lastPasswordSet);
                    expect(enhancedUser.description).toBe(adUser.description);
                    expect(enhancedUser.extAttribute7).toBe(adUser.extAttribute7);
                    expect(enhancedUser.extAttribute10).toBe(adUser.extAttribute10);
                    expect(enhancedUser.extAttribute14).toBe(adUser.extAttribute14);
                    expect(enhancedUser.distinguishedName).toBe(adUser.distinguishedName);
                    
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it('should maintain UserSummary backward compatibility with existing tile counts', () => {
            fc.assert(
                fc.property(userSummaryGenerator, (summary: UserSummary) => {
                    // Verify all existing summary fields are present and accessible
                    const existingFields = [
                        'total', 'enabled', 'disabled', 'withEmail', 'neverChanged',
                        'stalled', 'neverLogin', 'passwordExpired', 'licenseE5',
                        'licenseE3', 'licenseE1', 'licenseF3', 'noMfa'
                    ];
                    
                    for (const field of existingFields) {
                        expect(summary).toHaveProperty(field);
                        expect(typeof summary[field as keyof UserSummary]).toBe('number');
                        expect(summary[field as keyof UserSummary]).toBeGreaterThanOrEqual(0);
                    }
                    
                    // Verify new fields are also present
                    const newFields = [
                        'guestUsers', 'targetUsers', 'privilegedUsers', 'serviceAccounts',
                        'multiSourceUsers', 'healthyUsers', 'atRiskUsers', 'adOnlyUsers',
                        'entraOnlyUsers', 'exchangeOnlyUsers', 'allSourcesUsers'
                    ];
                    
                    for (const field of newFields) {
                        expect(summary).toHaveProperty(field);
                        expect(typeof summary[field as keyof UserSummary]).toBe('number');
                        expect(summary[field as keyof UserSummary]).toBeGreaterThanOrEqual(0);
                    }
                    
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it('should ensure EnhancedUser can be used wherever ADUser was used', () => {
            fc.assert(
                fc.property(enhancedUserGenerator, (enhancedUser: EnhancedUser) => {
                    // Function that expects ADUser interface
                    const processADUser = (user: Pick<ADUser, 'id' | 'name' | 'email' | 'status' | 'samAccountName' | 'distinguishedName'>) => {
                        return {
                            id: user.id,
                            displayName: user.name,
                            primaryEmail: user.email,
                            accountStatus: user.status,
                            accountName: user.samAccountName,
                            dn: user.distinguishedName
                        };
                    };
                    
                    // EnhancedUser should be compatible with ADUser interface
                    const result = processADUser(enhancedUser);
                    
                    expect(result.id).toBe(enhancedUser.id);
                    expect(result.displayName).toBe(enhancedUser.name);
                    expect(result.primaryEmail).toBe(enhancedUser.email);
                    expect(result.accountStatus).toBe(enhancedUser.status);
                    expect(result.accountName).toBe(enhancedUser.samAccountName);
                    expect(result.dn).toBe(enhancedUser.distinguishedName);
                    
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it('should preserve type safety for all interface fields', () => {
            fc.assert(
                fc.property(enhancedUserGenerator, (user: EnhancedUser) => {
                    // Type checks for required fields
                    expect(typeof user.id).toBe('string');
                    expect(typeof user.upn).toBe('string');
                    expect(typeof user.samAccountName).toBe('string');
                    expect(typeof user.name).toBe('string');
                    expect(typeof user.email).toBe('string');
                    expect(['Active', 'Disabled', 'Locked']).toContain(user.status);
                    expect(typeof user.distinguishedName).toBe('string');
                    
                    // Type checks for source flags
                    expect(typeof user.sources.ad).toBe('boolean');
                    expect(typeof user.sources.entra).toBe('boolean');
                    expect(typeof user.sources.exchange).toBe('boolean');
                    
                    // Type checks for calculated fields
                    expect(['Active', 'Warning', 'Stale', 'Disabled']).toContain(user.healthStatus);
                    expect(Array.isArray(user.riskFactors)).toBe(true);
                    expect(Array.isArray(user.recommendations)).toBe(true);
                    
                    // Type checks for boolean flags
                    expect(typeof user.isGuest).toBe('boolean');
                    expect(typeof user.isTarget).toBe('boolean');
                    expect(typeof user.isPrivileged).toBe('boolean');
                    expect(typeof user.isServiceAccount).toBe('boolean');
                    
                    // Optional field type checks
                    if (user.entraData) {
                        expect(typeof user.entraData.objectId).toBe('string');
                        expect(typeof user.entraData.mfaEnabled).toBe('boolean');
                        expect(['Member', 'Guest']).toContain(user.entraData.userType);
                        expect(Array.isArray(user.entraData.licenseAssignments)).toBe(true);
                    }
                    
                    if (user.exchangeData) {
                        expect(['UserMailbox', 'SharedMailbox', 'RoomMailbox']).toContain(user.exchangeData.mailboxType);
                        expect(typeof user.exchangeData.forwardingEnabled).toBe('boolean');
                        expect(typeof user.exchangeData.archiveEnabled).toBe('boolean');
                        expect(typeof user.exchangeData.litigationHoldEnabled).toBe('boolean');
                    }
                    
                    return true;
                }),
                { numRuns: 100 }
            );
        });

        it('should maintain consistent data structure across all interface definitions', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        users: fc.array(enhancedUserGenerator, { maxLength: 10 }),
                        summary: userSummaryGenerator,
                    }),
                    ({ users, summary }) => {
                        // Create a UserCollectionResult
                        const result: UserCollectionResult = {
                            users,
                            sources: {
                                ad: { success: true, count: users.length, duration: 1000 },
                                entra: { success: true, count: users.length, duration: 1500 },
                                exchange: { success: true, count: users.length, duration: 2000 },
                            },
                            correlationStats: {
                                totalUsers: users.length,
                                adOnly: 0,
                                entraOnly: 0,
                                exchangeOnly: 0,
                                allSources: users.length,
                                partialSources: 0,
                            },
                            performance: {
                                totalDuration: 4500,
                                cacheHits: 0,
                                apiCalls: 3,
                            },
                        };
                        
                        // Verify structure consistency
                        expect(result.users).toHaveLength(users.length);
                        expect(result.sources.ad.count).toBe(users.length);
                        expect(result.correlationStats.totalUsers).toBe(users.length);
                        expect(result.performance.apiCalls).toBe(3);
                        
                        // Verify all users maintain their structure
                        result.users.forEach((user, index) => {
                            expect(user.id).toBe(users[index].id);
                            expect(user.sources).toBeDefined();
                            expect(user.healthStatus).toBeDefined();
                        });
                        
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});