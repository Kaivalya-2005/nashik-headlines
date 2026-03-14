require('dotenv').config();

console.log('--- Env Check ---');
const key = process.env.GEMINI_API_KEY;
if (key) {
    console.log(`Key Loaded: Yes`);
    console.log(`Length: ${key.length}`);
    console.log(`First 5 chars: ${key.substring(0, 5)}`);
    console.log(`Last 5 chars: ${key.substring(key.length - 5)}`);
} else {
    console.log('Key Loaded: NO');
}
