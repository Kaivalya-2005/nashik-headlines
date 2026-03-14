const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const run = async () => {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '');
    try {
        // For some versions of the SDK, you might need to use the API directly or a specific method
        // But let's try a simple generation to see if it works with *any* model if I can't list
        // Actually, let's try to just print the key first (masked)
        console.log('Key:', process.env.GEMINI_API_KEY ? 'Loaded' : 'Missing');

        // There isn't a direct listModels method on the top level class in some SDK versions, 
        // but let's try to access the model directly.
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        console.log('Model initialized: gemini-pro');

        // Try a simple prompt
        const result = await model.generateContent('Hello');
        console.log('Gemini-Pro Response:', result.response.text());

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Response:', error.response);
    }
};

run();
