/**
 * This file is a helper to provide basic functionality and properly support both Zod v3 and Zod v4.
 * See https://zod.dev/library-authors for a reference.
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export function toJsonSchema(schema: z.ZodTypeAny) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  return zodToJsonSchema(schema as any);
}
