const AuditLog = require('../models/AuditLog');

async function log({ actor, action, targetType = '', targetId = null, meta = {}, ip = '' }) {
  try {
    await AuditLog.create({
      actor: actor?._id || actor || null,
      actorName: actor?.name || '',
      action,
      targetType,
      targetId,
      meta,
      ip,
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}

module.exports = { log };
