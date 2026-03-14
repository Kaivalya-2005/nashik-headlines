const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const testUpload = async () => {
    try {
        const token = fs.readFileSync('test_token.txt', 'utf8');
        console.log('Using saved token:', token.substring(0, 20) + '...');

        console.log('\n--- Create Article ---');
        const createRes = await axios.post(
            'http://localhost:5000/api/articles',
            { title: 'Upload Test', rawInput: 'Test content for upload' },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        const articleId = createRes.data._id;
        console.log('Created Article ID:', articleId);

        console.log('\n--- Upload Image ---');
        const form = new FormData();
        // Create a dummy file
        const dummyPath = path.join(__dirname, 'dummy.jpg');
        fs.writeFileSync(dummyPath, 'fake image data');

        form.append('images', fs.createReadStream(dummyPath));

        try {
            const uploadRes = await axios.post(
                `http://localhost:5000/api/articles/${articleId}/images`,
                form,
                {
                    headers: {
                        ...form.getHeaders(),
                        Authorization: `Bearer ${token}`
                    }
                }
            );
            console.log('Upload successful:', uploadRes.data);
        } catch (uploadErr) {
            console.error('Upload Error:', uploadErr.response ? uploadErr.response.data : uploadErr.message);
        }

        // Cleanup
        fs.unlinkSync(dummyPath);
    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
};

testUpload();
