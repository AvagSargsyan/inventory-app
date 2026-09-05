import { DatabaseError } from "pg";

export const UNIQUE_VIOLATION = "23505";
export const FOREIGN_KEY_VIOLATION = "23503";
// ON DELETE RESTRICT raises 23001, not 23503 (which NO ACTION would raise).
export const RESTRICT_VIOLATION = "23001";

// pg throws DatabaseError for anything the server rejected, so instanceof
// narrows to the typed code and constraint without hand-written guards.
export const isDatabaseError = (error: unknown): error is DatabaseError =>
  error instanceof DatabaseError;

const hasCode = (error: unknown, code: string): boolean =>
  isDatabaseError(error) && error.code === code;

export const isUniqueViolation = (error: unknown): boolean => hasCode(error, UNIQUE_VIOLATION);
export const isForeignKeyViolation = (error: unknown): boolean =>
  hasCode(error, FOREIGN_KEY_VIOLATION);
export const isRestrictViolation = (error: unknown): boolean => hasCode(error, RESTRICT_VIOLATION);
