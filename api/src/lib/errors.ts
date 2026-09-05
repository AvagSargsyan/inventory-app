export type FieldErrors = Record<string, string>;

export type ErrorDetails = Record<string, unknown>;

type HttpErrorOptions = {
  fields?: FieldErrors;
  details?: ErrorDetails;
};

// One error type for anything the client should see. Services throw these;
// errorHandler is the only place that turns them into a response.
export class HttpError extends Error {
  readonly status: number;
  readonly fields: FieldErrors | undefined;
  readonly details: ErrorDetails | undefined;

  constructor(status: number, message: string, { fields, details }: HttpErrorOptions = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.fields = fields;
    this.details = details;
  }
}

export const badRequest = (message: string): HttpError => new HttpError(400, message);

export const notFound = (message: string): HttpError => new HttpError(404, message);

export const conflict = (message: string, details?: ErrorDetails): HttpError =>
  new HttpError(409, message, { details });

export const validationFailed = (fields: FieldErrors): HttpError =>
  new HttpError(422, "Validation failed", { fields });
