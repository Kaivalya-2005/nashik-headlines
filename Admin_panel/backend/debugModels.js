const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const run = async () => {
    const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    console.log('Fetching models for key:', key.slice(-5));

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await axios.get(url);

        fs.writeFileSync('available_models.json', JSON.stringify(response.data, null, 2));
        console.log('Models saved to available_models.json');

    } catch (error) {
        console.error('Error fetching models:', error.message);
        if (error.response) {
            fs.writeFileSync('model_error.json', JSON.stringify(error.response.data, null, 2));
        }
    }
};

run();
