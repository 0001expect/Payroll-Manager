
const mongoose = require('mongoose');

// Use the environment variable if available.
// Otherwise, connect to the local MongoDB database.
const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/payroll_manager';

// Connect to MongoDB.
async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });

        console.log('MongoDB connected successfully.');

    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
}

module.exports = connectDB;
