require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');

const payroll = require('./modules/payroll');
const connectDB = require('./config/db');
const Employee = require('./models/Employee');
const Payroll = require('./models/Payroll');

const payrollReports = require('./routes/payrollReports');
const auditMiddleware = require('./utils/auditMiddleware');
const auditLogsRoutes = require('./routes/auditLogs');

const { configureAuth, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const PAGE_SIZE = 5;

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(express.urlencoded({
    extended: true,
    limit: '10kb'
}));

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

configureAuth(app);

app.use(auditMiddleware);

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeCSV(value) {
    let text = String(value ?? '');

    if (/^[=+\-@\t\r]/.test(text)) {
        text = "'" + text;
    }

    return `"${text.replace(/"/g, '""')}"`;
}

function parseDateOnly(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }

    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }

    return date;
}

function validateEmployee(data) {
    const errors = [];

    const name = (data.name || '').trim();
    const department = (data.department || '').trim();
    const email = (data.email || '').trim();
    const phone = (data.phone || '').trim();
    const designation = (data.designation || '').trim();
    const joiningDate = (data.joiningDate || '').trim();
    const basicSalary = data.basicSalary;

    if (!name) {
        errors.push('Employee name is required.');
    } else if (name.length < 2 || name.length > 60) {
        errors.push('Employee name must be between 2 and 60 characters.');
    } else if (!/^[a-zA-Z][a-zA-Z\s.'-]*$/.test(name)) {
        errors.push('Employee name contains invalid characters.');
    }

    if (!department) {
        errors.push('Department is required.');
    } else if (department.length < 2 || department.length > 40) {
        errors.push('Department must be between 2 and 40 characters.');
    } else if (!/^[a-zA-Z][a-zA-Z\s&-]*$/.test(department)) {
        errors.push('Department contains invalid characters.');
    }

    if (email) {
        if (
            email.length > 120 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            errors.push('Please enter a valid email address.');
        }
    }

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
        errors.push(
            'Phone number must be exactly 10 digits and start with 6, 7, 8 or 9.'
        );
    }

    if (designation.length > 60) {
        errors.push('Designation cannot exceed 60 characters.');
    }

    if (
        basicSalary === '' ||
        !Number.isFinite(Number(basicSalary)) ||
        Number(basicSalary) < 0.01 ||
        Number(basicSalary) > 1000000000
    ) {
        errors.push('Salary must be between ₹0.01 and ₹1,000,000,000.');
    }

    if (joiningDate && !parseDateOnly(joiningDate)) {
        errors.push('Please enter a valid joining date.');
    }

    return errors;
}

function getEmployeeFormData(body) {
    return {
        name: (body.name || '').trim(),
        email: (body.email || '').trim().toLowerCase(),
        phone: (body.phone || '').trim(),
        designation: (body.designation || '').trim(),
        department: (body.department || '').trim(),
        joiningDate: (body.joiningDate || '').trim(),
        basicSalary: body.basicSalary || ''
    };
}

function employeeValues(formData) {
    return {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        designation: formData.designation || undefined,
        department: formData.department,
        joiningDate: formData.joiningDate
            ? parseDateOnly(formData.joiningDate)
            : undefined,
        basicSalary: Number(formData.basicSalary)
    };
}

function renderNotFound(res) {
    return res.status(404).render('error', {
        statusCode: 404,
        message: 'Employee not found.'
    });
}

// Dashboard

app.get('/', asyncHandler(async (req, res) => {
    const search = (req.query.search || '').trim().slice(0, 60);
    const department = (req.query.department || '').trim().slice(0, 40);
    const sort = req.query.sort || '';

    const requestedPage = parseInt(req.query.page, 10);

    const page = Number.isInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;

    const filter = {};

    if (search) {
        filter.name = {
            $regex: escapeRegex(search),
            $options: 'i'
        };
    }

    if (department) {
        filter.department = department;
    }

    const sortOptions = {
        name_asc: { name: 1 },
        name_desc: { name: -1 },
        salary_low: { basicSalary: 1 },
        salary_high: { basicSalary: -1 }
    };

    const totalEmployees = await Employee.countDocuments(filter);

    const totalPages = Math.ceil(totalEmployees / PAGE_SIZE);

    const currentPage = totalPages === 0
        ? 1
        : Math.min(page, totalPages);

    const employees = await Employee.find(filter)
        .sort(sortOptions[sort] || {})
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE);

    const departments = await Employee.distinct('department');

    const payrollEmployees = employees.map(emp => {
        const { tax, net } = payroll.calculate(emp.basicSalary);

        return {
            ...emp.toObject(),
            tax,
            net,
            basicSalaryFormatted: payroll.formatCurrency(emp.basicSalary),
            taxFormatted: payroll.formatCurrency(tax),
            netFormatted: payroll.formatCurrency(net)
        };
    });

    const allMatchingEmployees = await Employee.find(filter);

    const summary = allMatchingEmployees.reduce((totals, emp) => {
        const { tax, net } = payroll.calculate(emp.basicSalary);

        totals.basicSalary += emp.basicSalary;
        totals.tax += tax;
        totals.net += net;

        return totals;
    }, {
        basicSalary: 0,
        tax: 0,
        net: 0
    });

    summary.basicSalaryFormatted =
        payroll.formatCurrency(summary.basicSalary);

    summary.taxFormatted =
        payroll.formatCurrency(summary.tax);

    summary.netFormatted =
        payroll.formatCurrency(summary.net);

    res.render('index', {
        employees: payrollEmployees,
        summary,
        search,
        selectedDepartment: department,
        departments,
        sort,
        currentPage,
        totalPages,
        totalEmployees,
        pageSize: PAGE_SIZE
    });
}));

// Employee profile

app.get('/employees/:id', asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return renderNotFound(res);
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
        return renderNotFound(res);
    }

    const employeeId = employee._id;

    const employeePayroll = await Payroll.find({
        employee: employeeId
    }).sort({ month: -1 });

    const { tax, net } = payroll.calculate(employee.basicSalary);

    const payrollTotals = employeePayroll.reduce((totals, record) => {
        totals.basicSalary += record.basicSalary;
        totals.tax += record.tax;
        totals.deductions += record.deductions;
        totals.netSalary += record.netSalary;

        if (record.status === 'Paid') {
            totals.paidCount++;
            totals.paidAmount += record.netSalary;
        } else {
            totals.pendingCount++;
            totals.pendingAmount += record.netSalary;
        }

        return totals;
    }, {
        basicSalary: 0,
        tax: 0,
        deductions: 0,
        netSalary: 0,
        paidCount: 0,
        paidAmount: 0,
        pendingCount: 0,
        pendingAmount: 0
    });

    res.render('employee-profile', {
        employee,
        employeePayroll,
        payrollTotals,
        taxFormatted: payroll.formatCurrency(tax),
        netFormatted: payroll.formatCurrency(net),
        basicSalaryFormatted: payroll.formatCurrency(employee.basicSalary),
        formatCurrency: payroll.formatCurrency,
        employeeCode: employee.employeeCode ||
            `EMP-${employee._id.toString().slice(-8).toUpperCase()}`
    });
}));

// Employee CSV export

app.get('/export', asyncHandler(async (req, res) => {
    const search = (req.query.search || '').trim().slice(0, 60);
    const department = (req.query.department || '').trim().slice(0, 40);
    const sort = req.query.sort || '';

    const filter = {};

    if (search) {
        filter.name = {
            $regex: escapeRegex(search),
            $options: 'i'
        };
    }

    if (department) {
        filter.department = department;
    }

    const sortOptions = {
        name_asc: { name: 1 },
        name_desc: { name: -1 },
        salary_low: { basicSalary: 1 },
        salary_high: { basicSalary: -1 }
    };

    const employees = await Employee.find(filter)
        .sort(sortOptions[sort] || {});

    const rows = [[
        'Employee ID',
        'Employee Name',
        'Email',
        'Phone',
        'Designation',
        'Department',
        'Joining Date',
        'Basic Salary',
        'Tax',
        'Net Salary'
    ]];

    employees.forEach(emp => {
        const { tax, net } = payroll.calculate(emp.basicSalary);

        rows.push([
            emp.employeeCode || `EMP-${emp._id.toString().slice(-8).toUpperCase()}`,
            emp.name,
            emp.email || '',
            emp.phone || '',
            emp.designation || '',
            emp.department,
            emp.joiningDate
                ? emp.joiningDate.toISOString().slice(0, 10)
                : '',
            emp.basicSalary.toFixed(2),
            tax.toFixed(2),
            net.toFixed(2)
        ]);
    });

    const csvContent = '\uFEFF' + rows
        .map(row => row.map(escapeCSV).join(','))
        .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');

    res.setHeader(
        'Content-Disposition',
        'attachment; filename="payroll-report.csv"'
    );

    res.send(csvContent);
}));

// Add employee

app.get('/add', (req, res) => {
    res.render('add', {
        errors: [],
        formData: {}
    });
});

app.post('/add', asyncHandler(async (req, res) => {
    const formData = getEmployeeFormData(req.body);
    const errors = validateEmployee(formData);

    if (errors.length) {
        return res.status(400).render('add', {
            errors,
            formData
        });
    }

    const employee = new Employee(employeeValues(formData));

    await employee.save();

    res.redirect(`/employees/${employee._id}`);
}));

// Delete employee

app.post(
    '/delete/:id',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return renderNotFound(res);
        }

        const employee = await Employee.findByIdAndDelete(req.params.id);

        if (!employee) {
            return renderNotFound(res);
        }

        res.redirect('/');
    })
);

// Edit employee

app.get('/edit/:id', asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return renderNotFound(res);
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
        return renderNotFound(res);
    }

    const formData = {
        name: employee.name,
        email: employee.email || '',
        phone: employee.phone || '',
        designation: employee.designation || '',
        department: employee.department,
        joiningDate: employee.joiningDate
            ? employee.joiningDate.toISOString().slice(0, 10)
            : '',
        basicSalary: employee.basicSalary
    };

    res.render('edit', {
        employee,
        errors: [],
        formData
    });
}));

app.post('/edit/:id', asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return renderNotFound(res);
    }

    const employee = await Employee.findById(req.params.id);

    if (!employee) {
        return renderNotFound(res);
    }

    const formData = getEmployeeFormData(req.body);
    const errors = validateEmployee(formData);

    if (errors.length) {
        return res.status(400).render('edit', {
            employee,
            errors,
            formData
        });
    }

    Object.assign(employee, employeeValues(formData));

    await employee.save();

    res.redirect(`/employees/${employee._id}`);
}));

// Monthly payroll

app.get('/payroll', asyncHandler(async (req, res) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const month = String(req.query.month || currentMonth).trim();

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return res.status(400).render('error', {
            statusCode: 400,
            message: 'Please select a valid payroll month.'
        });
    }

    const activeEmployees = await Employee.find()
        .select('_id')
        .lean();

    const activeEmployeeIds = activeEmployees.map(employee => employee._id);

    const records = await Payroll.find({
        month,
        employee: { $in: activeEmployeeIds }
    }).sort({ employeeName: 1 });

    const totals = records.reduce((result, record) => {
        result.basicSalary += record.basicSalary;
        result.tax += record.tax;
        result.deductions += record.deductions;
        result.netSalary += record.netSalary;

        return result;
    }, {
        basicSalary: 0,
        tax: 0,
        deductions: 0,
        netSalary: 0
    });

    const paymentSummary = records.reduce((result, record) => {
        if (record.status === 'Paid') {
            result.paidCount++;
            result.paidAmount += record.netSalary;
        } else {
            result.pendingCount++;
            result.pendingAmount += record.netSalary;
        }

        return result;
    }, {
        paidCount: 0,
        pendingCount: 0,
        paidAmount: 0,
        pendingAmount: 0
    });

    const processed = Number.parseInt(req.query.processed, 10);
    const skipped = Number.parseInt(req.query.skipped, 10);

    let message = null;

    if (req.query.processed !== undefined) {
        message =
            `${Number.isFinite(processed) ? processed : 0} payroll record(s) processed. ` +
            `${Number.isFinite(skipped) ? skipped : 0} duplicate record(s) skipped.`;
    }

    res.render('payroll', {
        records,
        month,
        message,
        totals,
        paymentSummary,
        formatCurrency: payroll.formatCurrency
    });
}));

// Process monthly payroll

app.post(
    '/payroll/process',
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        const month = String(req.body.month || '').trim();

        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            return res.status(400).render('error', {
                statusCode: 400,
                message: 'Please select a valid payroll month.'
            });
        }

        const employees = await Employee.find().sort({ name: 1 });

        const existingRecords = await Payroll.find({ month })
            .select('employee');

        const existingEmployeeIds = new Set(
            existingRecords.map(record => record.employee.toString())
        );

        let processed = 0;
        let skipped = 0;

        for (const employee of employees) {
            const employeeId = employee._id.toString();

            if (existingEmployeeIds.has(employeeId)) {
                skipped++;
                continue;
            }

            const { tax, net } = payroll.calculate(employee.basicSalary);
            const deductions = 0;

            const employeeCode = employee.employeeCode ||
                `EMP-${employeeId.slice(-8).toUpperCase()}`;

            try {
                await Payroll.create({
                    employee: employee._id,
                    employeeCode,
                    employeeName: employee.name,
                    department: employee.department,
                    month,
                    basicSalary: employee.basicSalary,
                    taxRate: 10,
                    tax: Number(tax.toFixed(2)),
                    deductions,
                    netSalary: Number((net - deductions).toFixed(2)),
                    status: 'Processed',
                    processedBy:
                        req.session.user.name ||
                        req.session.user.email ||
                        'Admin',
                    processedAt: new Date()
                });

                processed++;
                existingEmployeeIds.add(employeeId);

            } catch (error) {
                if (error.code === 11000) {
                    skipped++;
                    continue;
                }

                throw error;
            }
        }

        res.redirect(
            `/payroll?month=${encodeURIComponent(month)}&processed=${processed}&skipped=${skipped}`
        );
    })
);

// Payroll history, CSV export, PDF slips and payment status

app.use('/', payrollReports);

// Audit logs

app.use('/', auditLogsRoutes);

// 404 handler

app.use((req, res, next) => {
    const error = new Error('Page not found.');
    error.status = 404;
    next(error);
});

// Error handler

app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.status || err.statusCode || 500;

    res.status(statusCode).render('error', {
        statusCode,
        message: statusCode === 404
            ? 'Page not found.'
            : 'Something went wrong. Please try again later.'
    });
});

async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
}

startServer();