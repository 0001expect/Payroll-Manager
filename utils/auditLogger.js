
const AuditLog = require('../models/AuditLog');

async function createAuditLog({
    req,
    action,
    module,
    description,
    targetId = null
}) {
    try {
        const user = req.session?.user;

        await AuditLog.create({
            userId: user?.id || null,
            userName: user?.name || 'System',
            userRole: user?.role || 'system',
            action,
            module,
            description,
            targetId,
            ipAddress: req.ip || ''
        });
    } catch (error) {
        // Logging failure should not interrupt the main application action.
        console.error('Audit log creation failed:', error.message);
    }
}

module.exports = createAuditLog;
