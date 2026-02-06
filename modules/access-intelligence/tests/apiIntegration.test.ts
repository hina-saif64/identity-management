
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies BEFORE importing the module under test
vi.mock('../../../gateway-core.js', () => ({
    runPs: vi.fn(),
    strictSanitize: (s) => s, // Simple pass-through for tests
    sessions: {
        get: vi.fn(),
        create: vi.fn(),
    }
}));

// Import the module under test
import * as adService from '../../../gateway-ad.js';
import { runPs, sessions } from '../../../gateway-core.js';

describe('AD Gateway Integration Tests', () => {
    const mockRes = {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
    };

    const mockSessionId = 'test-session-id';
    const mockAuth = {
        server: 'dc01.contoso.com',
        username: 'admin',
        password: 'password',
        psLogic: '$params = @{ Server = "dc01.contoso.com" }' // Simplified mock logic
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup session mock
        (sessions.get as any).mockReturnValue(mockAuth);
    });

    describe('fetchUsers', () => {
        it('should fetch users successfully with basic filters', async () => {
            const req = {
                body: {
                    sessionId: mockSessionId,
                    filters: {
                        status: 'Enabled',
                        searchString: 'test'
                    }
                }
            };

            const mockPsOutput = JSON.stringify({
                users: [
                    { id: 'CN=Test User', name: 'Test User', email: 'test@contoso.com' }
                ],
                count: 1
            });

            (runPs as any).mockResolvedValue({
                status: 'success',
                output: mockPsOutput
            });

            await adService.fetchUsers(req as any, mockRes as any);

            expect(sessions.get).toHaveBeenCalledWith(mockSessionId);
            expect(runPs).toHaveBeenCalled();

            // Verify the generated PowerShell command contains expected filter components
            const psCall = (runPs as any).mock.calls[0][0];
            expect(psCall).toContain('[ADSISearcher]'); // Expecting [ADSISearcher] based on gateway-ad.js content
            expect(psCall).toContain('$searchTerms');

            expect(mockRes.json).toHaveBeenCalledWith(JSON.parse(mockPsOutput));
        });

        it('should handle multi-line search strings correctly', async () => {
            const req = {
                body: {
                    sessionId: mockSessionId,
                    filters: {
                        searchString: 'user1\nuser2'
                    }
                }
            };

            const mockPsOutput = JSON.stringify({ users: [], count: 0 });
            (runPs as any).mockResolvedValue({ status: 'success', output: mockPsOutput });

            await adService.fetchUsers(req as any, mockRes as any);

            const psCall = (runPs as any).mock.calls[0][0];
            // Verify that the PowerShell command handles the array of terms
            expect(psCall).toContain('@(\'user1\',\'user2\')');
        });

        it('should return error if PowerShell execution fails', async () => {
            const req = { body: { sessionId: mockSessionId } };

            (runPs as any).mockResolvedValue({
                status: 'error',
                error: 'PS Error'
            });

            await adService.fetchUsers(req as any, mockRes as any);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
        });

        it('should handle invalid session', async () => {
            (sessions.get as any).mockReturnValue(null);

            const req = { body: { sessionId: 'invalid' } };
            await adService.fetchUsers(req as any, mockRes as any);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Session Expired" });
        });
    });

    describe('performBulkAction', () => {
        it('should generate correct move command', async () => {
            const req = {
                body: {
                    sessionId: mockSessionId,
                    action: 'move',
                    ids: ['user1', 'user2'],
                    targetValue: 'OU=New,DC=com'
                }
            };

            const mockPsOutput = JSON.stringify([{ id: 'user1', status: 'success' }]);
            (runPs as any).mockResolvedValue({ status: 'success', output: mockPsOutput });

            await adService.performBulkAction(req as any, mockRes as any);

            const psCall = (runPs as any).mock.calls[0][0];
            expect(psCall).toContain('Move-ADObject');
            expect(psCall).toContain('OU=New,DC=com');
            expect(psCall).toContain("user1");
            expect(psCall).toContain("user2");
        });

        it('should generate correct enable command', async () => {
            const req = {
                body: {
                    sessionId: mockSessionId,
                    action: 'enable',
                    ids: ['user1']
                }
            };

            const mockPsOutput = JSON.stringify([]);
            (runPs as any).mockResolvedValue({ status: 'success', output: mockPsOutput });

            await adService.performBulkAction(req as any, mockRes as any);

            const psCall = (runPs as any).mock.calls[0][0];
            expect(psCall).toContain('Enable-ADAccount');
        });
    });
});
