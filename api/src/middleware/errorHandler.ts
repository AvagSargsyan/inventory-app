import multer from "multer";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "../lib/errors.ts";
import {
  FOREIGN_KEY_VIOLATION,
  RESTRICT_VIOLATION,
  UNIQUE_VIOLATION,
  isDatabaseError,
} from "../db/errors.ts";

const MULTER_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: "Image is too large.",
  LIMIT_FILE_COUNT: "Only one image may be uploaded.",
  LIMIT_UNEXPECTED_FILE: 'The uploaded file field must be named "image".',
};

const CONFLICT_MESSAGES: Record<string, string> = {
  categories_name_key: "A category with that name already exists.",
  categories_name_lower_idx: "A category with that name already exists.",
  products_name_unique_in_category: "A product with that name already exists in this category.",
};

const CONSTRAINT_CODES: readonly string[] = [
  UNIQUE_VIOLATION,
  FOREIGN_KEY_VIOLATION,
  RESTRICT_VIOLATION,
];

// express.json() rejects a malformed body with this on the error object.
const isMalformedJson = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "type" in error &&
  error.type === "entity.parse.failed";

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: error.message,
      ...(error.fields && { fields: error.fields }),
      ...error.details,
    });
  }

  if (error instanceof multer.MulterError) {
    const message = MULTER_MESSAGES[error.code];
    if (message) {
      return res.status(422).json({ error: "Validation failed", fields: { image: message } });
    }
  }

  if (isMalformedJson(error)) {
    return res.status(400).json({ error: "Malformed JSON body" });
  }

  // A constraint the services did not anticipate: still a conflict, never a 500.
  if (isDatabaseError(error) && error.code && CONSTRAINT_CODES.includes(error.code)) {
    return res.status(409).json({
      error:
        (error.constraint && CONFLICT_MESSAGES[error.constraint]) ??
        "Request conflicts with existing data.",
    });
  }

  console.error(error);
  res.status(500).json({ error: "Internal server error" });
};
