const EventEmitter = require('events');

class MockQueue extends EventEmitter {
    constructor(name) {
        super();
        this.name = name;
        this.jobs = [];
        this.workers = [];
        console.warn(`[MockQueue] Initialized in-memory queue '${name}' (Redis fallback)`);
    }

    async add(name, data) {
        const job = {
            id: Date.now().toString(),
            name,
            data,
            timestamp: Date.now()
        };
        this.jobs.push(job);

        // Simulate async processing
        setTimeout(() => this.processJob(job), 100);

        return job;
    }

    processJob(job) {
        if (this.workers.length > 0) {
            const worker = this.workers[0]; // Simple single worker
            worker.process(job);
        }
    }

    registerWorker(worker) {
        this.workers.push(worker);
    }
}

class MockWorker extends EventEmitter {
    constructor(queueName, processor, options) {
        super();
        this.processor = processor;
        // Find or create the shared queue instance (in a real app, use a singleton manager)
        // For this simple fallback, we assume the Queue instance is passed or managed globally
    }

    async process(job) {
        try {
            await this.processor(job);
            this.emit('completed', job);
        } catch (error) {
            this.emit('failed', job, error);
        }
    }
}

// Singleton to share state between Queue and Worker in different files
const queues = {};

const getMockQueue = (name) => {
    if (!queues[name]) {
        queues[name] = new MockQueue(name);
    }
    return queues[name];
};

module.exports = { MockQueue, MockWorker, getMockQueue };
