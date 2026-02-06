
/**
 * HYPERION MASTER ORCHESTRATOR
 * MODULAR ARCHITECTURE V2.8 (CLOUD CAPABLE)
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import 'dotenv/config'; // Load .env file
import { GATEWAY_SECRET, ENGINE_VERSION } from './gateway-config.js';

// 🔒 LOCKED AUTHENTICATION SYSTEM
import { authMiddleware } from './auth-system/index.js';

// SERVICE MODULES
import { runPs, validateTerminalCommand } from './gateway-core.js';
import * as adService from './gateway-ad.js';
import * as ldapService from './gateway-ldap.js';
import * as aiService from './gateway-ai.js';
import * as cloudService from './gateway-cloud.js';
import { cloudSession } from './gateway-cloud.js';
import * as powerbiService from './gateway-powerbi.js';
import * as terminalService from './gateway-terminal.js';
import { connectUnified } from './gateway-cloud-unified.js';

// --- MODULAR FEATURES (Isolated) ---
import caRoutes from './modules/ca-exclusion-inspector/ca.routes.js';
import deviceRoutes from './modules/unified-device-inventory/device.routes.js';
import passwordRoutes from './modules/password-tools/password.routes.js';

// 🏗️ MODULAR ARCHITECTURE - PHASE 1 TEST CASE
// Feature flag to enable modular user routes (AD Users test case)
const USE_MODULAR_USER_ROUTES = process.env.USE_MODULAR_USER_ROUTES === 'true';
const USE_MODULAR_POWERBI_ROUTES = process.env.USE_MODULAR_POWERBI_ROUTES === 'true' || false; // Revert back to original V1 setting
let userRoutes = null;

if (USE_MODULAR_USER_ROUTES) {
    try {
        const userRoutesModule = await import('./src/routes/users.routes.js');
        userRoutes = userRoutesModule.default;
        console.log('🏗️ MODULAR: User routes loaded successfully');
    } catch (error) {
        console.error('🚨 MODULAR: Failed to load user routes, falling back to monolithic:', error.message);
    }
}

const app = express();
const PORT = 3002;

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:4173'],
    credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));

/**
 * 🔒 LOCKED Security Handshake Middleware
 * Using locked authentication system
 */
const validateHandshake = authMiddleware;

// --- SYSTEM ROUTES ---
app.get('/api/health', (req, res) => {
    res.json({
        status: "online",
        engine: "Hyperion-Turbo",
        version: ENGINE_VERSION,
        security: "HARDENED",
        modules: {
            core: "LOCKED",
            ad: "ACTIVE",
            mode: "SECURE",
            cloud: "ACTIVE"
        }
    });
});

// --- BACKEND LOG STREAMING (SSE) ---
import { handleLogStream, broadcastLog } from './gateway-logs.js';
app.get('/api/logs/stream', handleLogStream);

// --- AD SERVICE ROUTES ---
app.post('/api/ad/test', validateHandshake, adService.testConnection);
app.post('/api/ad/users', validateHandshake, adService.fetchUsers);
app.post('/api/users', validateHandshake, adService.fetchUsers); // Frontend Alias
app.post('/api/users/enhanced', validateHandshake, adService.fetchUsers); // Enhanced Alias (Multi-source compliant)

// 🏗️ MODULAR ARCHITECTURE - CONDITIONAL ENDPOINT
// Only register monolithic /api/users/unified if modular routes are NOT enabled
if (!USE_MODULAR_USER_ROUTES) {
    app.post('/api/users/unified', validateHandshake, async (req, res) => {
        // Unified User Intelligence - Parallel multi-source collection with detailed progress logging
        // Similar to Device Inventory's efficient approach but with PowerShell-style detailed logging
        try {
            const { sessionId } = req.body; // Credentials now managed via server-side session for security
            const startTime = Date.now();

            console.log('🚀 Unified User Collection: Starting parallel fetch...');
            broadcastLog('🚀 Starting multi-source user collection...', 'USER-INTELLIGENCE', 'info');

            // Track progress for each source
            const sourceProgress = {
                ad: { status: 'pending', count: 0, startTime: null, endTime: null, error: null },
                entra: { status: 'pending', count: 0, startTime: null, endTime: null, error: null },
                exchange: { status: 'pending', count: 0, startTime: null, endTime: null, error: null }
            };

            // Helper function to broadcast detailed progress
            const logProgress = (source, message, level = 'info') => {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[${timestamp}] ${source.toUpperCase()}: ${message}`);
                broadcastLog(`${source.toUpperCase()}: ${message}`, 'USER-INTELLIGENCE', level);
            };

            const results = await Promise.allSettled([
                // AD Users (always try if sessionId provided)
                sessionId ? new Promise((resolve, reject) => {
                    sourceProgress.ad.status = 'loading';
                    sourceProgress.ad.startTime = Date.now();
                    logProgress('AD', 'Connecting to Active Directory...');

                    // Create mock req/res objects for adService.fetchUsers
                    const mockReq = { body: { sessionId, filters: { status: 'All' } } };
                    const mockRes = {
                        json: (data) => {
                            sourceProgress.ad.endTime = Date.now();
                            sourceProgress.ad.count = data.users?.length || 0;
                            sourceProgress.ad.status = 'success';
                            const duration = sourceProgress.ad.endTime - sourceProgress.ad.startTime;
                            logProgress('AD', `✅ Successfully fetched ${sourceProgress.ad.count} users in ${duration}ms`);
                            resolve(data);
                        },
                        status: (code) => ({
                            json: (data) => {
                                sourceProgress.ad.endTime = Date.now();
                                sourceProgress.ad.status = 'error';
                                sourceProgress.ad.error = `HTTP ${code}: ${JSON.stringify(data)}`;
                                logProgress('AD', `❌ Failed: ${sourceProgress.ad.error}`, 'error');
                                reject(new Error(sourceProgress.ad.error));
                            }
                        })
                    };
                    adService.fetchUsers(mockReq, mockRes);
                }) : (() => {
                    logProgress('AD', '⏭️ Skipped - No session ID provided');
                    return Promise.resolve({ users: [] });
                })(),

                // Entra ID Users (use cloud session if available)
                // Entra ID Users (use cloud session if available)
                cloudSession && cloudSession.graphToken ? (async () => {
                    sourceProgress.entra.status = 'loading';
                    sourceProgress.entra.startTime = Date.now();
                    logProgress('ENTRA', 'Connecting to Microsoft Graph API...');

                    let allUsers = [];
                    let nextLink = "https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,userType,assignedLicenses,accountEnabled,signInActivity,department,jobTitle,companyName,createdDateTime&$filter=userType eq 'Member'&$top=999";

                    try {
                        while (nextLink) {
                            const response = await fetch(nextLink, {
                                headers: { 'Authorization': 'Bearer ' + cloudSession.graphToken }
                            });

                            if (!response.ok) {
                                throw new Error(`Graph API Error: ${response.status} ${response.statusText}`);
                            }

                            const data = await response.json();
                            const pageUsers = (data.value || []).map(user => ({
                                id: user.id,
                                displayName: user.displayName,
                                userPrincipalName: user.userPrincipalName,
                                mail: user.mail,
                                userType: user.userType || 'Member',
                                accountEnabled: user.accountEnabled !== false,
                                assignedLicenses: user.assignedLicenses || [],
                                signInActivity: user.signInActivity,
                                department: user.department,
                                jobTitle: user.jobTitle,
                                companyName: user.companyName,
                                createdDateTime: user.createdDateTime
                            }));

                            allUsers = allUsers.concat(pageUsers);
                            nextLink = data['@odata.nextLink'];

                            logProgress('ENTRA', `📡 Fetched ${pageUsers.length} users (Total: ${allUsers.length})...`);
                        }

                        sourceProgress.entra.endTime = Date.now();
                        sourceProgress.entra.count = allUsers.length;
                        sourceProgress.entra.status = 'success';
                        const duration = sourceProgress.entra.endTime - sourceProgress.entra.startTime;
                        logProgress('ENTRA', `✅ Successfully fetched ALL ${sourceProgress.entra.count} users in ${duration}ms`);

                        // Log license breakdown
                        const licenseBreakdown = {};
                        allUsers.forEach(user => {
                            user.assignedLicenses.forEach(license => {
                                licenseBreakdown[license.skuId] = (licenseBreakdown[license.skuId] || 0) + 1;
                            });
                        });

                        if (Object.keys(licenseBreakdown).length > 0) {
                            logProgress('ENTRA', `📊 License breakdown: ${Object.entries(licenseBreakdown).map(([sku, count]) => `${sku.substring(0, 8)}:${count}`).join(', ')}`);
                        }

                        return { users: allUsers };

                    } catch (err) {
                        sourceProgress.entra.endTime = Date.now();
                        sourceProgress.entra.status = 'error';
                        sourceProgress.entra.error = err.message;
                        logProgress('ENTRA', `❌ Failed: ${err.message}`, 'error');
                        return { users: [] };
                    }
                })() : (() => {
                    logProgress('ENTRA', '⏭️ Skipped - No cloud session available');
                    return Promise.resolve({ users: [] });
                })(),

                // Exchange Users (via Cloud Session)
                (() => {
                    if (cloudSession && cloudSession.vaultName && cloudSession.secretName) {
                        sourceProgress.exchange.status = 'loading';
                        sourceProgress.exchange.startTime = Date.now();
                        logProgress('EXCHANGE', 'Authenticating with Exchange Online...');

                        return (async () => {
                            try {
                                // 1. Get Exchange-specific Access Token (Scope: outlook.office365.com)
                                const { spawn } = await import('child_process');
                                const tokenScript = `
                                    $ErrorActionPreference = 'Stop'
                                    try {
                                        $secret = Get-AzKeyVaultSecret -VaultName '${cloudSession.vaultName}' -Name '${cloudSession.secretName}' -AsPlainText -ErrorAction Stop
                                        $body = @{
                                            grant_type = 'client_credentials'
                                            client_id = '${cloudSession.appId}'
                                            client_secret = $secret
                                            scope = 'https://outlook.office365.com/.default'
                                        }
                                        $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${cloudSession.tenantId}/oauth2/v2.0/token" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -ErrorAction Stop
                                        @{ status = 'success'; accessToken = $tokenResponse.access_token } | ConvertTo-Json -Compress
                                    } catch {
                                        @{ status = 'error'; detail = $_.Exception.Message } | ConvertTo-Json -Compress
                                    }
                                `;

                                const tokenResult = await new Promise((resolve) => {
                                    const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', tokenScript]);
                                    let stdout = '';
                                    ps.stdout.on('data', d => stdout += d);
                                    ps.on('close', () => {
                                        try { resolve(JSON.parse(stdout.trim())); } catch (e) { resolve({ status: 'error' }); }
                                    });
                                });

                                if (tokenResult.status !== 'success' || !tokenResult.accessToken) {
                                    throw new Error('Failed to acquire Exchange Access Token');
                                }

                                logProgress('EXCHANGE', 'Token acquired, fetching mailboxes...');

                                // 2. Call Fetch Mailboxes with valid token
                                return new Promise((resolve) => {
                                    const mockReq = {
                                        body: {
                                            tenantId: cloudSession.tenantId,
                                            appId: cloudSession.appId,
                                            organization: cloudSession.organization,
                                            accessToken: tokenResult.accessToken
                                        }
                                    };

                                    const mockRes = {
                                        json: (data) => {
                                            sourceProgress.exchange.endTime = Date.now();
                                            const mailboxes = data.mailboxes || [];
                                            sourceProgress.exchange.count = mailboxes.length;
                                            sourceProgress.exchange.status = 'success';

                                            const users = mailboxes.map(m => ({
                                                upn: m.userPrincipalName,
                                                email: m.primarySmtpAddress,
                                                displayName: m.displayName,
                                                exchangeData: {
                                                    mailboxType: m.recipientType,
                                                    lastActivity: m.lastLogonTime,
                                                    totalItemSize: m.totalItemSize
                                                },
                                                lastLogin: m.lastLogonTime || 'Never',
                                                sources: { ad: false, entra: false, exchange: true }
                                            }));

                                            const duration = sourceProgress.exchange.endTime - sourceProgress.exchange.startTime;
                                            logProgress('EXCHANGE', `✅ Fetched ${users.length} mailboxes in ${duration}ms`);
                                            resolve({ users });
                                        },
                                        status: (code) => ({
                                            json: (data) => {
                                                sourceProgress.exchange.status = 'error';
                                                logProgress('EXCHANGE', `❌ Failed: ${JSON.stringify(data)}`, 'error');
                                                resolve({ users: [] });
                                            }
                                        })
                                    };
                                    exchangeService.fetchMailboxes(mockReq, mockRes);
                                });

                            } catch (e) {
                                logProgress('EXCHANGE', `❌ Failed: ${e.message}`, 'error');
                                return { users: [] };
                            }
                        })();
                    } else {
                        logProgress('EXCHANGE', '⏭️ Skipped - No cloud session available');
                        return Promise.resolve({ users: [] });
                    }
                })()
            ]);

            // Process results with detailed logging
            logProgress('SYSTEM', '🔄 Processing and correlating user data...');

            const adResult = results[0].status === 'fulfilled' ? results[0].value : { users: [] };
            const entraResult = results[1].status === 'fulfilled' ? results[1].value : { users: [] };
            const exchangeResult = results[2].status === 'fulfilled' ? results[2].value : { users: [] };

            const adUsers = adResult.users || [];
            const entraUsers = entraResult.users || [];
            const exchangeUsers = exchangeResult.users || []; // Now populated

            logProgress('SYSTEM', `📊 Raw data collected: AD=${adUsers.length}, Entra=${entraUsers.length}, Exchange=${exchangeUsers.length}`);

            // Enhanced merge logic with detailed logging
            const allUsers = [...adUsers];
            let correlatedUsers = 0;
            let entraOnlyUsers = 0;

            logProgress('SYSTEM', '🔗 Starting user correlation process...');

            // Add Entra ID data to matching users and create Entra-only users
            entraUsers.forEach((entraUser, index) => {
                if (index % 100 === 0 && index > 0) {
                    logProgress('SYSTEM', `🔄 Processed ${index}/${entraUsers.length} Entra users...`);
                }

                const matchingAdUser = adUsers.find(adUser =>
                    adUser.upn?.toLowerCase() === entraUser.userPrincipalName?.toLowerCase() ||
                    adUser.email?.toLowerCase() === entraUser.userPrincipalName?.toLowerCase() ||
                    adUser.email?.toLowerCase() === entraUser.mail?.toLowerCase()
                );

                if (matchingAdUser) {
                    correlatedUsers++;
                    // Enhance existing AD user with Entra data
                    matchingAdUser.entraData = {
                        objectId: entraUser.id,
                        userType: entraUser.userType,
                        accountEnabled: entraUser.accountEnabled,
                        licenseAssignments: (entraUser.assignedLicenses || []).map(l => l.skuId || 'Unknown'),
                        lastSignIn: entraUser.signInActivity?.lastSignInDateTime ? new Date(entraUser.signInActivity.lastSignInDateTime) : undefined,
                        mfaEnabled: false, // Would need additional Graph API call
                        department: entraUser.department,
                        jobTitle: entraUser.jobTitle,
                        companyName: entraUser.companyName
                    };
                    matchingAdUser.sources = { ad: true, entra: true, exchange: false };

                    // Update fields with Entra data if AD data is missing
                    if (!matchingAdUser.department && entraUser.department) {
                        matchingAdUser.department = entraUser.department;
                    }
                    if (!matchingAdUser.email && entraUser.mail) {
                        matchingAdUser.email = entraUser.mail;
                    }
                } else {
                    entraOnlyUsers++;
                    // Create Entra-only user
                    allUsers.push({
                        id: entraUser.id,
                        name: entraUser.displayName || 'Unknown',
                        upn: entraUser.userPrincipalName,
                        email: entraUser.mail || entraUser.userPrincipalName,
                        samAccountName: entraUser.userPrincipalName?.split('@')[0] || '',
                        status: entraUser.accountEnabled ? 'Active' : 'Disabled',
                        department: entraUser.department,
                        distinguishedName: `CN=${entraUser.displayName},OU=Cloud Users,DC=entra,DC=microsoft,DC=com`,
                        lastLogin: entraUser.signInActivity?.lastSignInDateTime || 'Never',
                        createdDate: entraUser.createdDateTime || new Date().toISOString(),
                        lastPasswordSet: 'Cloud Managed',
                        sources: { ad: false, entra: true, exchange: false },
                        entraData: {
                            objectId: entraUser.id,
                            userType: entraUser.userType,
                            accountEnabled: entraUser.accountEnabled,
                            licenseAssignments: (entraUser.assignedLicenses || []).map(l => l.skuId || 'Unknown'),
                            lastSignIn: entraUser.signInActivity?.lastSignInDateTime ? new Date(entraUser.signInActivity.lastSignInDateTime) : undefined,
                            mfaEnabled: false,
                            department: entraUser.department,
                            jobTitle: entraUser.jobTitle,
                            companyName: entraUser.companyName
                        }
                    });
                }
            });

            logProgress('SYSTEM', `🔗 Correlation complete: ${correlatedUsers} matched, ${entraOnlyUsers} Entra-only users`);

            // Merge Exchange Data
            if (exchangeUsers.length > 0) {
                logProgress('SYSTEM', '🔗 Merging Exchange data...');
                let exchangeMatches = 0;
                exchangeUsers.forEach(exchangeUser => {
                    const upn = exchangeUser.upn?.toLowerCase();
                    if (!upn) return;

                    const match = allUsers.find(u =>
                        (u.upn?.toLowerCase() === upn) ||
                        (u.email?.toLowerCase() === upn)
                    );

                    if (match) {
                        exchangeMatches++;
                        match.sources.exchange = true;
                        match.exchangeData = exchangeUser.exchangeData;
                        // Prioritize Exchange LastLogonTime if newer or if existing is 'Never'
                        if (exchangeUser.lastLogin !== 'Never') {
                            const exDate = new Date(exchangeUser.lastLogin);
                            const existingDate = match.lastLogin === 'Never' ? new Date(0) : new Date(match.lastLogin);
                            if (exDate > existingDate) {
                                match.lastLogin = exchangeUser.lastLogin;
                            }
                        }
                    } else {
                        // Add Exchange-only user
                        allUsers.push({
                            ...exchangeUser,
                            name: exchangeUser.displayName || 'Exchange User',
                            status: 'Active',
                            sources: { ad: false, entra: false, exchange: true },
                            riskFactors: [],
                            recommendations: []
                        });
                    }
                });
                logProgress('SYSTEM', `🔗 Exchange merged: ${exchangeMatches} matched users`);
            }

            logProgress('SYSTEM', '🧠 Calculating enhanced user properties...');

            // Add enhanced properties to all users with progress logging
            let processedUsers = 0;
            allUsers.forEach((user, index) => {
                // Ensure required properties exist
                user.sources = user.sources || { ad: true, entra: false, exchange: false };
                user.riskFactors = user.riskFactors || [];
                user.recommendations = user.recommendations || [];

                // Calculate enhanced properties
                const upn = (user.userPrincipalName || user.upn || user.email || '').toLowerCase();
                const isTarget = upn.includes('target') || upn.includes('target.ae');
                user.isGuest = (user.entraData?.userType === 'Guest' || upn.includes('#ext#')) && !isTarget;
                user.isTarget = isTarget;
                user.isPrivileged = false; // Would need additional logic
                user.isServiceAccount = false; // Would need additional logic
                user.healthStatus = user.status === 'Active' ? 'Active' : 'Disabled';

                // Add basic risk factors
                if (user.isGuest) {
                    user.riskFactors.push('External guest user');
                }
                if (user.lastLogin === 'Never') {
                    user.riskFactors.push('Never logged in');
                }
                if (user.isTarget) {
                    user.riskFactors.push('Target user pattern detected');
                }

                processedUsers++;
                if (processedUsers % 500 === 0) {
                    logProgress('SYSTEM', `🧠 Enhanced ${processedUsers}/${allUsers.length} users...`);
                }
            });

            logProgress('SYSTEM', '📊 Generating summary statistics...');

            // Generate comprehensive summary
            const summary = {
                total: allUsers.length,
                // Exclude Guests and Targets from main status tiles
                enabled: allUsers.filter(u => u.status === 'Active' && !u.isGuest && !u.isTarget).length,
                disabled: allUsers.filter(u => u.status === 'Disabled' && !u.isGuest && !u.isTarget).length,
                withEmail: allUsers.filter(u => u.email && u.email.trim() !== '').length,
                neverLogin: allUsers.filter(u => u.lastLogin === 'Never' && !u.isGuest && !u.isTarget).length,
                guestUsers: allUsers.filter(u => u.isGuest).length,
                targetUsers: allUsers.filter(u => u.isTarget).length,
                multiSourceUsers: allUsers.filter(u => u.sources && Object.values(u.sources).filter(Boolean).length > 1).length,
                adUsers: adUsers.length,
                entraUsers: entraUsers.length,
                exchangeUsers: exchangeUsers.length,
                adOnlyUsers: allUsers.filter(u => u.sources?.ad && !u.sources?.entra && !u.sources?.exchange).length,
                entraOnlyUsers: allUsers.filter(u => !u.sources?.ad && u.sources?.entra && !u.sources?.exchange).length,
                allSourcesUsers: allUsers.filter(u => u.sources?.ad && u.sources?.entra && u.sources?.exchange).length,
                // License counts from Entra data
                licenseE5: allUsers.filter(u => u.entraData?.licenseAssignments?.some(l => l.includes('c7df2760-2c81-4ef7-b578-5b5392b571df'))).length,
                licenseE3: allUsers.filter(u => u.entraData?.licenseAssignments?.some(l => l.includes('6fd2c87f-b296-42f0-b197-1e91e994b900'))).length,
                licenseE1: allUsers.filter(u => u.entraData?.licenseAssignments?.some(l => l.includes('3b555118-da6a-4418-894f-7df1e2096870'))).length,
                licenseF3: allUsers.filter(u => u.entraData?.licenseAssignments?.some(l => l.includes('66b55226-6b4f-492c-910c-a3b7a3c9d993'))).length,
                noMfa: allUsers.filter(u => u.entraData && !u.entraData.mfaEnabled && !u.isGuest && !u.isTarget).length
            };

            const totalDuration = Date.now() - startTime;
            const successfulSources = [adUsers.length > 0, entraUsers.length > 0, false].filter(Boolean).length;

            logProgress('SYSTEM', `✅ Collection completed successfully!`);
            logProgress('SYSTEM', `📊 Final results: ${summary.total} total users (${summary.enabled} active, ${summary.disabled} disabled)`);
            logProgress('SYSTEM', `🔗 Multi-source breakdown: ${summary.adOnlyUsers} AD-only, ${summary.entraOnlyUsers} Entra-only, ${summary.multiSourceUsers} multi-source`);
            logProgress('SYSTEM', `⏱️ Total processing time: ${totalDuration}ms across ${successfulSources} sources`);

            res.json({
                status: 'success',
                users: allUsers,
                summary,
                sources: {
                    ad: {
                        success: adUsers.length > 0,
                        count: adUsers.length,
                        duration: sourceProgress.ad.endTime ? sourceProgress.ad.endTime - sourceProgress.ad.startTime : 0,
                        error: results[0].status === 'rejected' ? results[0].reason?.message : null
                    },
                    entra: {
                        success: entraUsers.length > 0,
                        count: entraUsers.length,
                        duration: sourceProgress.entra.endTime ? sourceProgress.entra.endTime - sourceProgress.entra.startTime : 0,
                        error: results[1].status === 'rejected' ? results[1].reason?.message : null
                    },
                    exchange: {
                        success: false,
                        count: 0,
                        duration: 0,
                        error: 'Not implemented yet'
                    }
                },
                performance: {
                    totalDuration,
                    sourcesAttempted: 3,
                    sourcesSuccessful: successfulSources,
                    correlatedUsers,
                    entraOnlyUsers,
                    averageProcessingTime: Math.round(totalDuration / allUsers.length)
                },
                fetchedAt: new Date().toISOString()
            });

        } catch (error) {
            console.error('Unified User Collection failed:', error);
            broadcastLog(`❌ Unified user collection failed: ${error.message}`, 'USER-INTELLIGENCE', 'error');
            res.status(500).json({
                status: 'error',
                error: 'Unified user collection failed',
                detail: error.message
            });
        }
    });
} else {
    console.log('🏗️ MODULAR: Skipping monolithic /api/users/unified (using modular version)');
}
app.post('/api/ad/users-paginated', validateHandshake, adService.fetchUsersPaginated); // Progressive loading
app.post('/api/ad/domain-info', validateHandshake, adService.getDomainInfo);
app.post('/api/ad/bulk-action', validateHandshake, adService.performBulkAction);

// --- COMPONENT HEALTH CHECKS ---
app.get('/api/ad/health', validateHandshake, async (req, res) => {
    try {
        const result = await runPs("if (Get-Module -ListAvailable -Name ActiveDirectory) { 'healthy' } else { 'missing_module' }");
        res.json({ status: result.output.trim() === 'healthy' ? 'online' : 'degraded', component: 'ActiveDirectory' });
    } catch (e) { res.status(500).json({ status: 'error', error: e.message }); }
});

app.get('/api/cloud/health', validateHandshake, async (req, res) => {
    try {
        const result = await runPs("Test-NetConnection -ComputerName graph.microsoft.com -Port 443 -InformationLevel Quiet");
        res.json({ status: result.output.trim().toLowerCase() === 'true' ? 'online' : 'unreachable', component: 'GraphAPI' });
    } catch (e) { res.status(500).json({ status: 'error', error: e.message }); }
});

app.get('/api/exchange/health', validateHandshake, async (req, res) => {
    try {
        const result = await runPs("if (Get-Module -ListAvailable -Name ExchangeOnlineManagement) { 'healthy' } else { 'missing_module' }");
        res.json({ status: result.output.trim() === 'healthy' ? 'online' : 'degraded', component: 'ExchangeOnline' });
    } catch (e) { res.status(500).json({ status: 'error', error: e.message }); }
});

// --- LDAP SERVICE ROUTES (Fast Fetching) ---
app.post('/api/ldap/users-paginated', validateHandshake, ldapService.fetchUsersLdap); // 10x faster
app.post('/api/ldap/user-count', validateHandshake, ldapService.getUserCountLdap); // Quick count

// --- CLOUD SERVICE ROUTES ---
app.post('/api/cloud/connect', validateHandshake, cloudService.connectCloud);
app.post('/api/cloud/connect-unified', validateHandshake, connectUnified);
app.post('/api/cloud/usage-report', validateHandshake, cloudService.getUsageReport);
app.post('/api/cloud/token', validateHandshake, async (req, res) => {
    // Simple Token Fetch for Frontend Collectors (supporting Client Secret)
    const { tenantId, clientId, clientSecret, scope = 'https://graph.microsoft.com/.default' } = req.body;
    if (!tenantId || !clientId || !clientSecret) {
        // Fallback to secure Vault route if params missing (handing off to next handler would be ideal but Express routes don't cascade on path match easily without next())
        // Since we are overwriting the path, we must handle both or rename.
        // The original /api/token (generic) is at line 85. 
        // This is /api/cloud/token (specific).
        return res.status(400).json({ error: 'Missing tenantId, clientId, or clientSecret' });
    }

    try {
        const { spawn } = await import('child_process');
        const psScript = `
            $body = @{
                grant_type = 'client_credentials'
                client_id = '${clientId}'
                client_secret = '${clientSecret}'
                scope = '${scope}'
            }
            $response = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded'
            @{ accessToken = $response.access_token } | ConvertTo-Json -Compress
        `;
        const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript]);
        let stdout = '', stderr = '';
        ps.stdout.on('data', d => stdout += d);
        ps.stderr.on('data', d => stderr += d);
        ps.on('close', (code) => {
            try { res.json(JSON.parse(stdout)); } catch (e) { res.status(500).json({ error: stderr || stdout }); }
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- EXCHANGE SERVICE ROUTES ---
import * as exchangeService from './gateway-exchange.js';
app.post('/api/exchange/mailboxes', validateHandshake, exchangeService.fetchMailboxes);
app.post('/api/exchange/activities', validateHandshake, exchangeService.fetchActivities);

// --- EXCHANGE ON-PREM SERVICE ROUTES ---
import * as exchangeOnPremService from './gateway-exchange-onprem.js';
app.post('/api/exchange-onprem/test', validateHandshake, exchangeOnPremService.testConnection);
app.post('/api/exchange-onprem/remote-mailboxes', validateHandshake, exchangeOnPremService.fetchRemoteMailboxes);


/**
 * GENERIC TOKEN FETCH
 * Used by modular features (Access Intelligence, etc.) to get Graph API tokens
 * Proxies the request securely using Key Vault credentials
 */
app.post('/api/token', validateHandshake, async (req, res) => {
    const { tenantId, clientId, vaultName, secretName, scope = 'https://graph.microsoft.com/.default' } = req.body;

    if (!tenantId || !clientId || !vaultName || !secretName) {
        return res.status(400).json({ error: 'Missing required credentials' });
    }

    const script = `
        $ErrorActionPreference = 'Stop'
        try {
            $secret = Get-AzKeyVaultSecret -VaultName '${vaultName}' -Name '${secretName}' -AsPlainText -ErrorAction Stop
            $body = @{
                grant_type = 'client_credentials'
                client_id = '${clientId}'
                client_secret = $secret
                scope = '${scope}'
            }
            $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -ErrorAction Stop
            @{ status = 'success'; accessToken = $tokenResponse.access_token } | ConvertTo-Json -Compress
        } catch {
            @{ status = 'error'; detail = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

    try {
        const { spawn } = await import('child_process');
        const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]);

        let stdout = '', stderr = '';
        ps.stdout.on('data', d => stdout += d);
        ps.stderr.on('data', d => stderr += d);

        ps.on('close', (code) => {
            try {
                const result = JSON.parse(stdout.trim());
                if (result.status === 'success') res.json({ accessToken: result.accessToken });
                else res.status(500).json({ error: result.detail });
            } catch (e) {
                res.status(500).json({ error: 'Failed to parse token response', detail: stderr || stdout });
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- POWERBI SERVICE ROUTES (Real Audit Logs) ---
if (!USE_MODULAR_POWERBI_ROUTES) {
    app.post('/api/powerbi/connect', validateHandshake, powerbiService.connectExchangeOnline);
    app.get('/api/powerbi/status', validateHandshake, powerbiService.getExchangeStatus);
    app.post('/api/powerbi/usage', validateHandshake, powerbiService.fetchPowerBIUsage);

    // --- POWERBI APP-ONLY ROUTES (Windows PowerShell 5.1) ---
    app.post('/api/powerbi/connect-app-only', validateHandshake, async (req, res) => {
        const { appId, tenantId, certificateThumbprint } = req.body;

        if (!appId || !tenantId || !certificateThumbprint) {
            return res.status(400).json({
                status: 'error',
                error: 'MISSING_PARAMETERS',
                detail: 'App ID, Tenant ID, and Certificate Thumbprint are required'
            });
        }

        // Real PowerShell execution for Exchange Online connection
        const authScript = `
        try {
            Import-Module ExchangeOnlineManagement -Force -ErrorAction Stop
            Connect-ExchangeOnline -AppId '${appId}' -CertificateThumbprint '${certificateThumbprint}' -Organization '${tenantId}' -ShowBanner:$false -ErrorAction Stop
            
            $connectionInfo = Get-ConnectionInformation -ErrorAction Stop | Select-Object -First 1
            if ($connectionInfo) {
                @{
                    status = 'success'
                    organization = $connectionInfo.Name
                    connectionId = $connectionInfo.ConnectionId
                    connectedAt = (Get-Date).ToString('o')
                } | ConvertTo-Json -Compress
            } else {
                throw "Connection verification failed"
            }
        } catch {
            @{ status = 'error'; error = 'EXO_AUTH_FAILED'; detail = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

        try {
            const { spawn } = await import('child_process');
            // Use Windows PowerShell 5.1 explicitly (not PowerShell 7)
            const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', authScript]);

            let stdout = '', stderr = '';
            ps.stdout.on('data', (data) => stdout += data.toString());
            ps.stderr.on('data', (data) => stderr += data.toString());

            ps.on('close', (code) => {
                try {
                    if (code === 0 && stdout.trim()) {
                        const result = JSON.parse(stdout.trim());
                        res.json(result);
                    } else {
                        res.status(500).json({
                            status: 'error',
                            error: 'POWERSHELL_FAILED',
                            detail: stderr.trim() || stdout.trim() || `Process exited with code ${code}`
                        });
                    }
                } catch (parseError) {
                    res.status(500).json({
                        status: 'error',
                        error: 'PARSE_ERROR',
                        detail: 'Failed to parse PowerShell output'
                    });
                }
            });
        } catch (error) {
            res.status(500).json({ status: 'error', error: 'CONNECTION_FAILED', detail: error.message });
        }
    });

    app.post('/api/powerbi/usage-app-only', validateHandshake, async (req, res) => {
        const { daysBack = 90 } = req.body;

        const auditScript = `
        try {
            $connection = Get-ConnectionInformation -ErrorAction Stop | Select-Object -First 1
            if (-not $connection) { throw "Not connected to Exchange Online" }
            
            $StartDate = (Get-Date).AddDays(-${daysBack})
            $EndDate = Get-Date
            $AuditLogs = Search-UnifiedAuditLog -StartDate $StartDate -EndDate $EndDate -RecordType PowerBIAudit -ResultSize 5000 -ErrorAction Stop
            
            if (-not $AuditLogs) {
                @{
                    status = 'success'; data = @(); summary = @{ totalRecords = 0; uniqueUsers = 0; dateRange = @{ start = $StartDate.ToString('yyyy-MM-dd'); end = $EndDate.ToString('yyyy-MM-dd'); daysBack = ${daysBack} } }
                    message = 'No PowerBI audit data found for the specified period'
                } | ConvertTo-Json -Compress -Depth 3
            } else {
                $ProcessedLogs = $AuditLogs | ForEach-Object {
                    @{ userIds = $_.UserIds; operations = $_.Operations; creationDate = $_.CreationDate.ToString('o'); clientIP = $_.ClientIP; workload = $_.Workload; objectId = $_.ObjectId }
                }
                $UniqueUsers = ($AuditLogs | Select-Object -ExpandProperty UserIds -Unique | Measure-Object).Count
                @{
                    status = 'success'; data = @($ProcessedLogs)
                    summary = @{ totalRecords = $AuditLogs.Count; uniqueUsers = $UniqueUsers; dateRange = @{ start = $StartDate.ToString('yyyy-MM-dd'); end = $EndDate.ToString('yyyy-MM-dd'); daysBack = ${daysBack} } }
                } | ConvertTo-Json -Compress -Depth 3
            }
        } catch {
            @{ status = 'error'; error = 'AUDIT_FETCH_FAILED'; detail = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

        try {
            const { spawn } = await import('child_process');
            // Use Windows PowerShell 5.1 explicitly (not PowerShell 7)
            const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', auditScript]);

            let stdout = '', stderr = '';
            ps.stdout.on('data', (data) => stdout += data.toString());
            ps.stderr.on('data', (data) => stderr += data.toString());

            ps.on('close', (code) => {
                try {
                    if (code === 0 && stdout.trim()) {
                        const result = JSON.parse(stdout.trim());
                        res.json(result);
                    } else {
                        res.status(500).json({
                            status: 'error',
                            error: 'POWERSHELL_FAILED',
                            detail: stderr.trim() || stdout.trim() || `Process exited with code ${code}`
                        });
                    }
                } catch (parseError) {
                    res.status(500).json({
                        status: 'error',
                        error: 'PARSE_ERROR',
                        detail: 'Failed to parse PowerShell output'
                    });
                }
            });
        } catch (error) {
            res.status(500).json({ status: 'error', error: 'FETCH_FAILED', detail: error.message });
        }
    });

    app.get('/api/powerbi/test-connection', validateHandshake, async (req, res) => {
        const testScript = `
        try {
            $connection = Get-ConnectionInformation -ErrorAction Stop | Select-Object -First 1
            if ($connection) {
                @{ status = 'success'; connected = $true; organization = $connection.Name; connectionId = $connection.ConnectionId } | ConvertTo-Json -Compress
            } else {
                @{ status = 'success'; connected = $false } | ConvertTo-Json -Compress
            }
        } catch {
            @{ status = 'success'; connected = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
    `;

        try {
            const { spawn } = await import('child_process');
            // Use Windows PowerShell 5.1 explicitly (not PowerShell 7)
            const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', testScript]);

            let stdout = '', stderr = '';
            ps.stdout.on('data', (data) => stdout += data.toString());
            ps.stderr.on('data', (data) => stderr += data.toString());

            ps.on('close', (code) => {
                try {
                    if (code === 0 && stdout.trim()) {
                        const result = JSON.parse(stdout.trim());
                        res.json(result);
                    } else {
                        res.json({ status: 'success', connected: false, error: stderr.trim() || 'Connection test failed' });
                    }
                } catch (parseError) {
                    res.json({ status: 'success', connected: false, error: 'Parse error' });
                }
            });
        } catch (error) {
            res.json({ status: 'success', connected: false, error: error.message });
        }
    });

    // --- POWERBI GRAPH API ROUTES (Uses Microsoft Graph Unified Audit Log) ---
    /**
     * Fetch PowerBI usage from Microsoft Graph Unified Audit Log
     * Uses AuditLogsQuery.Read.All permission
     * Supports 90+ days of audit history
     * Gets access token using Key Vault credentials
     */
    app.post('/api/powerbi/usage-graph', validateHandshake, async (req, res) => {
        const { tenantId, appId, vaultName, secretName, daysBack = 90 } = req.body;

        if (!tenantId || !appId || !vaultName || !secretName) {
            return res.status(400).json({
                status: 'error',
                error: 'MISSING_CREDENTIALS',
                detail: 'Cloud credentials required: tenantId, appId, vaultName, secretName'
            });
        }

        console.log('[POWERBI-GRAPH] Getting access token from Key Vault...');

        try {
            console.log('[POWERBI-GRAPH] Fetching PowerBI audit logs via Graph API...');
            console.log('[POWERBI-GRAPH] Days back:', daysBack);

            // Step 0: Get access token from Key Vault using PowerShell
            const { spawn } = await import('child_process');
            const tokenScript = `
            $ErrorActionPreference = 'Stop'
            try {
                # Use existing Azure context (user must be logged in via Connect-AzAccount)
                $secret = Get-AzKeyVaultSecret -VaultName '${vaultName}' -Name '${secretName}' -AsPlainText -ErrorAction Stop
                $body = @{
                    grant_type = 'client_credentials'
                    client_id = '${appId}'
                    client_secret = $secret
                    scope = 'https://graph.microsoft.com/.default'
                }
                $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -ErrorAction Stop
                @{ status = 'success'; accessToken = $tokenResponse.access_token } | ConvertTo-Json -Compress
            } catch {
                @{ status = 'error'; detail = $_.Exception.Message } | ConvertTo-Json -Compress
            }
        `;

            // Execute token acquisition
            const tokenResult = await new Promise((resolve) => {
                const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
                    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', tokenScript
                ]);
                let stdout = '', stderr = '';
                ps.stdout.on('data', (data) => stdout += data.toString());
                ps.stderr.on('data', (data) => stderr += data.toString());
                ps.on('close', (code) => {
                    try {
                        if (stdout.trim()) {
                            resolve(JSON.parse(stdout.trim()));
                        } else {
                            resolve({ status: 'error', detail: stderr || 'Token acquisition failed' });
                        }
                    } catch (e) {
                        resolve({ status: 'error', detail: 'Parse error: ' + (stderr || stdout) });
                    }
                });
            });

            if (tokenResult.status !== 'success' || !tokenResult.accessToken) {
                console.error('[POWERBI-GRAPH] Token acquisition failed:', tokenResult.detail);
                return res.status(401).json({
                    status: 'error',
                    error: 'TOKEN_FAILED',
                    detail: tokenResult.detail || 'Failed to acquire access token'
                });
            }

            const accessToken = tokenResult.accessToken;
            console.log('[POWERBI-GRAPH] Access token acquired successfully');

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - daysBack);
            const endDate = new Date();

            // Step 1: Create an async audit log query
            const createQueryResponse = await fetch('https://graph.microsoft.com/beta/security/auditLog/queries', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    displayName: `PowerBI Usage ${daysBack} Days`,
                    filterStartDateTime: startDate.toISOString(),
                    filterEndDateTime: endDate.toISOString(),
                    recordTypeFilters: ['powerBIAudit']
                })
            });

            if (!createQueryResponse.ok) {
                const errorText = await createQueryResponse.text();
                console.error('[POWERBI-GRAPH] Query creation failed:', errorText);
                return res.status(createQueryResponse.status).json({
                    status: 'error',
                    error: 'QUERY_CREATION_FAILED',
                    detail: errorText
                });
            }

            const queryResult = await createQueryResponse.json();
            const queryId = queryResult.id;
            console.log('[POWERBI-GRAPH] Query created with ID:', queryId);

            // Step 2: Poll for query completion (max 60 seconds)
            let queryStatus = 'running';
            let pollCount = 0;
            const maxPolls = 30; // 30 * 2 seconds = 60 seconds max

            while (queryStatus === 'running' && pollCount < maxPolls) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                pollCount++;

                const statusResponse = await fetch(`https://graph.microsoft.com/beta/security/auditLog/queries/${queryId}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (statusResponse.ok) {
                    const statusResult = await statusResponse.json();
                    queryStatus = statusResult.status;
                    console.log(`[POWERBI-GRAPH] Poll ${pollCount}: Status = ${queryStatus}`);
                }
            }

            if (queryStatus !== 'succeeded') {
                return res.status(408).json({
                    status: 'error',
                    error: 'QUERY_TIMEOUT',
                    detail: `Query did not complete in time. Status: ${queryStatus}`
                });
            }

            // Step 3: Fetch query results
            const recordsResponse = await fetch(`https://graph.microsoft.com/beta/security/auditLog/queries/${queryId}/records?$top=1000`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!recordsResponse.ok) {
                const errorText = await recordsResponse.text();
                return res.status(recordsResponse.status).json({
                    status: 'error',
                    error: 'FETCH_RECORDS_FAILED',
                    detail: errorText
                });
            }

            const recordsResult = await recordsResponse.json();
            const records = recordsResult.value || [];

            console.log(`[POWERBI-GRAPH] Retrieved ${records.length} audit records`);

            // Step 4: Process records - get latest activity per user
            const userMap = new Map();
            for (const record of records) {
                const userId = record.userPrincipalName || record.userId || 'Unknown';
                const creationDate = new Date(record.createdDateTime);

                if (!userMap.has(userId) || creationDate > userMap.get(userId).creationDate) {
                    userMap.set(userId, {
                        userIds: userId,
                        operations: record.operation || record.activity || 'Unknown',
                        creationDate: record.createdDateTime,
                        clientIP: record.clientIp || record.clientIP || 'N/A'
                    });
                }
            }

            const latestPerUser = Array.from(userMap.values());

            // Step 5: Calculate summary
            const operationCounts = {};
            for (const record of records) {
                const op = record.operation || record.activity || 'Unknown';
                operationCounts[op] = (operationCounts[op] || 0) + 1;
            }

            const topOperations = Object.entries(operationCounts)
                .map(([operation, count]) => ({ operation, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            res.json({
                status: 'success',
                data: latestPerUser,
                totalUsers: latestPerUser.length,
                dateRange: {
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0],
                    daysBack
                },
                summary: {
                    uniqueUsers: latestPerUser.length,
                    totalActivities: records.length,
                    topOperations
                },
                source: 'Microsoft Graph Unified Audit Log'
            });

        } catch (error) {
            console.error('[POWERBI-GRAPH] Error:', error);
            res.status(500).json({
                status: 'error',
                error: 'GRAPH_API_ERROR',
                detail: error.message
            });
        }
    });

    // --- POWERBI ACTIVITY EVENTS (Fast, synchronous, 28 days max) ---
    /**
     * Fetch PowerBI usage from Power BI Admin Activity Events API
     * Uses /v1.0/myorg/admin/activityevents - SYNCHRONOUS (instant response)
     * Limited to 28 days but much faster than Graph API
     */
    app.post('/api/powerbi/activity-events', validateHandshake, async (req, res) => {
        const { tenantId, appId, vaultName, secretName, daysBack = 28 } = req.body;
        const actualDays = Math.min(daysBack, 28); // Max 28 days

        if (!tenantId || !appId || !vaultName || !secretName) {
            return res.status(400).json({
                status: 'error',
                error: 'MISSING_CREDENTIALS',
                detail: 'Cloud credentials required'
            });
        }

        console.log('[POWERBI-ACTIVITY] Fetching PowerBI activity events...');
        console.log('[POWERBI-ACTIVITY] Days back:', actualDays);

        try {
            const { spawn } = await import('child_process');

            // PowerShell script to get PowerBI activity events
            const script = `
            $ErrorActionPreference = 'Stop'
            try {
                # Get client secret from Key Vault
                $secret = Get-AzKeyVaultSecret -VaultName '${vaultName}' -Name '${secretName}' -AsPlainText -ErrorAction Stop
                
                # Get Power BI access token
                $body = @{
                    grant_type = 'client_credentials'
                    client_id = '${appId}'
                    client_secret = $secret
                    resource = 'https://analysis.windows.net/powerbi/api'
                }
                $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${tenantId}/oauth2/token" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -ErrorAction Stop
                $token = $tokenResponse.access_token
                
                # Fetch activity events for each day (API requires same-day queries)
                $headers = @{
                    'Authorization' = "Bearer $token"
                    'Content-Type' = 'application/json'
                }
                
                $allEvents = @()
                $endDate = Get-Date
                
                $unauthorized = $false

                 for ($i = 0; $i -lt ${actualDays}; $i++) {
                    if ($unauthorized) { break }

                    $dayStart = $endDate.AddDays(-$i).Date.ToUniversalTime()
                    $dayEnd = $dayStart.AddDays(1).AddSeconds(-1)
                    
                    $startStr = $dayStart.ToString("yyyy-MM-ddTHH:mm:ssZ")
                    $endStr = $dayEnd.ToString("yyyy-MM-ddTHH:mm:ssZ")
                    
                    $url = "https://api.powerbi.com/v1.0/myorg/admin/activityevents?startDateTime='$startStr'&endDateTime='$endStr'"
                    
                    try {
                        $response = Invoke-RestMethod -Uri $url -Headers $headers -Method GET -ErrorAction Stop
                        if ($response.activityEventEntities) {
                            $allEvents += $response.activityEventEntities
                        }
                        
                        # Handle continuation token
                        while ($response.continuationUri) {
                            $response = Invoke-RestMethod -Uri $response.continuationUri -Headers $headers -Method GET -ErrorAction Stop
                            if ($response.activityEventEntities) {
                                $allEvents += $response.activityEventEntities
                            }
                        }
                    } catch {
                        # Detect Unauthorized (401) specifically
                        if ($_.Exception.Response.StatusCode -eq 401) {
                            $unauthorized = $true
                            break
                        }
                        # Skip days with no data (404 is normal)
                        elseif ($_.Exception.Response.StatusCode -ne 404) {
                            Write-Warning "Failed to fetch day $i : $_"
                        }
                    }
                }
                
                # If Unauthorized, return specific error immediately
                if ($unauthorized) {
                    @{
                        status = 'error'
                        error = 'UNAUTHORIZED'
                        detail = "Service Principal is not authorized. Enable 'Allow service principals to use Power BI APIs' in Power BI Admin Portal -> Tenant Settings."
                    } | ConvertTo-Json -Compress
                    exit
                }
                
                # Process - get latest activity per user (*rest of processing*)
                $userMap = @{}
                foreach ($event in $allEvents) {
                    $userId = $event.UserId
                    $creationTime = [DateTime]$event.CreationTime
                    
                    if (-not $userMap.ContainsKey($userId) -or $creationTime -gt [DateTime]$userMap[$userId].CreationTime) {
                        $userMap[$userId] = @{
                            userIds = $userId
                            operations = $event.Operation
                            creationDate = $event.CreationTime
                            activity = $event.Activity
                        }
                    }
                }
                
                $latestPerUser = $userMap.Values | ForEach-Object { $_ }
                
                @{
                    status = 'success'
                    data = $latestPerUser
                    summary = @{
                        uniqueUsers = $latestPerUser.Count
                        totalActivities = $allEvents.Count
                    }
                    totalUsers = $latestPerUser.Count
                    source = 'Power BI Activity Events API'
                } | ConvertTo-Json -Depth 10 -Compress
                
            } catch {
                @{ status = 'error'; detail = $_.Exception.Message } | ConvertTo-Json -Compress
            }
        `;

            const result = await new Promise((resolve) => {
                const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
                    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script
                ]);
                let stdout = '', stderr = '';
                ps.stdout.on('data', (data) => stdout += data.toString());
                ps.stderr.on('data', (data) => stderr += data.toString());
                ps.on('close', (code) => {
                    try {
                        if (stdout.trim()) {
                            resolve(JSON.parse(stdout.trim()));
                        } else {
                            resolve({ status: 'error', detail: stderr || 'Script failed' });
                        }
                    } catch (e) {
                        resolve({ status: 'error', detail: 'Parse error: ' + (stderr || stdout) });
                    }
                });
            });

            if (result.status === 'success') {
                console.log(`[POWERBI-ACTIVITY] Retrieved ${result.totalUsers} users, ${result.totalActivities} events`);
                res.json(result);
            } else {
                console.error('[POWERBI-ACTIVITY] Failed:', result.detail);
                res.status(500).json(result);
            }

        } catch (error) {
            console.error('[POWERBI-ACTIVITY] Error:', error);
            res.status(500).json({
                status: 'error',
                error: 'ACTIVITY_API_ERROR',
                detail: error.message
            });
        }
    });

    // --- OFFICE 365 MANAGEMENT ACTIVITY API (PowerBI Audit Logs - 90+ days) ---
    /**
     * Fetch PowerBI usage using Office 365 Management Activity API
     * Production-ready headless approach with Audit.PowerBI content type
     * Supports 90+ days history, retry logic, and throttling handling
     */
    app.post('/api/powerbi/management-activity', validateHandshake, async (req, res) => {
        const { tenantId, appId, vaultName, secretName, certThumbprint, organization, daysBack = 90 } = req.body;

        if (!tenantId || !appId || (!certThumbprint && (!vaultName || !secretName))) {
            return res.status(400).json({
                status: 'error',
                error: 'MISSING_CREDENTIALS',
                detail: 'Cloud connect required: (tenantId, appId) AND (certThumbprint OR vaultName/secretName)'
            });
        }

        console.log('='.repeat(60));
        console.log('[MGMT-API] Office 365 Management Activity API request');
        console.log('[MGMT-API] Days back:', daysBack);
        console.log('[MGMT-API] Content type: Audit.PowerBI');
        console.log('='.repeat(60));

        try {
            const { spawn } = await import('child_process');

            // PowerShell script using Management Activity API OR Search-UnifiedAuditLog (Fallback)
            let script;

            if (req.body.certThumbprint) {
                console.log('[MGMT-API] Using Certificate Auth (Search-UnifiedAuditLog Strategy)');
                const certThumbprint = req.body.certThumbprint;

                script = `
                $ErrorActionPreference = 'Stop'
                $VerbosePreference = 'Continue'

                # Fix PSModulePath to avoid PS7 conflicts
                $env:PSModulePath = [System.Environment]::GetFolderPath('MyDocuments') + '\\WindowsPowerShell\\Modules;' + 'C:\\Program Files\\WindowsPowerShell\\Modules;' + 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'
                
                try {
                    Write-Host "=== POWERBI CERTIFICATE AUTH (DIRECT) ===" -ForegroundColor Cyan
                    Write-Host "Starting at: $(Get-Date)" -ForegroundColor Gray

                    # Step 1: Import Module
                    Write-Host "[STEP 1] Loading ExchangeOnlineManagement..." -ForegroundColor Yellow
                    Import-Module ExchangeOnlineManagement -ErrorAction Stop
                    
                    # Step 2: Connect
                    Write-Host "[STEP 2] Connecting to Exchange Online..." -ForegroundColor Yellow
                    Connect-ExchangeOnline -CertificateThumbprint '${certThumbprint}' -AppId '${appId}' -Organization '${organization}' -ShowBanner:$false -ErrorAction Stop
                    Write-Host "[OK] Connected" -ForegroundColor Green

                    # Step 3: Search Unified Audit Log
                    Write-Host "[STEP 3] Searching Unified Audit Log (Live Query)..." -ForegroundColor Yellow
                    $StartDate = (Get-Date).AddDays(-${daysBack})
                    $EndDate = Get-Date
                    
                    $AuditLogs = Search-UnifiedAuditLog -StartDate $StartDate -EndDate $EndDate -RecordType PowerBIAudit -ResultSize 5000 -ErrorAction Stop
                    Write-Host "[OK] Found $($AuditLogs.Count) records" -ForegroundColor Green
                    
                    # Step 4: Process & Return
                    $UserMap = @{}
                    foreach ($Log in $AuditLogs) {
                        try {
                            $AuditData = $Log.AuditData | ConvertFrom-Json
                            $UserId = $Log.UserIds
                            
                            # Simple Dedupe
                            if (-not $UserMap.ContainsKey($UserId)) {
                                $UserMap[$UserId] = @{
                                    userIds = $UserId
                                    operations = $Log.Operations
                                    creationDate = $Log.CreationDate.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
                                    workload = 'PowerBI'
                                    clientIP = if ($AuditData.ClientIP) { $AuditData.ClientIP } else { "N/A" }
                                }
                            }
                        } catch {}
                    }
                    
                    $LatestPerUser = @($UserMap.Values)

                    @{
                        status = 'success'
                        # Use 'direct_data' to signla Node to skip fetch
                        direct_data = $LatestPerUser
                        summary = @{
                            uniqueUsers = $LatestPerUser.Count
                            totalActivities = $AuditLogs.Count
                        }
                    } | ConvertTo-Json -Compress

                } catch {
                     Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
                     @{
                        status = 'error'
                        error = 'PS_EXECUTION_ERROR'
                        detail = $_.Exception.Message
                     } | ConvertTo-Json -Compress
                }
            `;
            } else {
                console.log('[MGMT-API] Using Key Vault Auth (Management API Strategy)');
                // EXISTING LOGIC (KEY VAULT)
                script = `
            $ErrorActionPreference = 'Stop'
            # Fix PSModulePath to avoid PS7 conflicts
            $env:PSModulePath = [System.Environment]::GetFolderPath('MyDocuments') + '\\WindowsPowerShell\\Modules;' + 'C:\\Program Files\\WindowsPowerShell\\Modules;' + 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'
            
            try {
                # Get client secret from Key Vault
                $secret = Get-AzKeyVaultSecret -VaultName '${vaultName}' -Name '${secretName}' -AsPlainText -ErrorAction Stop
                
                # Get Management API access token
                $body = @{
                    grant_type = 'client_credentials'
                    client_id = '${appId}'
                    client_secret = $secret
                    scope = 'https://manage.office.com/.default'
                }
                $tokenResponse = Invoke-RestMethod -Uri "https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -ErrorAction Stop
                $token = $tokenResponse.access_token
                
                $headers = @{
                    'Authorization' = "Bearer $token"
                    'Content-Type' = 'application/json'
                }
                
                # Step 1: Start subscription (Audit.PowerBI)
                $targetContentType = "Audit.PowerBI"
                try {
                    $subUrl = "https://manage.office.com/api/v1.0/${tenantId}/activity/feed/subscriptions/start?contentType=Audit.PowerBI"
                    $subResult = Invoke-RestMethod -Uri $subUrl -Headers $headers -Method Post -ErrorAction Stop
                } catch {
                    # Smart Fallback
                     $statusCode = $_.Exception.Response.StatusCode.value__
                     if ($statusCode -eq 400) { $targetContentType = "Audit.General" }
                }

                # Step 2: Date Range
                if ($targetContentType -eq 'Audit.General' -and ${daysBack} -gt 1) { $actualDaysBack = 1 } else { $actualDaysBack = ${daysBack} }
                
                $requestEndTime = (Get-Date).ToUniversalTime()
                $requestStartTime = (Get-Date).AddDays(-$actualDaysBack).ToUniversalTime()

                # Step 3: List Blobs
                $content = @()
                $chunkStart = $requestStartTime
                while ($chunkStart -lt $requestEndTime) {
                    $chunkEnd = $chunkStart.AddHours(24)
                    if ($chunkEnd -gt $requestEndTime) { $chunkEnd = $requestEndTime }
                    $startStr = $chunkStart.ToString("yyyy-MM-ddTHH:mm:ss")
                    $endStr = $chunkEnd.ToString("yyyy-MM-ddTHH:mm:ss")
                    
                    try {
                        $listUrl = "https://manage.office.com/api/v1.0/${tenantId}/activity/feed/subscriptions/content?contentType=$targetContentType&startTime=$startStr&endTime=$endStr"
                        $page = Invoke-RestMethod -Uri $listUrl -Headers $headers -Method Get -ErrorAction Stop
                        if ($page) { $content += $page }
                    } catch {}
                    $chunkStart = $chunkEnd
                }

                if (-not $content) {
                     @{ status = 'success'; data = @(); message = 'No data' } | ConvertTo-Json -Compress
                     return
                }

                @{
                    status = 'partial_success'
                    step = 'blobs_listed'
                    token = $token
                    contentblobs = $content
                } | ConvertTo-Json -Compress
                
            } catch {
                @{ status = 'error'; detail = $_.Exception.Message } | ConvertTo-Json -Compress
            }
            `;
            }

            console.log('[MGMT-API] Executing Management API script via Windows PowerShell 5.1...');

            // Execute using Windows PowerShell 5.1 (like other PowerBI endpoints)
            const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-ExecutionPolicy', 'Bypass',
                '-Command', script
            ]);

            let stdout = '', stderr = '';
            ps.stdout.on('data', d => stdout += d);
            ps.stderr.on('data', d => stderr += d);

            const psResult = await new Promise((resolve) => {
                ps.on('close', (code) => {
                    if (code !== 0 && !stdout) {
                        resolve({ status: 'error', error: 'PowerShell execution failed', detail: stderr });
                    } else {
                        resolve({ status: 'success', output: stdout });
                    }
                });
            });

            if (psResult.status === 'error') {
                console.error('[MGMT-API] Script Execution Failed:', psResult.error, psResult.detail);
                return res.status(500).json({ error: 'PowerShell Execution Failed', detail: psResult.detail });
            }

            // Clean output to find the JSON
            const rawOutput = psResult.output || '';
            const jsonStartIndex = rawOutput.indexOf('{');

            if (jsonStartIndex === -1) {
                console.error('[MGMT-API] No JSON found in output:', rawOutput);
                return res.status(500).json({ error: 'Invalid Backend Response', detail: rawOutput });
            }

            const cleanJson = rawOutput.substring(jsonStartIndex);
            let parsedResult;

            try {
                parsedResult = JSON.parse(cleanJson);
            } catch (e) {
                console.error('Failed to parse PS output:', cleanJson);
                return res.status(500).json({ error: 'JSON Parse Error', detail: cleanJson });
            }

            if (parsedResult.status === 'error') {
                return res.status(400).json(parsedResult);
            }

            // Direct Data Mode (Certificate Auth / Search-UnifiedAuditLog)
            if (parsedResult.direct_data) {
                console.log(`[PWR-BI] Direct Data Received: ${parsedResult.direct_data.length} records`);
                return res.json({
                    status: 'success',
                    data: parsedResult.direct_data,
                    summary: parsedResult.summary
                });
            }

            // If content blobs found, use Node.js Accelerator
            if (parsedResult.contentblobs && parsedResult.contentblobs.length > 0) {
                console.log(`[NODE-ACCEL] Starting parallel fetch of ${parsedResult.contentblobs.length} blobs...`);

                const accessToken = parsedResult.token;
                const blobs = parsedResult.contentblobs;
                let allEvents = [];

                // CONCURRENCY LIMIT: 50
                // This is significantly faster than PowerShell's sequential loop
                const CONCURRENCY = 50;
                for (let i = 0; i < blobs.length; i += CONCURRENCY) {
                    const chunk = blobs.slice(i, i + CONCURRENCY);
                    const promises = chunk.map(blob =>
                        fetch(blob.contentUri, {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json'
                            }
                        })
                            .then(res => {
                                if (!res.ok) console.log(`[FORENSIC] Fetch Error: ${res.status} ${res.statusText}`);
                                return res.ok ? res.json() : null;
                            })
                            .catch(e => {
                                console.log(`[FORENSIC] Network Error:`, e.message);
                                return null;
                            })
                    );

                    const results = await Promise.all(promises);

                    // FORENSIC LOGGING: Inspect the first event of the first non-empty chunk
                    let forensicLogDone = false;

                    results.forEach((events, index) => {
                        if (events && Array.isArray(events) && events.length > 0) {
                            if (!forensicLogDone) {
                                const sample = events[0];
                                console.log('[FORENSIC] RAW SAMPLE EVENT:', JSON.stringify(sample));
                                console.log('[FORENSIC] Checking Filter Fields:');
                                console.log(`  - Workload: '${sample.Workload}' (Type: ${typeof sample.Workload})`);
                                console.log(`  - RecordType: '${sample.RecordType}' (Type: ${typeof sample.RecordType})`);
                                console.log(`  - CreationTime: '${sample.CreationTime}'`);
                                forensicLogDone = true;
                            }

                            // Filter Logic
                            const validEvents = events.filter(e => {
                                // Loose matching for robustness
                                const isPowerBI = (e.Workload && e.Workload.trim() === 'PowerBI') || Number(e.RecordType) === 20;
                                if (!isPowerBI && !forensicLogDone) {
                                    // Log why we skipped the first mismatch
                                    console.log(`[FORENSIC] SKIPPED: Workload='${e.Workload}', RecordType='${e.RecordType}'`);
                                }
                                return isPowerBI;
                            });
                            allEvents.push(...validEvents);
                        }
                    });
                }

                console.log(`[NODE-ACCEL] Fetched ${allEvents.length} Power BI events.`);

                // Aggregation - Latest per user
                const userMap = new Map();
                allEvents.forEach(event => {
                    if (event.UserId) {
                        const existing = userMap.get(event.UserId);
                        const newDate = new Date(event.CreationTime);

                        if (!existing || newDate > new Date(existing.creationDate)) {
                            userMap.set(event.UserId, {
                                userIds: event.UserId,
                                operations: event.Operation,
                                creationDate: event.CreationTime,
                                activity: event.Activity,
                                workload: 'PowerBI'
                            });
                        }
                    }
                });

                const latestPerUser = Array.from(userMap.values());

                res.json({
                    status: 'success',
                    data: latestPerUser,
                    summary: {
                        uniqueUsers: latestPerUser.length,
                        totalActivities: allEvents.length
                    },
                    dateRange: parsedResult.dateRange,
                    source: 'Office 365 Management Activity API (Node Accelerated)',
                    latencyNote: 'Audit logs may take several hours to appear'
                });

            } else {
                // Return empty success
                res.json({
                    status: 'success',
                    data: [],
                    summary: { uniqueUsers: 0, totalActivities: 0 },
                    message: parsedResult.message || "No content blobs found."
                });
            }

        } catch (error) {
            console.error('[MGMT-API] Exception:', error);
            res.status(500).json({
                status: 'error',
                error: 'SERVER_ERROR',
                detail: error.message
            });
        }
    });

    // --- POWERBI CERTIFICATE-BASED AUTH (App-only, no user interaction) ---
    /**
     * Fetch PowerBI usage using Search-UnifiedAuditLog with certificate auth
     * Uses app-only authentication - works in headless environments
     * Supports 90+ days history
     */

    app.post('/api/powerbi/certificate-audit', validateHandshake, async (req, res) => {
        const { daysBack = 90, appId, organization, certThumbprint } = req.body;

        console.log('='.repeat(60));
        console.log('[POWERBI-CERT] Certificate-based audit request');
        console.log('[POWERBI-CERT] Days back:', daysBack);
        console.log('[POWERBI-CERT] App ID:', appId);
        console.log('[POWERBI-CERT] Organization:', organization);
        console.log('[POWERBI-CERT] Thumbprint:', certThumbprint ? certThumbprint.substring(0, 8) + '...' : 'N/A');
        console.log('='.repeat(60));

        if (!appId || !organization || !certThumbprint) {
            console.log('[POWERBI-CERT] ERROR: Missing required parameters');
            return res.status(400).json({
                status: 'error',
                error: 'MISSING_PARAMS',
                detail: 'Required: appId, organization, certThumbprint'
            });
        }

        try {
            const { spawn } = await import('child_process');

            // PowerShell script with certificate-based Exchange Online auth
            const script = `
            $ErrorActionPreference = 'Stop'
            $VerbosePreference = 'Continue'

            # Fix PSModulePath to avoid PS7 conflicts
            $env:PSModulePath = [System.Environment]::GetFolderPath('MyDocuments') + '\\WindowsPowerShell\\Modules;' + 'C:\\Program Files\\WindowsPowerShell\\Modules;' + 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'
            
            Write-Host "=== POWERBI CERTIFICATE AUTH ===" -ForegroundColor Cyan
            Write-Host "Starting at: $(Get-Date)" -ForegroundColor Gray
            
            try {
                # Step 1: Import Exchange Online module
                Write-Host "[STEP 1] Loading ExchangeOnlineManagement module..." -ForegroundColor Yellow
                Import-Module ExchangeOnlineManagement -ErrorAction Stop
                Write-Host "[OK] Module loaded" -ForegroundColor Green
                
                # Step 3: Connect to Exchange Online with certificate
                Write-Host "[STEP 3] Connecting to Exchange Online..." -ForegroundColor Yellow
                Write-Host "  AppId: ${appId}" -ForegroundColor Gray
                Write-Host "  Organization: ${organization}" -ForegroundColor Gray
                Write-Host "  Thumbprint: ${certThumbprint}" -ForegroundColor Gray
                
                Connect-ExchangeOnline -CertificateThumbprint '${certThumbprint}' -AppId '${appId}' -Organization '${organization}' -ShowBanner:$false -ErrorAction Stop
                
                Write-Host "[OK] Connected to Exchange Online" -ForegroundColor Green
                
                # Step 4: Search Unified Audit Log
                Write-Host "[STEP 4] Searching Unified Audit Log for PowerBI events..." -ForegroundColor Yellow
                $StartDate = (Get-Date).AddDays(-${daysBack})
                $EndDate = Get-Date
                Write-Host "  Date range: $StartDate to $EndDate" -ForegroundColor Gray
                
                $AuditLogs = Search-UnifiedAuditLog -StartDate $StartDate -EndDate $EndDate -RecordType PowerBIAudit -ResultSize 5000 -ErrorAction Stop
                
                Write-Host "[OK] Search completed. Found $($AuditLogs.Count) records" -ForegroundColor Green
                
                # Step 5: Disconnect
                Write-Host "[STEP 5] Disconnecting..." -ForegroundColor Yellow
                Disconnect-ExchangeOnline -Confirm:$false -ErrorAction SilentlyContinue
                Write-Host "[OK] Disconnected" -ForegroundColor Green
                
                # Step 6: Process results
                if (-not $AuditLogs -or $AuditLogs.Count -eq 0) {
                    Write-Host "[INFO] No PowerBI audit events found" -ForegroundColor Yellow
                    @{
                        status = 'success'
                        data = @()
                        totalUsers = 0
                        totalActivities = 0
                        message = 'No PowerBI audit events found in date range'
                        source = 'Exchange Online Unified Audit Log (Certificate Auth)'
                    } | ConvertTo-Json -Compress
                    return
                }
                
                Write-Host "[STEP 6] Processing $($AuditLogs.Count) records..." -ForegroundColor Yellow
                
                $UserMap = @{}
                foreach ($Log in $AuditLogs) {
                    try {
                        $AuditData = $Log.AuditData | ConvertFrom-Json
                        $UserId = $Log.UserIds
                        
                        if (-not $UserMap.ContainsKey($UserId)) {
                            $UserMap[$UserId] = @{
                                userIds = $UserId
                                operations = $Log.Operations
                                creationDate = $Log.CreationDate.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
                                activity = $Log.Operations
                                clientIP = if ($AuditData.ClientIP) { $AuditData.ClientIP } else { "N/A" }
                            }
                        }
                    } catch {}
                }
                
                $LatestPerUser = @($UserMap.Values)
                Write-Host "[OK] Processed. Unique users: $($LatestPerUser.Count)" -ForegroundColor Green
                
                @{
                    status = 'success'
                    data = $LatestPerUser
                    summary = @{
                        uniqueUsers = $LatestPerUser.Count
                        totalActivities = $AuditLogs.Count
                        daysBack = ${daysBack}
                    }
                    source = 'Exchange Online Unified Audit Log (Certificate Auth)'
                } | ConvertTo-Json -Depth 10 -Compress
                
            } catch {
                Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "[ERROR] Stack: $($_.ScriptStackTrace)" -ForegroundColor Red
                
                # Try to disconnect on error
                try { Disconnect-ExchangeOnline -Confirm:$false -ErrorAction SilentlyContinue } catch {}

                @{
                    status = 'error'
                    error = 'EXO_ERROR'
                    detail = $_.Exception.Message
                    stack = $_.ScriptStackTrace
                } | ConvertTo-Json -Compress
            }
        `;

            console.log('[POWERBI-CERT] Executing PowerShell script...');

            const result = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.log('[POWERBI-CERT] TIMEOUT after 120 seconds');
                    resolve({ status: 'error', detail: 'Timeout - operation took too long' });
                }, 120000);

                // Use Windows PowerShell 5.1 for Exchange module compatibility
                const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
                    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script
                ]);

                let stdout = '', stderr = '';

                ps.stdout.on('data', (data) => {
                    const text = data.toString();
                    stdout += text;
                    // Log progress to console
                    text.split('\\n').forEach(line => {
                        if (line.trim()) console.log('[PS]', line.trim());
                    });
                });

                ps.stderr.on('data', (data) => {
                    const text = data.toString();
                    stderr += text;
                    console.log('[PS-ERR]', text);
                });

                ps.on('close', (code) => {
                    clearTimeout(timeout);
                    console.log('[POWERBI-CERT] PowerShell exited with code:', code);

                    try {
                        // Find the JSON output (last JSON object in stdout)
                        const jsonMatch = stdout.match(/\{[^{}]*("status"|"error")[^{}]*\}/g);
                        if (jsonMatch && jsonMatch.length > 0) {
                            const lastJson = jsonMatch[jsonMatch.length - 1];
                            resolve(JSON.parse(lastJson));
                        } else if (stdout.includes('{')) {
                            // Try to extract any JSON
                            const start = stdout.lastIndexOf('{');
                            const end = stdout.lastIndexOf('}');
                            if (start !== -1 && end > start) {
                                resolve(JSON.parse(stdout.substring(start, end + 1)));
                            } else {
                                resolve({ status: 'error', detail: 'No JSON in output', stdout: stdout.substring(0, 500) });
                            }
                        } else {
                            resolve({ status: 'error', detail: stderr || 'No output', stdout: stdout.substring(0, 500) });
                        }
                    } catch (e) {
                        console.log('[POWERBI-CERT] JSON parse error:', e.message);
                        resolve({
                            status: 'error',
                            detail: 'Parse error: ' + e.message,
                            stdout: stdout.substring(0, 500),
                            stderr: stderr.substring(0, 500)
                        });
                    }
                });
            });

            console.log('[POWERBI-CERT] Result status:', result.status);

            if (result.status === 'success') {
                console.log(`[POWERBI-CERT] ✅ SUCCESS - ${result.totalUsers} users, ${result.totalActivities} activities`);
                res.json(result);
            } else {
                console.log('[POWERBI-CERT] ❌ FAILED:', result.detail || result.error);
                res.status(500).json(result);
            }

        } catch (error) {
            console.error('[POWERBI-CERT] Exception:', error);
            res.status(500).json({
                status: 'error',
                error: 'SERVER_ERROR',
                detail: error.message
            });
        }
    });


    // --- POWERBI INTERACTIVE DELEGATED LOGIN ---
    /**
     * Fetch PowerBI usage using Search-UnifiedAuditLog with INTERACTIVE delegated login
     * 
     * CRITICAL: Search-UnifiedAuditLog ONLY works with delegated user login.
     * NOT with app-only, certificate, or Graph API.
     * 
     * Flow:
     * 1. Spawn ONE Windows PowerShell 5.1 process
     * 2. Run Connect-ExchangeOnline (browser opens for user login)
     * 3. In SAME session, run Search-UnifiedAuditLog
     * 4. Return JSON results
     * 
     * Supports 90+ days history
     */
    app.post('/api/powerbi/interactive-audit', validateHandshake, async (req, res) => {
        const { daysBack = 90 } = req.body;

        console.log('='.repeat(60));
        console.log('[POWERBI-INTERACTIVE] Interactive delegated login request');
        console.log('[POWERBI-INTERACTIVE] Days back:', daysBack);
        console.log('[POWERBI-INTERACTIVE] Browser will open for Exchange Online login...');
        console.log('='.repeat(60));

        try {
            const { spawn } = await import('child_process');

            // PowerShell script: Connect + Search in SAME session (MANDATORY)
            // IMPORTANT: Override PSModulePath to avoid PS7 module conflicts
            const script = `
$ErrorActionPreference = 'Stop'
            
            # Fix PSModulePath to use only Windows PowerShell 5.1 modules(avoid PS7 conflicts)
$env: PSModulePath = [System.Environment]:: GetFolderPath('MyDocuments') + '\\WindowsPowerShell\\Modules;' +
    'C:\\Program Files\\WindowsPowerShell\\Modules;' +
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\Modules'

Write - Host "=== POWERBI INTERACTIVE AUDIT ===" - ForegroundColor Cyan
Write - Host "Starting at: $(Get-Date)" - ForegroundColor Gray
Write - Host ""

try {
                # Step 1: Import Exchange Online module
    Write - Host "[STEP 1] Loading ExchangeOnlineManagement module..." - ForegroundColor Yellow
    Import - Module ExchangeOnlineManagement - ErrorAction Stop
    Write - Host "[OK] Module loaded" - ForegroundColor Green
                
                # Step 2: Connect to Exchange Online(INTERACTIVE - browser opens)
    Write - Host "[STEP 2] Connecting to Exchange Online..." - ForegroundColor Yellow
    Write - Host ">>> Browser will open for login <<<" - ForegroundColor Magenta
    Connect - ExchangeOnline - UseWebLogin
    Write - Host "[OK] Connected to Exchange Online" - ForegroundColor Green
                
                # Step 3: Search Unified Audit Log(SAME SESSION - CRITICAL!)
    Write - Host "[STEP 3] Searching Unified Audit Log for PowerBI events..." - ForegroundColor Yellow
    $StartDate = (Get - Date).AddDays(-${daysBack})
    $EndDate = Get - Date
    Write - Host "  Date range: $($StartDate.ToString('yyyy-MM-dd')) to $($EndDate.ToString('yyyy-MM-dd'))" - ForegroundColor Gray

    $AuditLogs = Search - UnifiedAuditLog - StartDate $StartDate - EndDate $EndDate - RecordType PowerBIAudit - ResultSize 5000 - ErrorAction Stop

    Write - Host "[OK] Search completed. Found $($AuditLogs.Count) records" - ForegroundColor Green
                
                # Step 4: Disconnect
    Write - Host "[STEP 4] Disconnecting..." - ForegroundColor Yellow
    Disconnect - ExchangeOnline - Confirm: $false - ErrorAction SilentlyContinue
    Write - Host "[OK] Disconnected" - ForegroundColor Green
                
                # Step 5: Process results
    if (-not $AuditLogs - or $AuditLogs.Count - eq 0) {
        Write - Host "[INFO] No PowerBI audit events found" - ForegroundColor Yellow
        @{
            status = 'success'
                        data = @()
                        totalUsers = 0
                        totalActivities = 0
                        message = 'No PowerBI audit events found in date range'
                        source = 'Exchange Unified Audit Log'
        } | ConvertTo - Json - Compress
        return
    }

    Write - Host "[STEP 5] Processing $($AuditLogs.Count) records..." - ForegroundColor Yellow
                
                # Deduplicate - latest activity per user
    $LatestPerUser = $AuditLogs |
        Sort - Object UserIds, { [datetime]$_.CreationDate } - Descending |
            Group - Object UserIds |
                ForEach - Object { $_.Group | Select - Object - First 1 } |
                    ForEach - Object {
        $AuditData = $null
        try { $AuditData = $_.AuditData | ConvertFrom - Json } catch { }
        @{
            userIds = $_.UserIds
                            operations = $_.Operations
                            creationDate = $_.CreationDate.ToString("yyyy-MM-ddTHH:mm:ssZ")
                            clientIP = if($AuditData.ClientIP) { $AuditData.ClientIP } else { 'N/A' }
    }
}
                
                Write - Host "[OK] Processed. Unique users: $($LatestPerUser.Count)" - ForegroundColor Green

@{
    status = 'success'
                    data = @($LatestPerUser)
                    totalUsers = $LatestPerUser.Count
                    totalActivities = $AuditLogs.Count
                    dateRange = @{
        start = $StartDate.ToString("yyyy-MM-dd")
                        end = $EndDate.ToString("yyyy-MM-dd")
                        daysBack = ${daysBack}
                    }
source = 'Exchange Unified Audit Log'
                } | ConvertTo - Json - Depth 10 - Compress
                
            } catch {
    Write - Host "[ERROR] $($_.Exception.Message)" - ForegroundColor Red
                
                # Try to disconnect on error
    try { Disconnect - ExchangeOnline - Confirm: $false - ErrorAction SilentlyContinue } catch { }

    @{
        status = 'error'
                    error = 'EXO_ERROR'
                    detail = $_.Exception.Message
    } | ConvertTo - Json - Compress
}
`;

            console.log('[POWERBI-INTERACTIVE] Executing PowerShell 5.1 script...');
            console.log('[POWERBI-INTERACTIVE] Waiting for user to complete browser login...');

            const result = await new Promise((resolve) => {
                // 5 minute timeout for interactive login
                const timeout = setTimeout(() => {
                    console.log('[POWERBI-INTERACTIVE] TIMEOUT after 300 seconds');
                    resolve({ status: 'error', detail: 'Timeout - login may have been cancelled' });
                }, 300000);

                // Use Windows PowerShell 5.1 (REQUIRED for Exchange module)
                const ps = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', [
                    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script
                ]);

                let stdout = '', stderr = '';

                ps.stdout.on('data', (data) => {
                    const text = data.toString();
                    stdout += text;
                    // Log progress to console
                    text.split('\n').forEach(line => {
                        if (line.trim()) console.log('[PS]', line.trim());
                    });
                });

                ps.stderr.on('data', (data) => {
                    const text = data.toString();
                    stderr += text;
                    console.log('[PS-ERR]', text);
                });

                ps.on('close', (code) => {
                    clearTimeout(timeout);
                    console.log('[POWERBI-INTERACTIVE] PowerShell exited with code:', code);

                    try {
                        // Find JSON in stdout (last occurrence)
                        const start = stdout.lastIndexOf('{');
                        const end = stdout.lastIndexOf('}');
                        if (start !== -1 && end > start) {
                            resolve(JSON.parse(stdout.substring(start, end + 1)));
                        } else {
                            resolve({ status: 'error', detail: stderr || 'No JSON output' });
                        }
                    } catch (e) {
                        console.log('[POWERBI-INTERACTIVE] JSON parse error:', e.message);
                        resolve({
                            status: 'error',
                            detail: 'Parse error: ' + e.message + ' | ' + stderr.substring(0, 200)
                        });
                    }
                });
            });

            console.log('[POWERBI-INTERACTIVE] Result status:', result.status);

            if (result.status === 'success') {
                console.log(`[POWERBI - INTERACTIVE] ✅ SUCCESS - ${result.totalUsers} users, ${result.totalActivities} activities`);
                res.json(result);
            } else {
                console.log('[POWERBI-INTERACTIVE] ❌ FAILED:', result.detail || result.error);
                res.status(500).json(result);
            }

        } catch (error) {
            console.error('[POWERBI-INTERACTIVE] Exception:', error);
            res.status(500).json({
                status: 'error',
                error: 'SERVER_ERROR',
                detail: error.message
            });
        }
    });

    // End of PowerBI Routes Block
}

// 🏗️ MODULAR ARCHITECTURE - PHASE 2: POWERBI ROUTES
if (USE_MODULAR_POWERBI_ROUTES) {
    import('./src/routes/powerbi.routes.js').then(module => {
        app.use('/api/powerbi', module.default);
        console.log('🏗️ MODULAR: PowerBI routes mounted at /api/powerbi/*');
    }).catch(err => {
        console.error("🚨 CRITICAL: Failed to load PowerBI routes:", err);
    });
}

// --- EMBEDDED TERMINAL ROUTES (No auth required for terminal commands) ---
app.post('/api/terminal/execute', terminalService.executeTerminalCommand);
app.get('/api/terminal/commands', terminalService.getTerminalCommands);
app.post('/api/terminal/interactive', terminalService.startInteractiveSession);

// --- AI SERVICE ROUTES ---
app.post('/api/ai/generate', validateHandshake, aiService.generateAIContent);

// --- CA EXCLUSION INSPECTOR (MODULAR) ---
app.use('/api/ca', validateHandshake, caRoutes);

// --- UNIFIED DEVICE INVENTORY (MODULAR) ---
app.use('/api/devices', validateHandshake, deviceRoutes);

// --- PASSWORD TOOLS (MODULAR) ---
app.use('/api/password', validateHandshake, passwordRoutes);

// 🏗️ MODULAR ARCHITECTURE - PHASE 1: USER ROUTES TEST CASE
// Conditionally mount modular user routes if feature flag is enabled
if (USE_MODULAR_USER_ROUTES && userRoutes) {
    app.use('/api/users', validateHandshake, userRoutes);
    console.log('🏗️ MODULAR: User routes mounted at /api/users/*');
    console.log('🏗️ MODULAR: /api/users/unified now served by modular route');
}

// --- TERMINAL EXECUTION (SIMPLIFIED) ---
app.post('/api/ps/execute', validateHandshake, async (req, res) => {
    try {
        const { command } = req.body;

        // Basic validation only
        validateTerminalCommand(command);

        const result = await runPs(command);
        res.json(result);
    } catch (error) {
        console.warn(`[SECURITY] Command blocked: ${error.message} `);
        res.status(400).json({
            status: 'error',
            error: 'Command Validation Failed',
            detail: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🛡️  Hyperion Gateway[${ENGINE_VERSION}]- SECURITY HARDENED`);
    console.log(`------------------------------------------- `);
    console.log(`🚀 Master Orchestrator: http://localhost:${PORT}`);
    console.log(`✅ Core Engine         : LOCKED (ESM)`);
    console.log(`🔒 Security Level      : HARDENED`);
    console.log(`📡 AD/LDAP Service     : READY`);
    console.log(`☁️  Cloud Graph Service : READY`);
    console.log(`🤖 AI Proxy Service    : READY`);
    console.log(`-------------------------------------------\n`);
});
