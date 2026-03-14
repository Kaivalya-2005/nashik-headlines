const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const resetAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = 'admin@example.com';
        const password = 'password123'; // The password we want to ensure

        // Find and update, or create if not exists
        let user = await User.findOne({ email });

        if (user) {
            user.password = password; // Will be hashed by pre-save hook
            await user.save();
            console.log('Admin password updated to: password123');
        } else {
            await User.create({ name: 'Admin', email, password, role: 'ADMIN' });
            console.log('Admin user created with password: password123');
        }

    } catch (error) {
        console.error('Error resetting admin:', error);
    } finally {
        await mongoose.disconnect();
    }
};

resetAdmin();
