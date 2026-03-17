// =========================================
// AGENT CONTROL ROUTES & CONTROLLERS
// Admin controls for manus_agents integration
// =========================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { roleCheck } = require('../middleware/roleMiddleware');
const {
    startScraping,
    stopScraping,
    pauseExecution,
    resumeExecution,
    getAgentStatus,
    getAgentLogs,
    getDraftArticles,
    approveArticle,
    rejectArticle,
    getAgentExecutionHistory,
    configureAgent
} = require('../controllers/agentController');

// All agent routes require authentication and ADMIN role
router.use(protect);
router.use(roleCheck(['ADMIN']));

// ===== AGENT CONTROL =====
router.post('/start-scraping', startScraping);
router.post('/stop-scraping', stopScraping);
router.post('/pause', pauseExecution);
router.post('/resume', resumeExecution);

// ===== AGENT STATUS & MONITORING =====
router.get('/status', getAgentStatus);
router.get('/logs', getAgentLogs);
router.get('/execution-history', getAgentExecutionHistory);

// ===== ARTICLE WORKFLOW (Draft Review) =====
router.get('/draft-articles', getDraftArticles);
router.post('/articles/:id/approve', approveArticle);
router.post('/articles/:id/reject', rejectArticle);

// ===== CONFIGURATION =====
router.post('/configure', configureAgent);

module.exports = router;
