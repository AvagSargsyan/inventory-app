export const UNIQUE_VIOLATION = '23505';
export const FOREIGN_KEY_VIOLATION = '23503';
// ON DELETE RESTRICT raises 23001, not 23503 (which NO ACTION would raise).
export const RESTRICT_VIOLATION = '23001';

export const isUniqueViolation = (error) => error?.code === UNIQUE_VIOLATION;
export const isForeignKeyViolation = (error) => error?.code === FOREIGN_KEY_VIOLATION;
export const isRestrictViolation = (error) => error?.code === RESTRICT_VIOLATION;
