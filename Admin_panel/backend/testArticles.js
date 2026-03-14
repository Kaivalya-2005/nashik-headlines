const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const runTests = async () => {
    try {
        // 1. Login as Admin
        console.log('--- Login ---');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token:', token.substring(0, 20) + '...');
        require('fs').writeFileSync('test_token.txt', token);

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        // 2. Create Article
        console.log('\n--- Create Article ---');
        const createRes = await axios.post(`${API_URL}/articles`, {
            title: 'Test Article',
            rawInput: 'This is a raw input for testing.'
        }, config);
        console.log('Created Article ID:', createRes.data._id);
        const articleId = createRes.data._id;

        // 3. Get All Articles
        console.log('\n--- Get All Articles ---');
        const listRes = await axios.get(`${API_URL}/articles`, config);
        console.log('Articles count:', listRes.data.articles.length);

        // 4. Get Article By ID
        console.log('\n--- Get Article By ID ---');
        const getRes = await axios.get(`${API_URL}/articles/${articleId}`, config);
        console.log('Retrieved Title:', getRes.data.title);

        // 5. Update Article
        console.log('\n--- Update Article ---');
        const updateRes = await axios.put(`${API_URL}/articles/${articleId}`, {
            title: 'Updated Test Article',
            content: '<p>Generated content</p>',
            status: 'DRAFT_WP'
        }, config);
        console.log('Updated Status:', updateRes.data.status);

        // 6. Delete Article (Admin only)
        console.log('\n--- Delete Article ---');
        await axios.delete(`${API_URL}/articles/${articleId}`, config);
        console.log('Article deleted successfully');

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
};

runTests();
