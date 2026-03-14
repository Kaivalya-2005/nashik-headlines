const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = 'admin@example.com';
        const password = 'password123';

        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({ name: 'Admin', email, password, role: 'ADMIN' });
            console.log('Admin user created');
        } else {
            console.log('Admin user already exists');
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

seedAdmin();
