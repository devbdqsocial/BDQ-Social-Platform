import { z } from "zod";

/**
 * withValidation — parse/validate an input against a Zod schema before running a handler.
 * Part of the mutation chain: withAuth -> withValidation -> withAudit (see CLAUDE.md).
 */
export function withValidation<TSchema extends z.ZodTypeAny, TOut>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<TOut>,
) {
  return async (raw: unknown): Promise<TOut> => {
    const parsed = schema.parse(raw);
    return handler(parsed);
  };
}
