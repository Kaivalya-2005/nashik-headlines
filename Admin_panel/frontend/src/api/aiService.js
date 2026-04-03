import api from './api';

const rewriteArticle = async (id) => {
    const response = await api.post('/ai/rewrite', { id });
    return response.data;
};

const summarizeArticle = async (id) => {
    const response = await api.post('/ai/summarize', { id });
    return response.data;
};

const generateSEO = async (id) => {
    const response = await api.post('/ai/generate-seo', { id });
    return response.data;
};

const generateTags = async (id) => {
    const response = await api.post('/ai/generate-tags', { id });
    return response.data;
};

const generateImageAlt = async (id) => {
    const response = await api.post('/ai/generate-image-alt', { id });
    return response.data;
};

const generateArticle = async (data) => {
    const response = await api.post('/ai/generate-article', data);
    return response.data;
};

const regenerateArticle = async (data) => {
    const payload = {
        title: data.title || '',
        content: data.content || ''
    };
    const response = await api.post('/articles/regenerate', payload);
    return response.data;
};

const aiService = {
    rewriteArticle,
    summarizeArticle,
    generateSEO,
    generateTags,
    generateImageAlt,
    generateArticle,
    regenerateArticle
};

export default aiService;
