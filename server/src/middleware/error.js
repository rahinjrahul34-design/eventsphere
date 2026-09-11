const ApiError = require('../utils/ApiError');
const config = require('../config');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }
  // Mongoose validation
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    error = new ApiError(400, 'Validation failed', errors);
  }
  // Duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = new ApiError(409, `${field} already exists`);
  }
  // Zod validation (attached by validate middleware as statusCode 400)
  if (err.name === 'ZodError') {
    const errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'Internal server error';

  if (statusCode >= 500) {
    console.error('❌', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
    ...(config.env === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
