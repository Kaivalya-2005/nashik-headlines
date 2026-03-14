const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const verifyLogin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const email = 'admin@example.com';
        const password = 'password123';

        const user = await User.findOne({ email });

        if (!user) {
            console.log('User NOT found with email:', email);
        } else {
            console.log('User found:', user.email);
            console.log('Role:', user.role);
            console.log('Hashed Password in DB:', user.password);

            const isMatch = await user.comparePassword(password);
            console.log('Password match result for "password123":', isMatch);

            if (isMatch) {
                console.log('SUCCESS: Credentials are valid.');
            } else {
                console.log('FAILURE: Password mismatch.');
            }
        }

    } catch (error) {
        console.error('Error verifying login:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyLogin();
