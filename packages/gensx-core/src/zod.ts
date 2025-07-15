/**
 * This file is a helper to provide basic functionality and properly support both Zod v3 and Zod v4.
 * See https://zod.dev/library-authors for a reference.
 */

import * as z3 from "zod/v3";
import * as z4 from "zod/v4/core";
import { zodToJsonSchema } from "zod-to-json-schema";

export type AnyZodSchema<S = unknown> = z3.ZodType<S> | z4.$ZodType<S>;
export type InferZodType<
  T extends z3.ZodType<S> | z4.$ZodType<S>,
  S = unknown,
> = T extends z3.ZodType<S> ? z3.infer<T> : z4.infer<T>;

export function zodValidate<T extends AnyZodSchema>(
  schema: T,
  value: unknown,
): T extends z3.ZodType ? z3.infer<T> : z4.output<T> {
  if ("_zod" in schema) {
    return z4.parse(schema, value) as T extends z3.ZodType
      ? z3.infer<T>
      : z4.output<T>;
  }

  return schema.parse(value) as T extends z3.ZodType
    ? z3.infer<T>
    : z4.output<T>;
}

export function toJsonSchema(schema: AnyZodSchema) {
  if ("_zod" in schema) {
    return z4.toJSONSchema(schema);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  return zodToJsonSchema(schema as any);
}

export function isZodSchemaObject(schema: unknown): schema is AnyZodSchema {
  const isZ4 =
    schema !== undefined &&
    schema !== null &&
    (typeof schema === "object" || typeof schema === "function") &&
    "_zod" in schema;
  const isZ3 = schema instanceof z3.Schema;
  return isZ4 || isZ3;
}
