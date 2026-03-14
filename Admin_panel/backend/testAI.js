const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const runAiTest = async () => {
    try {
        // 1. Login
        console.log('--- Login ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Create Article with Raw Input
        console.log('\n--- Create Article ---');
        const createRes = await axios.post(`${API_URL}/articles`, {
            title: 'AI Gen Test',
            rawInput: 'Nashik witnessed heavy rainfall today, causing waterlogging in several areas. The municipal corporation has issued a yellow alert.'
        }, config);
        const articleId = createRes.data._id;
        console.log('Article Created ID:', articleId);

        // 3. Generate Content
        console.log('\n--- Generate Content (This calls Gemini API) ---');
        console.log('Waiting for AI response...');

        // Note: This will fail if GEMINI_API_KEY is not set or invalid
        try {
            const genRes = await axios.post(`${API_URL}/articles/${articleId}/generate`, {}, config);
            console.log('Generation Success!');
            console.log('Title:', genRes.data.title);
            console.log('Content Preview:', genRes.data.content.substring(0, 100) + '...');
            console.log('SEO:', genRes.data.seo);
            console.log('Images:', JSON.stringify(genRes.data.images, null, 2));
        } catch (aiError) {
            console.error('AI Generation Failed (Expected if NO API KEY):', aiError.response ? aiError.response.data : aiError.message);
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
        const errorLog = `Error: ${error.message}\nResponse: ${JSON.stringify(error.response ? error.response.data : {}, null, 2)}`;
        const fs = require('fs');
        fs.writeFileSync('test_ai_error.txt', errorLog);
    }
};

runAiTest();
