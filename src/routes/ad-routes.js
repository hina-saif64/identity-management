/**
 * HYPERION AD/LDAP ROUTES MODULE
 * All Active Directory related endpoints
 */
import express from 'express';
import * as adService from '../gateway-ad.js';

const router = express.Router();

// Test AD connection
router.post('/test', async (req, res) => {
  try {
    await adService.testConnection(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: 'AD Connection Test Failed', 
      detail: error.message,
      module: 'AD-Routes'
    });
  }
});

// Get domain information (OUs, UPN suffixes)
router.post('/domain-info', async (req, res) => {
  try {
    await adService.getDomainInfo(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: 'Domain Info Failed', 
      detail: error.message,
      module: 'AD-Routes'
    });
  }
});

// Fetch users with filters
router.post('/users', async (req, res) => {
  try {
    await adService.fetchUsers(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: 'User Fetch Failed', 
      detail: error.message,
      module: 'AD-Routes'
    });
  }
});

// Perform bulk actions on users
router.post('/bulk-action', async (req, res) => {
  try {
    await adService.performBulkAction(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: 'Bulk Action Failed', 
      detail: error.message,
      module: 'AD-Routes'
    });
  }
});

export default router;