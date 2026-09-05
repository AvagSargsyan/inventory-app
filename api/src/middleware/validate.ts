import { validationResult } from "express-validator";
import type { RequestHandler } from "express";
import { badRequest, validationFailed } from "../lib/errors.ts";
import type { FieldErrors } from "../lib/errors.ts";

export const validate: RequestHandler = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const fields: FieldErrors = {};
  for (const error of result.array()) {
    // Every chain in this app is a body() chain, so each error names a field.
    if (error.type !== "field") continue;
    fields[error.path] ??= String(error.msg);
  }
  next(validationFailed(fields));
};

export const requireIdParam: RequestHandler = (req, _res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return next(badRequest("Invalid id"));
  }
  next();
};
