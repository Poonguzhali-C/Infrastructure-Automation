/**
 * A small custom error class that lets controllers throw errors
 * with a specific HTTP status code attached.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Handles requests to routes that don't exist.
 */
function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

/**
 * Central error handler. Any error passed to next(err) ends up here.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong on the server';

  if (statusCode === 500) {
    // Log unexpected errors so they're visible in the server console.
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = { ApiError, notFoundHandler, errorHandler };
