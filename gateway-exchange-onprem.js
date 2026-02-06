/**
 * HYPERION EXCHANGE ON-PREM SERVICE - DEMO MODE
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_DATA_PATH = path.join(__dirname, 'mock-data', 'exchange-mailboxes.json');

const getMockMailboxes = () => {
    try {
        const data = fs.readFileSync(MOCK_DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading mock mailboxes:', e);
        return { mailboxes: [], count: 0 };
    }
};

export const fetchRemoteMailboxes = async (req, res) => {
    console.log('[DEMO] Fetching Exchange Mailboxes');
    const data = getMockMailboxes();
    setTimeout(() => {
        res.json({
            status: 'success',
            mailboxes: data.mailboxes || [],
            count: data.count || 0,
            exchangeServer: 'EXCH-DEMO',
            fetchedAt: new Date().toISOString()
        });
    }, 600);
};

export const testConnection = async (req, res) => {
    setTimeout(() => {
        res.json({
            status: 'connected',
            exchangeServer: 'EXCH-DEMO',
            serverName: 'EXCH-01',
            edition: 'Enterprise',
            version: '15.2 (Build 999.0)'
        });
    }, 800);
};

export default { fetchRemoteMailboxes, testConnection };
