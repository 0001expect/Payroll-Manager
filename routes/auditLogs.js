
const express = require('express');
const AuditLog = require('../models/AuditLog');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

const PAGE_SIZE = 20;

// Display audit logs. Only administrators can access this page.
router.get('/audit-logs', requireRole('admin'), async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);

        const allowedActions = [
            'CREATE',
            'UPDATE',
            'DELETE',
            'PROCESS',
            'MARK_PAID'
        ];

        const allowedModules = ['Employee', 'Payroll'];

        const action = allowedActions.includes(req.query.action)
            ? req.query.action
            : '';

        const module = allowedModules.includes(req.query.module)
            ? req.query.module
            : '';

        const filter = {};

        if (action) filter.action = action;
        if (module) filter.module = module;

        const totalLogs = await AuditLog.countDocuments(filter);

        const logs = await AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * PAGE_SIZE)
            .limit(PAGE_SIZE)
            .lean();

        const totalPages = Math.ceil(totalLogs / PAGE_SIZE);

        res.render('audit-logs', {
            logs,
            currentPage: page,
            totalPages,
            totalLogs,
            filters: { action, module }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
