import api from './api';

const aiService = {
  // Main article generation using Mistral backend
  generateArticle: async (payload) => {
    try {
      const response = await api.post('/ai/generate-article', payload);
      return response.data;
    } catch (error) {
      console.error('AI Generation Error:', error);
      throw new Error(error.response?.data?.error || 'AI request failed');
    }
  },
  
  // Legacy / specific field endpoints 
  generateTitle: async (topic) => {
      // Mocked fallback for specific field tools since we use the megagen
      return `Generated Title for ${topic}`;
  },
  generateContent: async (topic) => {
      return `Generated Content for ${topic}`;
  }
};

export default aiService;
