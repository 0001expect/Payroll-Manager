
const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },

    employeeCode: {
        type: String,
        required: true
    },

    employeeName: {
        type: String,
        required: true
    },

    department: {
        type: String,
        required: true
    },

    month: {
        type: String,
        required: true,
        match: /^\d{4}-(0[1-9]|1[0-2])$/
    },

    basicSalary: {
        type: Number,
        required: true,
        min: 0
    },

    taxRate: {
        type: Number,
        required: true
    },

    tax: {
        type: Number,
        required: true
    },

    deductions: {
        type: Number,
        default: 0,
        min: 0
    },

    netSalary: {
        type: Number,
        required: true
    },

    status: {
        type: String,
        enum: ['Processed', 'Paid'],
        default: 'Processed'
    },

    processedBy: {
        type: String,
        default: 'Admin'
    },

    processedAt: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});

// An employee can have only one payroll record per month.
payrollSchema.index(
    { employee: 1, month: 1 },
    { unique: true }
);

module.exports = mongoose.model('Payroll', payrollSchema);
