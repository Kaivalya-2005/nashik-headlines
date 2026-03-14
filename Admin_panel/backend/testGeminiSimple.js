const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testGemini() {
    try {
        console.log("API Key present:", !!process.env.GEMINI_API_KEY);
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY");
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];

        for (const modelName of models) {
            try {
                console.log(`Testing model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Say hello");
                const response = await result.response;
                console.log(`SUCCESS with ${modelName}:`, response.text());
                return; // Exit on first success
            } catch (e) {
                console.log(`FAILED with ${modelName}:`, e.message);
            }
        }
        console.log("All models failed.");
    } catch (error) {
        console.error("Test Failed:", error);
    }
}

testGemini();
