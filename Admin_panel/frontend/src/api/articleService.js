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
    console.log('[articleService] PUT /articles/' + id);
    const response = await api.put(`/articles/${id}`, data);
    return response.data;
};

const deleteArticle = async (id) => {
    const response = await api.delete(`/articles/${id}`);
    return response.data;
};

const approveArticle = async (id) => {
    console.log('[articleService] PUT /articles/' + id + '/approve');
    const response = await api.put(`/articles/${id}/approve`);
    return response.data;
};

const rejectArticle = async (id) => {
    const response = await api.post(`/articles/${id}/reject`);
    return response.data;
};

const publishArticle = async (id) => {
    console.log('[articleService] PUT /articles/' + id + '/publish');
    const response = await api.put(`/articles/${id}/publish`);
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
