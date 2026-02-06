/**
 * HYPERION CLOUD/GRAPH ROUTES MODULE
 * All Microsoft Graph and Cloud related endpoints
 */
import express from 'express';
import * as cloudService from '../gateway-cloud.js';

const router = express.Router();

// Connect to Microsoft Graph
router.post('/connect', async (req, res) => {
  try {
    await cloudService.connectCloud(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: 'Cloud Connection Failed', 
      detail: error.message,
      module: 'Cloud-Routes'
    });
  }
});

// Get usage report
router.post('/usage-report', async (req, res) => {
  try {
    await cloudService.getUsageReport(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: 'Usage Report Failed', 
      detail: error.message,
      module: 'Cloud-Routes'
    });
  }
});

// Get PowerBI usage data
router.post('/powerbi-usage', async (req, res) => {
  try {
    await cloudService.fetchPowerBIUsage(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: 'PowerBI Usage Failed', 
      detail: error.message,
      module: 'Cloud-Routes'
    });
  }
});

export default router;