/**
 * HYPERION TERMINAL/POWERSHELL ROUTES MODULE
 * All PowerShell execution endpoints
 */
import express from 'express';
import { runPs, validateTerminalCommand } from '../gateway-core.js';

const router = express.Router();

// Execute PowerShell command
router.post('/execute', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid Command', 
        detail: 'Command is required and must be a string',
        module: 'Terminal-Routes'
      });
    }

    // Validate command for security
    const validation = validateTerminalCommand(command);
    if (!validation.allowed) {
      return res.status(403).json({ 
        error: 'Command Blocked', 
        detail: validation.reason,
        module: 'Terminal-Routes'
      });
    }

    const result = await runPs(command);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'PowerShell Execution Failed', 
      detail: error.message,
      module: 'Terminal-Routes'
    });
  }
});

export default router;