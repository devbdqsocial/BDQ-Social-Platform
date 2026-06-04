import { z } from "zod";

/**
 * parseOrThrow — parse raw FormData/object against a Zod schema; throw a user-facing Error on failure.
 * Use in server actions instead of repeating safeParse + if (!parsed.success) throw inline.
 */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid input");
  return result.data;
}

/**
 * withValidation — wrap a handler so it only runs after schema validation.
 * Part of the mutation chain: withAuth -> withValidation -> withAudit (see CLAUDE.md).
 */
export function withValidation<TSchema extends z.ZodTypeAny, TOut>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<TOut>,
) {
  return async (raw: unknown): Promise<TOut> => {
    const parsed = parseOrThrow(schema, raw);
    return handler(parsed);
  };
}
