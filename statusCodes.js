const {
  getStatusText,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  CONFLICT,
  UNAUTHORIZED,
  BAD_REQUEST,
  FORBIDDEN,
  OK,
} = require('http-status-codes');

exports.success = {};
exports.errors = {};

const createMsg = (statusCode) => ({
  statusCode,
  body: { msg: getStatusText(statusCode) },
});

exports.success.ok = createMsg(OK);

exports.errors.server = createMsg(INTERNAL_SERVER_ERROR);
exports.errors.unauthorized = createMsg(UNAUTHORIZED);
exports.errors.badRequest = createMsg(BAD_REQUEST);
exports.errors.notFound = createMsg(NOT_FOUND);
exports.errors.conflict = createMsg(CONFLICT);
exports.errors.forbidden = createMsg(FORBIDDEN);

const createErrorMsg = (statusCode, msg) => ({
  statusCode,
  body: JSON.stringify({ msg }),
});

exports.errors.notFoundMsg = (msg) => createErrorMsg(NOT_FOUND, msg);
exports.errors.badRequestMsg = (msg) => createErrorMsg(BAD_REQUEST, msg);
