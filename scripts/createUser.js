
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('../config/db');
const User = require('../models/User');

async function createUser() {
    try {
        const name = (process.env.USER_NAME || '').trim();
        const email = (process.env.USER_EMAIL || '').trim().toLowerCase();
        const password = process.env.USER_PASSWORD || '';
        const role = (process.env.USER_ROLE || '').trim().toLowerCase();

        if (!name || !email || !password || !role) {
            throw new Error(
                'Set USER_NAME, USER_EMAIL, USER_PASSWORD and USER_ROLE in .env.'
            );
        }

        if (!['admin', 'hr'].includes(role)) {
            throw new Error('USER_ROLE must be admin or hr.');
        }

        if (password.length < 12) {
            throw new Error('Password must contain at least 12 characters.');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Enter a valid email address.');
        }

        await connectDB();

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new Error('A user with this email already exists.');
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await User.create({
            name,
            email,
            passwordHash,
            role,
            isActive: true
        });

        console.log('User created successfully.');
        console.log(`Name: ${name}`);
        console.log(`Email: ${email}`);
        console.log(`Role: ${role}`);

    } catch (error) {
        console.error('User creation failed:', error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

createUser();
