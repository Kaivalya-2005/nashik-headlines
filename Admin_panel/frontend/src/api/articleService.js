import api from './api';

const getArticles = async (page = 1) => {
    const response = await api.get('/articles', {
        params: { page }
    });
    return response.data;
};

const getArticle = async (id) => {
    const response = await api.get(`/articles/${id}`);
    return response.data;
};

const createArticle = async (data) => {
    const response = await api.post('/articles', data);
    return response.data;
};

const updateArticle = async (id, data) => {
    const response = await api.put(`/articles/${id}`, data);
    return response.data;
};

const deleteArticle = async (id) => {
    const response = await api.delete(`/articles/${id}`);
    return response.data;
};

const approveArticle = async (id) => {
    const response = await api.put(`/articles/${id}/approve`);
    return response.data;
};

const rejectArticle = async (id) => {
    const response = await api.post(`/articles/${id}/reject`);
    return response.data;
};

const publishArticle = async (id, body = {}) => {
    const response = await api.put(`/articles/${id}/publish`, body);
    return response.data;
};

const scheduleArticle = async (id, body) => {
    const response = await api.put(`/articles/${id}/schedule`, body);
    return response.data;
};

const getPublishLog = async (id) => {
    const response = await api.get(`/publish/log/${id}`);
    return response.data;
};

const getPortals = async () => {
    const response = await api.get('/portals');
    return response.data;
};

const updatePortal = async (id, data) => {
    const response = await api.put(`/portals/${id}`, data);
    return response.data;
};

const testPortalConnection = async (portalId) => {
    const response = await api.post('/portals/test', { portal_id: portalId });
    return response.data;
};

const uploadImages = async (id, files) => {
    const formData = files instanceof FormData ? files : (() => {
        const fd = new FormData();
        (files || []).forEach(file => fd.append('images', file));
        return fd;
    })();

    const response = await api.post(`/articles/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
        // Handle both old format (array) and new format (object with images property)
        return response.data.images || response.data;
};

const articleService = {
    getArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    approveArticle,
    rejectArticle,
    publishArticle,
    scheduleArticle,
    uploadImages,
    getPublishLog,
    getPortals,
    updatePortal,
    testPortalConnection,
};

export default articleService;
