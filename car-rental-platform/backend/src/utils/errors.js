class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (msg, details) => new HttpError(400, 'BAD_REQUEST', msg, details);
const unauthorized = (msg = 'Unauthorized') => new HttpError(401, 'UNAUTHORIZED', msg);
const forbidden = (msg = 'Forbidden') => new HttpError(403, 'FORBIDDEN', msg);
const notFound = (msg = 'Not found') => new HttpError(404, 'NOT_FOUND', msg);
const conflict = (msg, details) => new HttpError(409, 'CONFLICT', msg, details);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict };
