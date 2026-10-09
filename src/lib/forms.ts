/**
 * Helpers for number inputs in react-hook-form.
 *
 * `register("x", { valueAsNumber: true })` turns an **empty** number input into
 * `NaN`, and zod rejects NaN ("Expected number, received nan"). On a required
 * field that is merely an ugly message; on an optional one it makes the field
 * behave as if it were mandatory. These two map an empty input to the value the
 * schema actually accepts, so use them in place of `valueAsNumber`.
 */

/** For a field the schema allows to be null (`.nullish()`). */
export function emptyToNull(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * For a field the schema allows to be absent but not null (`.optional()`), so
 * leaving it empty means "do not change this" rather than "set it to null".
 */
export function emptyToUndefined(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
