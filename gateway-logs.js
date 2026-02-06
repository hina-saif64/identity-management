/**
 * Backend Log Streaming Service
 * Uses Server-Sent Events (SSE) to push logs to frontend
 */

// Store connected clients
const clients = new Set();

// Log buffer for recent logs
const logBuffer = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Add log to buffer and broadcast to all connected clients
 */
export const broadcastLog = (module, message, level = 'info') => {
    const log = {
        timestamp: new Date().toISOString(),
        module,
        message,
        level
    };

    // Add to buffer
    logBuffer.push(log);
    if (logBuffer.length > MAX_BUFFER_SIZE) {
        logBuffer.shift();
    }

    // Also log to console
    console.log(`[${module}] ${message}`);

    // Broadcast to all connected clients
    const data = `data: ${JSON.stringify(log)}\n\n`;
    clients.forEach(res => {
        res.write(data);
    });
};

/**
 * SSE endpoint handler
 * GET /api/logs/stream
 */
export const handleLogStream = (req, res) => {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send recent logs from buffer
    logBuffer.forEach(log => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    // Add client to set
    clients.add(res);

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);

    // Remove client on close
    req.on('close', () => {
        clients.delete(res);
        clearInterval(heartbeat);
    });
};

/**
 * Helper to create a logger for a specific module
 */
export const createModuleLogger = (moduleName) => ({
    info: (message) => broadcastLog(moduleName, message, 'info'),
    success: (message) => broadcastLog(moduleName, message, 'success'),
    warning: (message) => broadcastLog(moduleName, message, 'warning'),
    error: (message) => broadcastLog(moduleName, message, 'error')
});

export default {
    broadcastLog,
    handleLogStream,
    createModuleLogger
};
