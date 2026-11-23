
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Employee = require('../models/Employee');
const fileHandler = require('../modules/fileHandler');

// Transfer employees from JSON to MongoDB.
async function migrateEmployees() {
    try {
        // Connect to MongoDB.
        await connectDB();

        // Read existing employee records.
        const employees = await fileHandler.read();

        if (employees.length === 0) {
            console.log('No employees found in employees.json.');
            return;
        }

        // Prevent importing the same records again.
        const existingEmployees = await Employee.countDocuments();

        if (existingEmployees > 0) {
            console.log('Migration skipped: MongoDB already contains employees.');
            return;
        }

        // Prepare employee records for MongoDB.
        const employeeData = employees.map(emp => ({
            name: emp.name,
            department: emp.department,
            basicSalary: emp.basicSalary
        }));

        // Insert all employee records into MongoDB.
        await Employee.insertMany(employeeData);

        console.log(`${employeeData.length} employees migrated successfully.`);

    } catch (error) {
        console.error('Migration failed:', error.message);
        process.exitCode = 1;

    } finally {
        // Close the MongoDB connection.
        await mongoose.connection.close();
    }
}

migrateEmployees();
