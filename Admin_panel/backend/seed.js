const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();

const seedUsers = async () => {
    try {
        await connectDB();

        // Clear existing users
        await User.deleteMany();
        console.log('Users cleared');

        const adminUser = new User({
            email: 'admin@example.com',
            password: 'password123', // Will be hashed by pre-save hook
            role: 'ADMIN'
        });

        await adminUser.save();
        console.log('Admin user created: admin@example.com / password123');

        process.exit();
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();
