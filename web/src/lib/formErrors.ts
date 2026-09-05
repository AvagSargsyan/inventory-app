import { isApiError } from "@/api";
import type { FieldErrors } from "@/api";

export type SubmitFailure = {
  fields: FieldErrors;
  message: string | null;
};

// A 422 names the offending fields. A 409 is a duplicate name — a field-level
// problem wearing a different status code — so it renders in the same place.
// Anything else has no field to attach to and becomes a banner.
export function toSubmitFailure(error: unknown, conflictField: string): SubmitFailure {
  if (!isApiError(error)) {
    return { fields: {}, message: error instanceof Error ? error.message : String(error) };
  }
  if (error.fields) return { fields: error.fields, message: null };
  if (error.status === 409) return { fields: { [conflictField]: error.message }, message: null };
  return { fields: {}, message: error.message };
}
