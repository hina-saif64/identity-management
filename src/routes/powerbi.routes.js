// PowerBI Routes - Modular Architecture
import express from 'express';

const router = express.Router();

// PowerBI Usage Analytics endpoint
router.get('/usage', async (req, res) => {
    try {
        // This would normally fetch from PowerBI API
        // For now, return mock data
        res.json({
            status: 'success',
            data: {
                totalUsers: 0,
                activeReports: 0,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('PowerBI usage error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch PowerBI usage data'
        });
    }
});

// PowerBI Health Check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'PowerBI Routes',
        timestamp: new Date().toISOString()
    });
});

export default router;