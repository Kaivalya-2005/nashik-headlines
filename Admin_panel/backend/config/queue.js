const { Queue } = require('bullmq');
const Redis = require('ioredis');
const { getMockQueue } = require('./mockQueue');

const redisConfig = process.env.REDIS_URL || {
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null,
    // Fail fast if local
    retryStrategy(times) {
        if (times > 3) {
            return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
    }
};

let connection;
let aiQueue;
let useMock = false;

// Heuristic: If we are in dev and failing, switch to mock.
// For the user's specific case, we'll try to connect, but if it fails (caught globally or here), we'd want mock.
// Since ioredis connects async, we can't switch module.exports dynamically easily.
// SO: We will default to Mock if REDIS_URL is not set, to help this user immediately.
// OR: We export a 'getQueue' function? No, existing code expects object.

// DECISION: FORCE MOCK if no REDIS_URL is present, assuming local dev without Redis.
const forceMock = !process.env.REDIS_URL;

if (forceMock) {
    console.warn('[Queue] No REDIS_URL found. Using In-Memory Mock Queue for Development.');
    useMock = true;
} else {
    try {
        connection = new Redis(redisConfig);

        connection.on('error', (err) => {
            // Prevent crash
            console.error('[Redis] Connection Error (Is Redis running?):', err.message);
        });

        aiQueue = new Queue('ai-generation', {
            connection,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: { age: 24 * 3600, count: 1000 },
                removeOnFail: { age: 7 * 24 * 3600 }
            }
        });
    } catch (e) {
        useMock = true;
        console.error('[Queue] Failed to init Redis queue:', e);
    }
}

if (useMock) {
    aiQueue = getMockQueue('ai-generation');
}

module.exports = { aiQueue, connection, useMock };
