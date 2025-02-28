/**
 * Zod Schema Extensions
 *
 * This module provides extensions to Zod schemas that improve their
 * serialization capabilities when used with GenSX's checkpoint system.
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export function extendZodWithToJSON(): void {
  // Use type assertion to check for toJSON method
  const prototype = z.ZodSchema.prototype as unknown as {
    toJSON?: () => Record<string, unknown>;
  };

  // Only add the method once to avoid overriding
  if (!prototype.toJSON) {
    Object.defineProperty(z.ZodSchema.prototype, "toJSON", {
      value: function (this: z.ZodType) {
        return zodToJsonSchema(this);
      },
      configurable: true,
      writable: true,
    });
  }
}

// Execute the extension immediately when this module is imported
extendZodWithToJSON();
