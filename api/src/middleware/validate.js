import { validationResult } from 'express-validator';
import { badRequest, validationFailed } from '../lib/errors.js';

export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const fields = {};
  for (const error of result.array()) {
    fields[error.path] ??= error.msg;
  }
  next(validationFailed(fields));
}

export function requireIdParam(req, _res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return next(badRequest('Invalid id'));
  }
  next();
}
