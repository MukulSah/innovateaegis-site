/** Coerce empty/whitespace strings to null for Postgres UUID columns. */
export function nullableUuid(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return trimmed;
}

/** Find the first UUID field in a payload that is an empty string. */
export function findEmptyUuidFields(
  payload: Record<string, unknown>,
  uuidFields: string[],
): { field: string; value: string } | null {
  for (const field of uuidFields) {
    const value = payload[field];
    if (typeof value === "string" && value.trim() === "") {
      return { field, value };
    }
  }
  return null;
}
