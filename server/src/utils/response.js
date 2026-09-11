// Consistent API response envelope: { success, data } / { success, message, errors }
const ok = (res, data = null, statusCode = 200, extra = {}) =>
  res.status(statusCode).json({ success: true, data, ...extra });

const created = (res, data = null, extra = {}) => ok(res, data, 201, extra);

const fail = (res, message = 'Something went wrong', statusCode = 400, errors = []) =>
  res.status(statusCode).json({ success: false, message, errors });

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ok, created, fail, asyncHandler };
