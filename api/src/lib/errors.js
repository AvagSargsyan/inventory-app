// One error type for anything the client should see. Services throw these;
// errorHandler is the only place that turns them into a response.
export class HttpError extends Error {
  constructor(status, message, { fields, details } = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.details = details;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message) => new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, { details });
export const validationFailed = (fields) => new HttpError(422, "Validation failed", { fields });
