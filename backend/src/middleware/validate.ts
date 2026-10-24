import type { ZodType } from 'zod';
import { ValidationError } from '../errors';

/** Parses `data` with `schema`, throwing a ValidationError with the first issue's message. */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.');
    throw new ValidationError(field ? `${field}: ${issue.message}` : issue.message);
  }
  return result.data;
}
