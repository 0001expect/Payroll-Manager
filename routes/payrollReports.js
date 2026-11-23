
const express = require('express');
const mongoose = require('mongoose');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

function escapeCSV(value) {
    let text = String(value ?? '');

    // Prevent CSV formula injection.
    if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
}

function isValidMonth(month) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

// Display monthly payroll history.
router.get('/payroll/history', async (req, res, next) => {
    try {
        const history = await Payroll.aggregate([
            {
                $group: {
                    _id: '$month',
                    totalEmployees: { $sum: 1 },
                    totalBasicSalary: { $sum: '$basicSalary' },
                    totalTax: { $sum: '$tax' },
                    totalDeductions: { $sum: '$deductions' },
                    totalNetSalary: { $sum: '$netSalary' }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        res.render('payroll-history', { history });
    } catch (error) {
        next(error);
    }
});

// Export payroll records for a selected month.
router.get('/payroll/export', async (req, res, next) => {
    try {
        const month = String(req.query.month || '').trim();

        if (!isValidMonth(month)) {
            return res.status(400).render('error', {
                statusCode: 400,
                message: 'Please select a valid payroll month.'
            });
        }

        const records = await Payroll.find({ month }).sort({
            employeeName: 1
        });

        if (records.length === 0) {
            return res.status(404).render('error', {
                statusCode: 404,
                message: 'No payroll records found for the selected month.'
            });
        }

        // Find which payroll employees still exist.
        const employeeIds = [
            ...new Set(
                records
                    .filter(record => record.employee)
                    .map(record => record.employee.toString())
            )
        ];

        const existingEmployees = await Employee.find({
            _id: {
                $in: employeeIds.filter(id => mongoose.isValidObjectId(id))
            }
        })
            .select('_id')
            .lean();

        const activeEmployeeIds = new Set(
            existingEmployees.map(employee => employee._id.toString())
        );

        const rows = [
            [
                'Payroll Month',
                'Employee ID',
                'Employee Name',
                'Department',
                'Employee Record Status',
                'Basic Salary',
                'Tax Rate',
                'Tax',
                'Deductions',
                'Net Salary',
                'Payroll Status',
                'Processed By',
                'Processed At'
            ]
        ];

        records.forEach(record => {
            const employeeId = record.employee
                ? record.employee.toString()
                : '';

            const employeeRecordStatus =
                employeeId && activeEmployeeIds.has(employeeId)
                    ? 'Active'
                    : 'Removed';

            // Display EMP- for legacy employee codes in old payroll records.
            const employeeCode = record.employeeCode
                ? record.employeeCode.replace(/^LEGACY-/, 'EMP-')
                : employeeId
                    ? `EMP-${employeeId.slice(-8).toUpperCase()}`
                    : '';

            rows.push([
                record.month,
                employeeCode,
                record.employeeName,
                record.department,
                employeeRecordStatus,
                Number(record.basicSalary || 0).toFixed(2),
                `${record.taxRate}%`,
                Number(record.tax || 0).toFixed(2),
                Number(record.deductions || 0).toFixed(2),
                Number(record.netSalary || 0).toFixed(2),
                record.status,
                record.processedBy,
                record.processedAt
                    ? record.processedAt.toISOString()
                    : ''
            ]);
        });

        const csvContent =
            '\uFEFF' +
            rows.map(row => row.map(escapeCSV).join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="payroll-${month}.csv"`
        );

        res.send(csvContent);
    } catch (error) {
        next(error);
    }
});

// Mark an individual payroll record as Paid.
router.post(
    '/payroll/:id/mark-paid',
    requireRole('admin'),
    async (req, res, next) => {
        try {
            const { id } = req.params;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).render('error', {
                    statusCode: 400,
                    message: 'Invalid payroll record ID.'
                });
            }

            const payroll = await Payroll.findById(id);

            if (!payroll) {
                return res.status(404).render('error', {
                    statusCode: 404,
                    message: 'Payroll record not found.'
                });
            }

            if (payroll.status === 'Paid') {
                return res.redirect(
                    `/payroll?month=${encodeURIComponent(payroll.month)}`
                );
            }

            payroll.status = 'Paid';
            await payroll.save();

            res.redirect(
                `/payroll?month=${encodeURIComponent(payroll.month)}`
            );
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
