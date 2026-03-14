require('dotenv').config(); // Load env first!
const { generateMarathiNews } = require('./services/geminiService');
const fs = require('fs');

async function testService() {
    console.log("Testing generateMarathiNews service...");

    // Debug environment
    if (!process.env.GEMINI_API_KEY) {
        console.error("CRITICAL: GEMINI_API_KEY is missing in process.env!");
        process.exit(1);
    }
    console.log("API Key loaded, length:", process.env.GEMINI_API_KEY.length);

    const rawInput = "Nashik witnessed heavy rainfall today, causing waterlogging in several areas. The municipal corporation has issued a yellow alert."; // Better input for news

    try {
        const result = await generateMarathiNews(rawInput);
        console.log("Service Success!", JSON.stringify(result, null, 2));
        if (result.images) {
            console.log("Images found:", result.images.length);
        } else {
            console.log("No images found in response!");
            // Write to error log if images missing even on success?
            // Maybe. But let's assume success is fine.
        }
    } catch (error) {
        console.error("Gemini API Error Message:", error.message);
        console.error("Gemini API Error Stack:", error.stack);
        if (error.response) console.error("Response:", JSON.stringify(error.response, null, 2));

        try {
            const errorLog = `Error Message: ${error.message}\nStack: ${error.stack}\nResponse: ${JSON.stringify(error.response || {}, null, 2)}`;
            fs.writeFileSync('test_error.txt', errorLog);
            console.log("Error details written to test_error.txt");
        } catch (fileErr) {
            console.error("Failed to write error log:", fileErr);
        }
    }
}

testService();
