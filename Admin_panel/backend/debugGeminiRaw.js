const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
const model = 'gemini-1.5-pro-latest';

if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is missing in .env");
    process.exit(1);
}

const data = JSON.stringify({
    contents: [{
        parts: [{ text: "Hello, are you working?" }]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log(`Testing Raw API Call to ${model}...`);
console.log(`Key length: ${apiKey.length}`);
console.log(`Key starts with: ${apiKey.substring(0, 4)}...`);

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);

    let responseBody = '';

    res.on('data', (chunk) => {
        responseBody += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(responseBody);
            console.log("Response Body:", JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log("Response Body (Raw):", responseBody);
        }
    });
});

req.on('error', (error) => {
    console.error("Request Error:", error);
});

req.write(data);
req.end();
