export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

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

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }

  if (error.code === UNIQUE_VIOLATION || error.code === FOREIGN_KEY_VIOLATION) {
    return res.status(409).json({
      error: CONFLICT_MESSAGES[error.constraint] ?? 'Request conflicts with existing data.',
    });
  }

  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
}
