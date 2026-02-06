/**
 * HYPERION SYSTEM ROUTES MODULE
 * Health checks and system status endpoints
 */
import express from 'express';
import { ENGINE_VERSION } from '../gateway-config.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: ENGINE_VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// System status endpoint
router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    version: ENGINE_VERSION,
    modules: {
      ad: 'ready',
      cloud: 'ready', 
      ai: 'ready',
      terminal: 'ready'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;