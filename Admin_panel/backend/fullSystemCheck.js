const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const runSystemCheck = async () => {
    console.log('🚀 Starting Full System Check...\n');
    let token;
    let articleId;

    try {
        // 1. Authentication
        console.log('1️⃣  Testing Authentication...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@example.com',
            password: 'password123'
        });
        token = loginRes.data.token;
        if (!token) throw new Error('No token received');
        console.log('✅ Login Successful');

        const config = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Article Management
        console.log('\n2️⃣  Testing Article Creation...');
        const createRes = await axios.post(`${API_URL}/articles`, {
            title: 'Full System Check',
            rawInput: 'Nashik municipal corporation announces new water supply schedule for summer 2026. Cuts expected in some areas due to low dam levels.'
        }, config);
        articleId = createRes.data._id;
        if (!articleId) throw new Error('No article ID received');
        console.log(`✅ Article Created (ID: ${articleId})`);

        // 3. AI Generation
        console.log('\n3️⃣  Testing AI Content Generation (Gemini)...');
        console.log('   (This may take up to 20 seconds...)');
        try {
            const genRes = await axios.post(`${API_URL}/articles/${articleId}/generate`, {}, config);
            if (!genRes.data.content) throw new Error('No content generated');
            console.log('✅ Content Generated');
            console.log(`   Title: ${genRes.data.title}`);
        } catch (aiError) {
            console.error('❌ AI Generation Failed:', aiError.response ? aiError.response.data : aiError.message);
            throw aiError;
        }

        // 4. SEO Analysis
        console.log('\n4️⃣  Testing SEO Analysis...');
        try {
            const analyzeRes = await axios.post(`${API_URL}/articles/${articleId}/seo/analyze`, {}, config);
            console.log(`✅ SEO Scored: ${analyzeRes.data.seoScore}/100`);
            if (analyzeRes.data.seoReport.length > 0) console.log(`   Report Items: ${analyzeRes.data.seoReport.length}`);
        } catch (seoError) {
            console.error('❌ SEO Analysis Failed:', seoError.response ? seoError.response.data : seoError.message);
            throw seoError;
        }

        // 5. SEO Improvement
        console.log('\n5️⃣  Testing AI SEO Improvement...');
        try {
            const improveRes = await axios.post(`${API_URL}/articles/${articleId}/seo/improve`, {}, config);
            console.log('✅ SEO Metadata Updated');
            console.log(`   New Meta Title: ${improveRes.data.meta_title}`);
            console.log(`   New Score: ${improveRes.data.seoScore}/100`);
        } catch (seoImpError) {
            console.error('❌ SEO Improvement Failed:', seoImpError.response ? seoImpError.response.data : seoImpError.message);
            throw seoImpError;
        }

        // 6. WordPress Publishing
        console.log('\n6️⃣  Testing WordPress Publishing...');
        try {
            const wpRes = await axios.post(`${API_URL}/articles/${articleId}/push-to-wp`, {}, config);
            console.log('✅ Pushed to WordPress');
            console.log(`   WP Post ID: ${wpRes.data.wpId}`);
            console.log(`   Preview URL: ${wpRes.data.wpUrl}`);
        } catch (wpError) {
            // If credentials are bad, this might fail, but let's log it clearly
            console.error('❌ WordPress Push Failed:', wpError.response ? wpError.response.data : wpError.message);
            // We don't throw here strictly unless we want to fail the whole check, but let's throw to be strict
            throw wpError;
        }

        console.log('\n🎉 ALL SYSTEMS GO! The backend is fully operational.');

    } catch (error) {
        console.error('\n❌ SYSTEM CHECK FAILED');
        // Error detailed already logged
    }
};

runSystemCheck();
