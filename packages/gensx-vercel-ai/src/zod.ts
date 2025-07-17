/**
 * This file is a helper to provide basic functionality and properly support both Zod v3 and Zod v4.
 * See https://zod.dev/library-authors for a reference.
 */

import { ZodTypeAny } from "@gensx/core";
import * as z4 from "zod/v4";
import { zodToJsonSchema } from "zod-to-json-schema";

export function toJsonSchema(schema: ZodTypeAny) {
  if ("_zod" in schema) {
    return z4.toJSONSchema(schema as z4.ZodType);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  return zodToJsonSchema(schema as any);
}
