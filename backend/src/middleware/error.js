const logger = require('../utils/logger');

// 404
function notFoundHandler(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

// Centralized error handler
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) logger.error({ err }, 'Unhandled error');
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL',
      message: err.message || 'Internal Server Error',
      details: err.details,
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
