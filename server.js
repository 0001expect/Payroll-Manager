
const express = require('express');
const path = require('path');
const fileHandler = require('./modules/fileHandler');
const payroll = require('./modules/payroll');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Forward errors from async routes to the error handler.
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Validate employee details before saving.
function validate(name, department, basicSalary) {
    const errors = [];

    if (!name) {
        errors.push('Employee name is required.');
    }

    if (!department) {
        errors.push('Department is required.');
    }

    const salary = Number(basicSalary);

    if (
        basicSalary === '' ||
        !Number.isFinite(salary) ||
        salary <= 0
    ) {
        errors.push('Basic salary must be a valid number greater than 0.');
    }

    return errors;
}

// Display all employees and payroll summary.
app.get('/', asyncHandler(async (req, res) => {
    const employees = await fileHandler.read();

    const payrollEmployees = employees.map(emp => {
        const { tax, net } = payroll.calculate(emp.basicSalary);

        return {
            ...emp,
            tax,
            net,
            basicSalaryFormatted: payroll.formatCurrency(emp.basicSalary),
            taxFormatted: payroll.formatCurrency(tax),
            netFormatted: payroll.formatCurrency(net)
        };
    });

    const summary = employees.reduce((totals, emp) => {
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

    summary.basicSalaryFormatted = payroll.formatCurrency(summary.basicSalary);
    summary.taxFormatted = payroll.formatCurrency(summary.tax);
    summary.netFormatted = payroll.formatCurrency(summary.net);

    res.render('index', {
        employees: payrollEmployees,
        summary
    });
}));

// Display the Add Employee form.
app.get('/add', (req, res) => {
    res.render('add', {
        errors: [],
        formData: {}
    });
});

// Add a new employee.
app.post('/add', asyncHandler(async (req, res) => {
    const name = (req.body.name || '').trim();
    const department = (req.body.department || '').trim();
    const basicSalary = req.body.basicSalary || '';

    const errors = validate(name, department, basicSalary);

    if (errors.length > 0) {
        return res.status(400).render('add', {
            errors,
            formData: { name, department, basicSalary }
        });
    }

    const employees = await fileHandler.read();

    const newEmployee = {
        id: Date.now(),
        name,
        department,
        basicSalary: Number(basicSalary)
    };

    employees.push(newEmployee);

    await fileHandler.write(employees);

    res.redirect('/');
}));

// Delete an employee.
app.post('/delete/:id', asyncHandler(async (req, res) => {
    const employees = await fileHandler.read();

    const employeeExists = employees.some(
        emp => String(emp.id) === req.params.id
    );

    if (!employeeExists) {
        return res.status(404).render('error', {
            statusCode: 404,
            message: 'Employee not found.'
        });
    }

    const filtered = employees.filter(
        emp => String(emp.id) !== req.params.id
    );

    await fileHandler.write(filtered);

    res.redirect('/');
}));

// Display the Edit Employee form.
app.get('/edit/:id', asyncHandler(async (req, res) => {
    const employees = await fileHandler.read();

    const employee = employees.find(
        emp => String(emp.id) === req.params.id
    );

    if (!employee) {
        return res.status(404).render('error', {
            statusCode: 404,
            message: 'Employee not found.'
        });
    }

    res.render('edit', {
        employee,
        errors: [],
        formData: employee
    });
}));

// Update employee details.
app.post('/edit/:id', asyncHandler(async (req, res) => {
    const employees = await fileHandler.read();

    const employee = employees.find(
        emp => String(emp.id) === req.params.id
    );

    if (!employee) {
        return res.status(404).render('error', {
            statusCode: 404,
            message: 'Employee not found.'
        });
    }

    const name = (req.body.name || '').trim();
    const department = (req.body.department || '').trim();
    const basicSalary = req.body.basicSalary || '';

    const errors = validate(name, department, basicSalary);

    if (errors.length > 0) {
        return res.status(400).render('edit', {
            employee,
            errors,
            formData: {
                ...employee,
                name,
                department,
                basicSalary
            }
        });
    }

    const index = employees.findIndex(
        emp => String(emp.id) === req.params.id
    );

    employees[index] = {
        ...employee,
        name,
        department,
        basicSalary: Number(basicSalary)
    };

    await fileHandler.write(employees);

    res.redirect('/');
}));

// Handle requests for pages that do not exist.
app.use((req, res, next) => {
    const error = new Error('Page not found.');
    error.status = 404;
    next(error);
});

// Central error-handling middleware.
app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.status || err.statusCode || 500;

    const message = statusCode === 404
        ? 'Page not found.'
        : 'Something went wrong. Please try again later.';

    res.status(statusCode).render('error', {
        statusCode,
        message
    });
});

// Start the server.
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
