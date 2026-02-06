/**
 * HYPERION POWERBI SERVICE - DEMO MODE
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_DATA_PATH = path.join(__dirname, 'mock-data', 'powerbi-workspaces.json');

export const connectExchangeOnline = async (req, res) => {
    // Only successful certificate auth simulation
    setTimeout(() => {
        res.json({
            status: 'success',
            organization: 'Hyperion Demo Org',
            appId: 'demo-app-id',
            authType: 'CertificateBased',
            connectedAt: new Date().toISOString(),
            sessionId: 'EXO-CBA-DEMO',
            message: 'Successfully connected to Exchange Online (DEMO)'
        });
    }, 1200);
};

export const fetchPowerBIUsage = async (req, res) => {
    const { daysBack = 90 } = req.body;

    // Generate some random audit log data
    const ops = ['ViewReport', 'EditReport', 'ShareDashboard', 'ExportData', 'PublishReport'];
    const users = ['jdoe@hyperion.lab', 'asmith@hyperion.lab', 'bwayne@hyperion.lab', 'admin@hyperion.lab'];

    const data = [];
    for (let i = 0; i < 50; i++) {
        data.push({
            userIds: users[Math.floor(Math.random() * users.length)],
            operations: ops[Math.floor(Math.random() * ops.length)],
            creationDate: new Date(Date.now() - Math.floor(Math.random() * daysBack * 86400000)).toISOString(),
            clientIP: '192.168.1.10'
        });
    }

    setTimeout(() => {
        res.json({
            status: 'success',
            data: data.sort((a, b) => new Date(b.creationDate) - new Date(a.creationDate)),
            totalUsers: 4,
            dateRange: {
                start: new Date(Date.now() - daysBack * 86400000).toISOString(),
                end: new Date().toISOString(),
                daysBack
            },
            summary: {
                uniqueUsers: 4,
                totalActivities: 50,
                topOperations: [
                    { operation: 'ViewReport', count: 20 },
                    { operation: 'EditReport', count: 15 }
                ]
            }
        });
    }, 1500);
};

export const getExchangeStatus = async (req, res) => {
    res.json({ connected: true, state: 'Opened' });
};

export const fetchManagementActivity = async (req, res) => {
    return fetchPowerBIUsage(req, res); // Reuse mock logic
};
