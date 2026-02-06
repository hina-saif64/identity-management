/**
 * HYPERION CLOUD GOVERNANCE SERVICE - DEMO MODE
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_USERS_PATH = path.join(__dirname, 'mock-data', 'cloud-users.json');

let cloudSession = {
    graphToken: 'mock-token',
    expiry: Date.now() + 3600000,
    tenantId: 'demo-tenant',
    verifiedDomains: ['hyperion.lab', 'hyperion.demo']
};

export { cloudSession };

export const connectCloud = async (req, res) => {
    const { organization } = req.body;
    setTimeout(() => {
        res.json({
            status: 'connected',
            organization: organization || 'Hyperion Demo Org',
            verifiedDomains: cloudSession.verifiedDomains
        });
    }, 1000);
};

export const getAccessToken = async (req, res) => {
    res.json({ access_token: 'mock-access-token-12345' });
};

export const getUsageReport = async (req, res) => {
    try {
        const data = fs.readFileSync(MOCK_USERS_PATH, 'utf8');
        const parsed = JSON.parse(data);
        const users = parsed.value.map(u => ({
            ...u,
            teamsLastActivityDate: new Date().toISOString().split('T')[0]
        }));

        setTimeout(() => {
            res.json({ users, logs: ['[DEMO] Fetched mock cloud users'], status: 'success' });
        }, 1500);
    } catch (e) {
        res.status(500).json({ error: 'Mock Read Error', detail: e.message, logs: [] });
    }
};

export const fetchPowerBIUsage = async (req, res) => {
    // Return mock PowerBI usage
    const daysBack = req.body.daysBack || 90;
    setTimeout(() => {
        res.json({
            data: [],
            totalUsers: 15,
            dateRange: { start: '2024-01-01', end: '2024-04-01', daysBack },
            summary: {
                uniqueUsers: 15,
                totalActivities: 342,
                topOperations: [
                    { operation: 'ViewReport', count: 120 },
                    { operation: 'ExportData', count: 45 },
                    { operation: 'ShareDashboard', count: 12 }
                ]
            }
        });
    }, 1000);
};