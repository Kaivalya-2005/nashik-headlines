import api from './api';

const getAll = async (pageNumber = 1) => {
    const response = await api.get(`/articles?pageNumber=${pageNumber}`);
    return response.data;
};

const getById = async (id) => {
    const response = await api.get(`/articles/${id}`);
    return response.data;
};

const create = async (data) => {
    const response = await api.post('/articles', data);
    return response.data;
};

const update = async (id, data) => {
    const response = await api.put(`/articles/${id}`, data);
    return response.data;
};

const remove = async (id) => {
    const response = await api.delete(`/articles/${id}`);
    return response.data;
};

const generateContent = async (id) => {
    const response = await api.post(`/articles/${id}/generate`);
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

const pushToWordPress = async (id) => {
    const response = await api.post(`/articles/${id}/push-to-wp`);
    return response.data;
};

const uploadImages = async (id, formData) => {
    // DO NOT set Content-Type manually for FormData. Axios does it automatically with boundary.
    const response = await api.post(`/articles/${id}/images`, formData, {
        withCredentials: true
    });
    return response.data;
};

const generateImageSEO = async (id, imageId) => {
    const response = await api.post(`/articles/${id}/images/${imageId}/seo`);
    return response.data;
};

const getGenerationStatus = async (id) => {
    const response = await api.get(`/articles/${id}/status`);
    return response.data;
};

const articleService = {
    getAll,
    getById,
    create,
    update,
    remove,
    generateContent,
    analyzeSEO,
    improveSEO,
    pushToWordPress,
    uploadImages,
    generateImageSEO,
    getGenerationStatus
};

export default articleService;
