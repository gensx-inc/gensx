/**
 * This file is a helper to provide basic functionality and properly support both Zod v3 and Zod v4.
 * See https://zod.dev/library-authors for a reference.
 */

import * as z3 from "zod/v3";
import * as z4 from "zod/v4/core";
import { zodToJsonSchema } from "zod-to-json-schema";

export type AnyZodSchema<S = unknown> = z3.ZodType<S> | z4.$ZodType<S>;
export function toJsonSchema(schema: AnyZodSchema) {
  if ("_zod" in schema) {
    return z4.toJSONSchema(schema);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  return zodToJsonSchema(schema as any);
}
