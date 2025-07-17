/**
 * This file is a helper to provide basic functionality and properly support both Zod v3 and Zod v4.
 * See https://zod.dev/library-authors for a reference.
 */

import * as z3 from "zod/v3";
import * as z4 from "zod/v4";
import { zodToJsonSchema } from "zod-to-json-schema";

export type ZodTypeAny = z3.ZodTypeAny | z4.ZodType;
export function zodValidate<T extends ZodTypeAny>(
  schema: T,
  value: unknown,
): InferZodType<T> {
  if ("_zod" in schema) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return schema.parse(value) as InferZodType<T>;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return schema.parse(value) as InferZodType<T>;
}

export type InferZodType<T extends ZodTypeAny> = T extends z3.ZodTypeAny
  ? z3.infer<T>
  : z4.infer<T>;

export function toJsonSchema(schema: ZodTypeAny) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  return zodToJsonSchema(schema as any);
}

export function isZodSchemaObject(schema: unknown): schema is ZodTypeAny {
  const isZ4 = schema instanceof z4.ZodType;
  const isZ3 = schema instanceof z3.Schema;
  return isZ3 || isZ4;
}
