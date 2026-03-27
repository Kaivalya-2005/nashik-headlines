import api from './api';

const getArticles = async (page = 1) => {
    const response = await api.get('/admin/articles', {
        params: { page }
    });
    return response.data;
};

const getArticle = async (id) => {
    const response = await api.get(`/admin/articles/${id}`);
    return response.data;
};

const createArticle = async (data) => {
    const response = await api.post('/admin/articles', data);
    return response.data;
};

const updateArticle = async (id, data) => {
    const response = await api.put(`/admin/articles/${id}`, data);
    return response.data;
};

const deleteArticle = async (id) => {
    const response = await api.delete(`/admin/articles/${id}`);
    return response.data;
};

const approveArticle = async (id) => {
    const response = await api.post(`/admin/articles/${id}/approve`);
    return response.data;
};

const rejectArticle = async (id) => {
    const response = await api.post(`/admin/articles/${id}/reject`);
    return response.data;
};

const publishArticle = async (id) => {
    const response = await api.post(`/admin/articles/${id}/publish`);
    return response.data;
};

const uploadImages = async (id, files) => {
    const formData = files instanceof FormData ? files : (() => {
        const fd = new FormData();
        (files || []).forEach(file => fd.append('images', file));
        return fd;
    })();

    const response = await api.post(`/admin/articles/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
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
    uploadImages
};

export default articleService;
