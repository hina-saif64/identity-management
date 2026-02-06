/**
 * HYPERION AD SERVICE - DEMO MODE
 * Uses mock data from local JSON files
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_DATA_PATH = path.join(__dirname, 'mock-data', 'ad-users.json');

const getMockUsers = () => {
    try {
        const data = fs.readFileSync(MOCK_DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading mock AD users:', e);
        return [];
    }
};

export const testConnection = async (req, res) => {
    // Always succeed in demo mode
    setTimeout(() => {
        res.json({
            status: 'connected',
            message: 'SUCCESS: Connected to DEMO-DC.hyperion.lab',
            sessionId: 'demo-session-id'
        });
    }, 1000); // Fake latency
};

export const fetchUsers = async (req, res) => {
    const { filters } = req.body;
    console.log('[DEMO] Fetching users with filters:', filters);

    const users = getMockUsers();

    // Simple filter simulation
    let filtered = users;
    if (filters?.searchString) {
        const term = filters.searchString.toLowerCase();
        filtered = users.filter(u =>
            u.displayName.toLowerCase().includes(term) ||
            u.samAccountName.toLowerCase().includes(term) ||
            u.userPrincipalName.toLowerCase().includes(term)
        );
    }

    setTimeout(() => {
        res.json({
            users: filtered.map(u => ({
                id: `CN=${u.displayName},OU=Users,DC=hyperion,DC=lab`,
                name: u.displayName,
                samAccountName: u.samAccountName,
                email: u.userPrincipalName,
                status: u.enabled ? 'Active' : 'Disabled',
                department: u.department || 'General',
                distinguishedName: `CN=${u.displayName},OU=Users,DC=hyperion,DC=lab`,
                lastLogin: u.lastLogon ? u.lastLogon.split('T')[0] : 'Never',
                lastPasswordSet: u.passwordLastSet ? u.passwordLastSet.split('T')[0] : 'Never',
                title: u.title
            })),
            count: filtered.length,
            duration: 120, // ms
            isLimited: false
        });
    }, 500);
};

export const fetchUsersPaginated = async (req, res) => {
    const { pageNumber = 1, pageSize = 50, filters } = req.body;
    const users = getMockUsers();

    let filtered = users;
    if (filters?.searchString) {
        const term = filters.searchString.toLowerCase();
        filtered = users.filter(u =>
            u.displayName.toLowerCase().includes(term) ||
            u.samAccountName.toLowerCase().includes(term)
        );
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (pageNumber - 1) * pageSize;
    const end = start + pageSize;
    const pageUsers = filtered.slice(start, end);

    setTimeout(() => {
        res.json({
            users: pageUsers.map(u => ({
                id: `CN=${u.displayName},OU=Users,DC=hyperion,DC=lab`,
                name: u.displayName,
                samAccountName: u.samAccountName,
                email: u.userPrincipalName,
                status: u.enabled ? 'Active' : 'Disabled',
                department: u.department || 'General',
                distinguishedName: `CN=${u.displayName},OU=Users,DC=hyperion,DC=lab`,
                lastLogin: u.lastLogon ? u.lastLogon.split('T')[0] : 'Never',
                lastPasswordSet: u.passwordLastSet ? u.passwordLastSet.split('T')[0] : 'Never'
            })),
            pageNumber,
            pageSize,
            totalCount,
            totalPages,
            hasMore: pageNumber < totalPages,
            duration: 50
        });
    }, 300);
};

export const getDomainInfo = async (req, res) => {
    res.json({
        upnSuffixes: ['hyperion.lab', 'hyperion.demo'],
        OUs: [
            { Name: 'Users', DistinguishedName: 'OU=Users,DC=hyperion,DC=lab' },
            { Name: 'IT', DistinguishedName: 'OU=IT,DC=hyperion,DC=lab' },
            { Name: 'HR', DistinguishedName: 'OU=HR,DC=hyperion,DC=lab' }
        ],
        ouCount: 3,
        debug: 'Demo Mode'
    });
};

export const performBulkAction = async (req, res) => {
    const { action, ids } = req.body;
    console.log(`[DEMO] Bulk Action ${action} on ${ids.length} items`);

    const results = ids.map(id => ({ id, status: 'success' }));
    setTimeout(() => res.json(results), 800);
};

export const performBulkActionBatch = async (req, res) => performBulkAction(req, res);