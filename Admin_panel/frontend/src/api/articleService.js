import api from './api';

const getArticles = async (page = 1, pageSize = 10, status = null) => {
    const params = { page, pageSize };
    if (status) params.status = status;
    const response = await api.get('/articles', { params });
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

const generateContent = async (id) => {
    const response = await api.post(`/articles/${id}/generate`);
    return response.data;
};

const getStatus = async (id) => {
    const response = await api.get(`/articles/${id}/status`);
    return response.data;
};

const analyzeSEO = async (id) => {
    const response = await api.post(`/articles/${id}/seo/analyze`);
    return response.data;
};

const improveSEO = async (id) => {
    const response = await api.post(`/articles/${id}/seo/improve`);
    return response.data;
};

const uploadImages = async (id, files) => {
    const formData = new FormData();
    if (files instanceof FormData) {
        return await api.post(`/articles/${id}/images`, files);
    } else {
        (files || []).forEach(file => formData.append('images', file));
        return await api.post(`/articles/${id}/images`, formData);
    }
};

const pushToWordPress = async (id) => {
    const response = await api.post(`/articles/${id}/push-to-wp`);
    return response.data;
};

const articleService = {
    getArticles,
    getArticle,
    createArticle,
    updateArticle,
    deleteArticle,
    generateContent,
    getStatus,
    analyzeSEO,
    improveSEO,
    uploadImages,
    pushToWordPress
};

export default articleService;
