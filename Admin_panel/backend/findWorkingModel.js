const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is missing");
    process.exit(1);
}

const models = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-002",
    "gemini-1.5-pro-latest",
    "gemini-1.0-pro",
    "gemini-1.0-pro-001",
    "gemini-1.0-pro-latest",
    "gemini-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-001"
];

function checkModel(model) {
    return new Promise((resolve) => {
        const data = JSON.stringify({
            contents: [{ parts: [{ text: "Hi" }] }]
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

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                resolve({ model, status: res.statusCode });
            });
        });

        req.on('error', (e) => {
            resolve({ model, status: 'ERROR', error: e.message });
        });

        req.write(data);
        req.end();
    });
}

async function scan() {
    console.log("Scanning models...");
    for (const model of models) {
        process.stdout.write(`Checking ${model}... `);
        const result = await checkModel(model);
        console.log(result.status);
        if (result.status === 200) {
            console.log(`\n>>> FOUND WORKING MODEL: ${model} <<<\n`);
            // return; // Don't stop, find all working ones
        }
    }
    console.log("Scan complete.");
}

scan();
