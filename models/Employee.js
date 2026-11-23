
const mongoose = require('mongoose');
const crypto = require('crypto');

const employeeSchema = new mongoose.Schema({
    employeeCode: {
        type: String,
        unique: true,
        sparse: true,
        immutable: true
    },

    name: {
        type: String,
        required: [true, 'Employee name is required.'],
        trim: true,
        minlength: [2, 'Employee name must contain at least 2 characters.'],
        maxlength: [60, 'Employee name cannot exceed 60 characters.'],
        match: [
            /^[a-zA-Z][a-zA-Z\s.'-]*$/,
            'Employee name contains invalid characters.'
        ]
    },

    email: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: [120, 'Email cannot exceed 120 characters.'],
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'Please enter a valid email address.'
        ]
    },

    phone: {
        type: String,
        trim: true,
        match: [
            /^[6-9]\d{9}$/,
            'Phone number must be exactly 10 digits and start with 6, 7, 8 or 9.'
        ]
    },

    designation: {
        type: String,
        trim: true,
        maxlength: [60, 'Designation cannot exceed 60 characters.']
    },

    department: {
        type: String,
        required: [true, 'Department is required.'],
        trim: true,
        minlength: [2, 'Department must contain at least 2 characters.'],
        maxlength: [40, 'Department cannot exceed 40 characters.'],
        match: [
            /^[a-zA-Z][a-zA-Z\s&-]*$/,
            'Department contains invalid characters.'
        ]
    },

    joiningDate: {
        type: Date
    },

    basicSalary: {
        type: Number,
        required: [true, 'Basic salary is required.'],
        min: [0.01, 'Basic salary must be greater than zero.'],
        max: [1000000000, 'Basic salary exceeds the allowed limit.'],
        validate: {
            validator: Number.isFinite,
            message: 'Basic salary must be a valid number.'
        }
    }

}, {
    timestamps: true
});

// Generate an employee code for new employees.
employeeSchema.pre('validate', function () {
    if (!this.employeeCode && this.isNew) {
        this.employeeCode =
            'EMP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    }
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
