export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';
// ON DELETE RESTRICT raises 23001, not 23503 (which NO ACTION would raise).
export const RESTRICT_VIOLATION = '23001';

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'Image is too large.',
  LIMIT_FILE_COUNT: 'Only one image may be uploaded.',
  LIMIT_UNEXPECTED_FILE: 'The uploaded file field must be named "image".',
};

const CONFLICT_MESSAGES = {
  categories_name_key: 'A category with that name already exists.',
  categories_name_lower_idx: 'A category with that name already exists.',
  products_name_unique_in_category: 'A product with that name already exists in this category.',
};

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: error.message,
      ...(error.fields && { fields: error.fields }),
    });
  }

  const multerMessage = MULTER_MESSAGES[error.name === 'MulterError' ? error.code : null];
  if (multerMessage) {
    return res.status(422).json({ error: 'Validation failed', fields: { image: multerMessage } });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }

  if ([UNIQUE_VIOLATION, FOREIGN_KEY_VIOLATION, RESTRICT_VIOLATION].includes(error.code)) {
    return res.status(409).json({
      error: CONFLICT_MESSAGES[error.constraint] ?? 'Request conflicts with existing data.',
    });
  }

  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}
