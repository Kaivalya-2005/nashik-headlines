// =========================================
// AGENT CONTROLLER
// Handles agent control and article workflow
// =========================================

const {
    Article,
    RawArticle,
    AgentExecution,
    AgentLog,
    User,
    sequelize
} = require('../models');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Global agent process reference
let agentProcess = null;
let currentExecution = null;

// ===== 1. START SCRAPING =====
exports.startScraping = async (req, res) => {
    try {
        // Check if already running
        if (agentProcess) {
            return res.status(400).json({ 
                message: 'Agent is already running',
                status: 'RUNNING'
            });
        }

        // Create execution record
        const execution = await AgentExecution.create({
            execution_type: 'SCRAPE',
            status: 'PENDING',
            initiated_by: req.user.id
        });

        currentExecution = execution;

        // Start manus_agents scraping in background
        const agentPath = path.join(__dirname, '../../manus_agents/run_agents.py');
        
        agentProcess = spawn('python3', [agentPath, '--once'], {
            detached: true,
            stdio: 'pipe'
        });

        // Update execution to RUNNING
        await execution.update({
            status: 'RUNNING',
            started_at: new Date()
        });

        agentProcess.on('exit', async (code) => {
            // Cleanup and update execution
            agentProcess = null;
            
            if (execution) {
                const duration = Math.floor((Date.now() - execution.started_at) / 1000);
                await execution.update({
                    status: code === 0 ? 'COMPLETED' : 'FAILED',
                    completed_at: new Date(),
                    duration_seconds: duration
                });
            }
        });

        res.status(200).json({
            message: 'Scraping started',
            executionId: execution.id,
            status: 'RUNNING'
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error starting scraping',
            error: error.message
        });
    }
};

// ===== 2. STOP SCRAPING =====
exports.stopScraping = async (req, res) => {
    try {
        if (!agentProcess) {
            return res.status(400).json({
                message: 'No scraping process is running'
            });
        }

        // Kill the process
        process.kill(-agentProcess.pid);
        agentProcess = null;

        // Update execution
        if (currentExecution) {
            const duration = Math.floor((Date.now() - currentExecution.started_at) / 1000);
            await currentExecution.update({
                status: 'STOPPED',
                completed_at: new Date(),
                duration_seconds: duration
            });
        }

        res.status(200).json({
            message: 'Scraping stopped successfully'
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error stopping scraping',
            error: error.message
        });
    }
};

// ===== 3. PAUSE EXECUTION =====
exports.pauseExecution = async (req, res) => {
    try {
        if (!agentProcess) {
            return res.status(400).json({
                message: 'No scraping process is running'
            });
        }

        if (currentExecution) {
            await currentExecution.update({ status: 'PAUSED' });
        }

        res.status(200).json({
            message: 'Scraping paused',
            executionId: currentExecution?.id
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error pausing scraping',
            error: error.message
        });
    }
};

// ===== 4. RESUME EXECUTION =====
exports.resumeExecution = async (req, res) => {
    try {
        if (!currentExecution) {
            return res.status(400).json({
                message: 'No paused execution found'
            });
        }

        await currentExecution.update({ status: 'RUNNING' });

        res.status(200).json({
            message: 'Scraping resumed',
            executionId: currentExecution.id
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error resuming scraping',
            error: error.message
        });
    }
};

// ===== 5. GET AGENT STATUS =====
exports.getAgentStatus = async (req, res) => {
    try {
        // Get latest execution
        const latestExecution = await AgentExecution.findOne({
            order: [['created_at', 'DESC']],
            include: [{ model: User, as: 'initiator', attributes: ['id', 'name', 'email'] }]
        });

        // Get draft articles count
        const draftCount = await Article.count({
            where: { status: 'DRAFT_SCRAPED' }
        });

        // Get pending approval count
        const pendingCount = await Article.count({
            where: { status: 'PENDING_APPROVAL' }
        });

        res.status(200).json({
            isRunning: agentProcess !== null,
            currentStatus: currentExecution?.status || 'IDLE',
            latestExecution: latestExecution,
            draftArticlesCount: draftCount,
            pendingApprovalCount: pendingCount,
            timestamp: new Date()
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error getting agent status',
            error: error.message
        });
    }
};

// ===== 6. GET AGENT LOGS =====
exports.getAgentLogs = async (req, res) => {
    try {
        const { limit = 50, offset = 0, agent_name = null } = req.query;

        const where = {};
        if (agent_name) where.agent_name = agent_name;

        const logs = await AgentLog.findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.status(200).json({
            total: logs.count,
            logs: logs.rows,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error fetching agent logs',
            error: error.message
        });
    }
};

// ===== 7. GET DRAFT ARTICLES (For Review) =====
exports.getDraftArticles = async (req, res) => {
    try {
        const { status = 'DRAFT_SCRAPED', limit = 20, offset = 0 } = req.query;

        const articles = await Article.findAndCountAll({
            where: { status },
            include: [
                { model: User, as: 'createdByUser', attributes: ['id', 'name', 'email'] },
                { model: RawArticle, as: 'rawArticle', attributes: ['url', 'published_date'] },
                { model: Image, as: 'images' }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.status(200).json({
            total: articles.count,
            articles: articles.rows,
            status,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error fetching draft articles',
            error: error.message
        });
    }
};

// ===== 8. APPROVE ARTICLE =====
exports.approveArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes = '' } = req.body;

        const article = await Article.findByPk(id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        await article.update({
            status: 'APPROVED',
            approved_by: req.user.id,
            updated_by: req.user.id,
            updated_at: new Date()
        });

        // Log the approval
        await AgentLog.create({
            agent_name: 'ADMIN',
            operation: 'APPROVE_ARTICLE',
            article_id: id,
            status: 'SUCCESS',
            details: { notes }
        });

        res.status(200).json({
            message: 'Article approved successfully',
            article
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error approving article',
            error: error.message
        });
    }
};

// ===== 9. REJECT ARTICLE =====
exports.rejectArticle = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason = '' } = req.body;

        const article = await Article.findByPk(id);

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        await article.update({
            status: 'REJECTED',
            updated_by: req.user.id,
            generation_error: reason,
            updated_at: new Date()
        });

        // Log the rejection
        await AgentLog.create({
            agent_name: 'ADMIN',
            operation: 'REJECT_ARTICLE',
            article_id: id,
            status: 'SUCCESS',
            details: { reason }
        });

        res.status(200).json({
            message: 'Article rejected successfully',
            article
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error rejecting article',
            error: error.message
        });
    }
};

// ===== 10. GET EXECUTION HISTORY =====
exports.getAgentExecutionHistory = async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const executions = await AgentExecution.findAndCountAll({
            include: [{ model: User, as: 'initiator', attributes: ['id', 'name', 'email'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.status(200).json({
            total: executions.count,
            executions: executions.rows,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error fetching execution history',
            error: error.message
        });
    }
};

// ===== 11. CONFIGURE AGENT =====
exports.configureAgent = async (req, res) => {
    try {
        const {
            scrape_interval_minutes,
            auto_approve_articles,
            enable_image_generation,
            max_concurrent_scrapes
        } = req.body;

        // Update admin settings in database
        // This would be done through ConfigSetting model or admin_settings table
        // For now, we'll just return success

        res.status(200).json({
            message: 'Agent configured successfully',
            config: {
                scrape_interval_minutes,
                auto_approve_articles,
                enable_image_generation,
                max_concurrent_scrapes
            }
        });

    } catch (error) {
        res.status(500).json({
            message: 'Error configuring agent',
            error: error.message
        });
    }
};
