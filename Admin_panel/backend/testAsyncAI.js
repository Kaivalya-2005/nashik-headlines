const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

const runAsyncTest = async () => {
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

        // 2. Create Article
        console.log('\n--- Create Article ---');
        const createRes = await axios.post(`${API_URL}/articles`, {
            title: 'Async AI Test',
            rawInput: 'Nashik witnessed heavy rainfall today, causing waterlogging in several areas.'
        }, config);
        const articleId = createRes.data._id;
        console.log('Article Created ID:', articleId);

        // 3. Trigger Generation (Expect 202)
        console.log('\n--- Trigger Async Generation ---');
        try {
            const genRes = await axios.post(`${API_URL}/articles/${articleId}/generate`, {}, config);
            console.log('Generation Triggered:', genRes.status, genRes.data);

            if (genRes.status !== 202) {
                console.error('FAILED: Expected status 202, got', genRes.status);
                return;
            }
        } catch (err) {
            console.error('Trigger Failed:', err.message);
            return;
        }

        // 4. Poll Status
        console.log('\n--- Polling Status ---');
        let status = 'PENDING';
        let attempts = 0;

        while (['PENDING', 'PROCESSING'].includes(status) && attempts < 20) {
            await new Promise(r => setTimeout(r, 2000)); // Wait 2s
            const statusRes = await axios.get(`${API_URL}/articles/${articleId}/status`, config);
            status = statusRes.data.generationStatus;
            console.log(`[Attempt ${attempts + 1}] Status: ${status}`);
            attempts++;
        }

        if (status === 'COMPLETED') {
            console.log('\nSUCCESS! Article generation completed.');
            // Fetch full article to verify content
            const finalRes = await axios.get(`${API_URL}/articles/${articleId}`, config);
            console.log('Title:', finalRes.data.title);
            console.log('Images:', finalRes.data.images.length);
        } else {
            console.error('\nFAILED or TIMED OUT. Final status:', status);
        }

    } catch (error) {
        console.error('Test Error:', error.response ? error.response.data : error.message);
    }
};

runAsyncTest();
