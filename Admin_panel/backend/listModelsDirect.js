const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("Missing GEMINI_API_KEY");
        }

        // We can't list models directly with GoogleGenerativeAI class in the same way as some other SDKs, 
        // but let's try to infer or use the model endpoint if possible. 
        // Actually, the SDK doesn't always expose listModels easily depending on version.
        // Let's try to use the `gemini-pro` model which is the most standard, 
        // but since that failed, let's try to print the error details more fully.

        // Wait, the new SDK might have a model listing method on the client/manager if it exists.
        // Checking newer SDK docs: genAI.getGenerativeModel is the main entry.

        // Let's try to print the Full Error JSON from the previous failure to see if it has more info.

    } catch (error) {
        console.error("Error:", error);
    }
}

// Actually better: let's use a raw fetch to the API to list models if SDK is obscure
const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function fetchModels() {
    // using dynamic import for node-fetch or just use native fetch if node is new enough (v18+)
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
        } else {
            console.log("No models found or error:", data);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

if (process.env.GEMINI_API_KEY) {
    fetchModels();
} else {
    console.log("No API Key");
}
