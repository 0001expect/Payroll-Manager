
const createAuditLog = require('./auditLogger');

async function auditMiddleware(req, res, next) {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    if (!isMutation) {
        return next();
    }

    res.on('finish', async () => {
        // Log only successful operations.
        if (res.statusCode < 200 || res.statusCode >= 400) {
            return;
        }

        const path = req.originalUrl.split('?')[0];

        let action;
        let module;
        let description;
        let targetId = null;

        // Employee creation
        if (path === '/add' && req.method === 'POST') {
            action = 'CREATE';
            module = 'Employee';
            description = 'Created a new employee record';
        }

        // Employee update
        else if (/^\/edit\/[^/]+$/.test(path)) {
            action = 'UPDATE';
            module = 'Employee';
            targetId = path.split('/')[2];
            description = 'Updated an employee record';
        }

        // Employee deletion
        else if (/^\/delete\/[^/]+$/.test(path)) {
            action = 'DELETE';
            module = 'Employee';
            targetId = path.split('/')[2];
            description = 'Deleted an employee record';
        }

        // Monthly payroll processing
        else if (path === '/payroll/process') {
            action = 'PROCESS';
            module = 'Payroll';

            const month = String(req.body?.month || '').trim();

            description = month
                ? `Processed monthly payroll for ${month}`
                : 'Processed monthly payroll';
        }

        // Mark payroll as paid
        else if (/^\/payroll\/[^/]+\/mark-paid$/.test(path)) {
            action = 'MARK_PAID';
            module = 'Payroll';

            targetId = path.split('/')[2];
            description = 'Marked a payroll record as paid';
        }

        // Ignore unrelated operations.
        else {
            return;
        }

        // Only accept valid MongoDB ObjectId strings.
        if (
            typeof targetId !== 'string' ||
            !/^[a-f\d]{24}$/i.test(targetId)
        ) {
            targetId = null;
        }

        await createAuditLog({
            req,
            action,
            module,
            description,
            targetId
        });
    });

    next();
}

module.exports = auditMiddleware;
