import api from './api';

// Agent Control
const startScraping = async () => {
    const response = await api.post('/agents/start-scraping');
    return response.data;
};

const stopScraping = async () => {
    const response = await api.post('/agents/stop-scraping');
    return response.data;
};

const pause = async () => {
    const response = await api.post('/agents/pause');
    return response.data;
};

const resume = async () => {
    const response = await api.post('/agents/resume');
    return response.data;
};

// Status & Monitoring
const getStatus = async () => {
    const response = await api.get('/agents/status');
    return response.data;
};

const getLogs = async (limit = 50, offset = 0) => {
    const response = await api.get('/agents/logs', {
        params: { limit, offset }
    });
    return response.data;
};

const getExecutionHistory = async (limit = 20, offset = 0) => {
    const response = await api.get('/agents/execution-history', {
        params: { limit, offset }
    });
    return response.data;
};

// Draft Review & Workflow
const getDraftArticles = async (limit = 20, offset = 0) => {
    const response = await api.get('/agents/draft-articles', {
        params: { limit, offset }
    });
    return response.data;
};

const approveArticle = async (id) => {
    const response = await api.post(`/agents/articles/${id}/approve`);
    return response.data;
};

const rejectArticle = async (id) => {
    const response = await api.post(`/agents/articles/${id}/reject`);
    return response.data;
};

// Configuration
const configure = async (config) => {
    const response = await api.post('/agents/configure', config);
    return response.data;
};

const agentService = {
    startScraping,
    stopScraping,
    pause,
    resume,
    getStatus,
    getLogs,
    getExecutionHistory,
    getDraftArticles,
    approveArticle,
    rejectArticle,
    configure
};

export default agentService;
