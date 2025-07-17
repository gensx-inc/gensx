/**
 * This file is a helper to provide basic functionality and properly support both Zod v3 and Zod v4.
 * See https://zod.dev/library-authors for a reference.
 */

import * as z3 from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export function zodValidate<T extends z3.ZodTypeAny>(
  schema: T,
  value: unknown,
): z3.infer<T> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return schema.parse(value) as z3.infer<T>;
}

export function toJsonSchema(schema: z3.ZodTypeAny) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  return zodToJsonSchema(schema as any);
}

export function isZodSchemaObject(schema: unknown): schema is z3.ZodTypeAny {
  const isZ3 = schema instanceof z3.Schema;
  return isZ3;
}
