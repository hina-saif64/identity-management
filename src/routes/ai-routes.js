/**
 * HYPERION AI/GEMINI ROUTES MODULE
 * All AI and content generation endpoints
 */
import express from 'express';
import * as aiService from '../gateway-ai.js';

const router = express.Router();

// Generate AI content
router.post('/generate', async (req, res) => {
  try {
    await aiService.generateAIContent(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: 'AI Generation Failed', 
      detail: error.message,
      module: 'AI-Routes'
    });
  }
});

export default router;