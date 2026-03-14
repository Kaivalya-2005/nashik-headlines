const mongoose = require('mongoose');
const Article = require('./models/Article');

const run = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/admin_panel');
        console.log('Connected to DB...');

        const articles = await Article.find({ generationStatus: 'FAILED' });
        console.log(`Found ${articles.length} failed articles.`);

        for (const a of articles) {
            console.log(`- [${a._id}] Title: ${a.title} | Error: ${a.generationError}`);
        }
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
};

run();
